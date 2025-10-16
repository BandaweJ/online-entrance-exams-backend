import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Request } from 'express';
import { RateLimitingService } from './rate-limiting.service';

@Injectable()
export class RateLimitingGuard implements CanActivate {
  constructor(private readonly rateLimitingService: RateLimitingService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const ipAddress = this.getClientIp(request);
    const action = this.determineAction(request);

    const rateLimitStatus = await this.rateLimitingService.checkRateLimit(ipAddress, action);

    if (!rateLimitStatus.allowed) {
      const rateLimitHeaders = await this.rateLimitingService.getRateLimitHeaders(ipAddress, action);
      
      const response = context.switchToHttp().getResponse();
      Object.entries(rateLimitHeaders).forEach(([key, value]) => {
        response.setHeader(key, value);
      });
      
      throw new HttpException(
        {
          message: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil((rateLimitStatus.resetTime.getTime() - Date.now()) / 1000),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Add rate limit headers to response
    const response = context.switchToHttp().getResponse();
    const rateLimitHeaders = await this.rateLimitingService.getRateLimitHeaders(ipAddress, action);
    Object.entries(rateLimitHeaders).forEach(([key, value]) => {
      response.setHeader(key, value);
    });

    return true;
  }

  private getClientIp(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'];
    const realIp = request.headers['x-real-ip'];
    
    if (forwarded) {
      return Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0].trim();
    }
    
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }
    
    return request.connection.remoteAddress || request.socket.remoteAddress || 'unknown';
  }

  private determineAction(request: Request): string {
    const path = request.path;
    const method = request.method;

    // Authentication actions
    if (path.includes('/auth/login')) return 'login';
    if (path.includes('/auth/logout')) return 'logout';
    if (path.includes('/auth/refresh')) return 'token_refresh';

    // Exam actions
    if (path.includes('/attempts') && method === 'POST') return 'exam_start';
    if (path.includes('/attempts') && method === 'PATCH') {
      if (path.includes('/submit')) return 'exam_submit';
      if (path.includes('/pause')) return 'exam_pause';
      if (path.includes('/resume')) return 'exam_resume';
      return 'exam_update';
    }

    // Answer actions
    if (path.includes('/answers') && method === 'POST') return 'answer_submit';
    if (path.includes('/answers') && method === 'PATCH') return 'answer_update';

    // Admin actions
    if (path.includes('/admin/')) return 'admin';

    // Student actions
    if (path.includes('/students')) return 'student';

    // Results actions
    if (path.includes('/results')) return 'results';

    // Default to general rate limiting
    return 'general';
  }
}
