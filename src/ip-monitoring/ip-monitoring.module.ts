import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { IpMonitoringService } from "./ip-monitoring.service";
import { IpMonitoringController } from "./ip-monitoring.controller";
import { IpActivity } from "./ip-activity.entity";
import { IpBlocklist } from "./ip-blocklist.entity";
import { RateLimitingService } from "./rate-limiting.service";
import { RateLimitingGuard } from "./rate-limiting.guard";
import { ScheduleModule } from "@nestjs/schedule";

@Module({
  imports: [
    TypeOrmModule.forFeature([IpActivity, IpBlocklist]),
    ScheduleModule.forRoot(),
  ],
  providers: [IpMonitoringService, RateLimitingService, RateLimitingGuard],
  controllers: [IpMonitoringController],
  exports: [IpMonitoringService, RateLimitingService, RateLimitingGuard],
})
export class IpMonitoringModule {}
