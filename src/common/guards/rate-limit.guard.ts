import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

interface RateLimitInfo {
  count: number;
  resetTime: number;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly requests = new Map<string, RateLimitInfo>();
  private readonly cleanupInterval = 60000; // 1 minute

  constructor(private reflector: Reflector) {
    // Clean up expired entries every minute
    setInterval(() => this.cleanup(), this.cleanupInterval);
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const clientId = this.getClientId(request);
    
    // Get rate limit configuration from decorator or use defaults
    const rateLimitConfig = this.reflector.get<{ limit: number; windowMs: number }>('rateLimit', context.getHandler()) || {
      limit: 100,
      windowMs: 60000 // 1 minute
    };

    const now = Date.now();
    const windowStart = now - rateLimitConfig.windowMs;
    
    let clientInfo = this.requests.get(clientId);
    
    if (!clientInfo || clientInfo.resetTime < now) {
      // Reset or create new entry
      clientInfo = {
        count: 0,
        resetTime: now + rateLimitConfig.windowMs
      };
    }

    if (clientInfo.count >= rateLimitConfig.limit) {
      throw new HttpException(
        {
          message: 'Rate limit exceeded',
          retryAfter: Math.ceil((clientInfo.resetTime - now) / 1000)
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    clientInfo.count++;
    this.requests.set(clientId, clientInfo);

    return true;
  }

  private getClientId(request: any): string {
    // Use IP address as client identifier
    return request.ip || request.connection.remoteAddress || 'unknown';
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, info] of this.requests.entries()) {
      if (info.resetTime < now) {
        this.requests.delete(key);
      }
    }
  }
}
