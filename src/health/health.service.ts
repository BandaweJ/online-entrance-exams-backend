import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0'
    };
  }

  getReadiness() {
    // Add database connection check here
    return {
      status: 'ready',
      timestamp: new Date().toISOString()
    };
  }

  getLiveness() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString()
    };
  }
}
