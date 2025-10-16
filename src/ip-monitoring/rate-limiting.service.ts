import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { IpActivity } from "./ip-activity.entity";

interface RateLimitRule {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  action: string; // Action to limit
  blockDuration?: number; // Block duration in milliseconds
}

@Injectable()
export class RateLimitingService {
  private readonly logger = new Logger(RateLimitingService.name);
  private readonly rateLimitRules: RateLimitRule[] = [
    {
      windowMs: 60000, // 1 minute
      maxRequests: 100, // 100 requests per minute
      action: "general",
    },
    {
      windowMs: 300000, // 5 minutes
      maxRequests: 5, // 5 login attempts per 5 minutes
      action: "login",
      blockDuration: 900000, // 15 minutes block
    },
    {
      windowMs: 3600000, // 1 hour
      maxRequests: 3, // 3 exam starts per hour
      action: "exam_start",
      blockDuration: 3600000, // 1 hour block
    },
    {
      windowMs: 60000, // 1 minute
      maxRequests: 20, // 20 answer submissions per minute
      action: "answer_submit",
    },
    {
      windowMs: 300000, // 5 minutes
      maxRequests: 10, // 10 admin actions per 5 minutes
      action: "admin",
    },
  ];

  constructor(
    @InjectRepository(IpActivity)
    private ipActivityRepository: Repository<IpActivity>,
  ) {}

  async checkRateLimit(
    ipAddress: string,
    action: string,
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: Date;
    blockDuration?: number;
  }> {
    const rule = this.getRuleForAction(action);
    if (!rule) {
      return {
        allowed: true,
        remaining: Infinity,
        resetTime: new Date(),
      };
    }

    const windowStart = new Date(Date.now() - rule.windowMs);

    // Count requests in the current window
    const requestCount = await this.ipActivityRepository.count({
      where: {
        ipAddress,
        action: rule.action === "general" ? undefined : rule.action,
        createdAt: windowStart,
      },
    });

    const remaining = Math.max(0, rule.maxRequests - requestCount);
    const allowed = requestCount < rule.maxRequests;
    const resetTime = new Date(Date.now() + rule.windowMs);

    if (!allowed) {
      this.logger.warn(
        `Rate limit exceeded for IP ${ipAddress}, action: ${action}, requests: ${requestCount}/${rule.maxRequests}`,
      );
    }

    return {
      allowed,
      remaining,
      resetTime,
      blockDuration: rule.blockDuration,
    };
  }

  async getRateLimitStatus(ipAddress: string): Promise<{
    [action: string]: {
      current: number;
      limit: number;
      remaining: number;
      resetTime: Date;
    };
  }> {
    const status: any = {};

    for (const rule of this.rateLimitRules) {
      const windowStart = new Date(Date.now() - rule.windowMs);

      const requestCount = await this.ipActivityRepository.count({
        where: {
          ipAddress,
          action: rule.action === "general" ? undefined : rule.action,
          createdAt: windowStart,
        },
      });

      status[rule.action] = {
        current: requestCount,
        limit: rule.maxRequests,
        remaining: Math.max(0, rule.maxRequests - requestCount),
        resetTime: new Date(Date.now() + rule.windowMs),
      };
    }

    return status;
  }

  private getRuleForAction(action: string): RateLimitRule | null {
    // Find specific rule for action
    let rule = this.rateLimitRules.find((r) => r.action === action);

    // If no specific rule, use general rule
    if (!rule) {
      rule = this.rateLimitRules.find((r) => r.action === "general");
    }

    return rule || null;
  }

  async isIpRateLimited(ipAddress: string, action: string): Promise<boolean> {
    const rateLimitStatus = await this.checkRateLimit(ipAddress, action);
    return !rateLimitStatus.allowed;
  }

  async getRateLimitHeaders(
    ipAddress: string,
    action: string,
  ): Promise<{
    "X-RateLimit-Limit": number;
    "X-RateLimit-Remaining": number;
    "X-RateLimit-Reset": string;
  }> {
    const status = await this.checkRateLimit(ipAddress, action);
    const rule = this.getRuleForAction(action);

    return {
      "X-RateLimit-Limit": rule?.maxRequests || 0,
      "X-RateLimit-Remaining": status.remaining,
      "X-RateLimit-Reset": Math.ceil(
        status.resetTime.getTime() / 1000,
      ).toString(),
    };
  }
}
