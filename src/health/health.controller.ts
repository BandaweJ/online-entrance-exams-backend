import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  check() {
    return this.healthService.getHealth();
  }

  @Get('ready')
  readiness() {
    return this.healthService.getReadiness();
  }

  @Get('live')
  liveness() {
    return this.healthService.getLiveness();
  }
}
