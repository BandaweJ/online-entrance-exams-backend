import { Controller, Get, Post, Body, Query, Param, UseGuards } from '@nestjs/common';
import { IpMonitoringService } from './ip-monitoring.service';
import { CreateIpActivityDto, IpActivityFilterDto, BlockIpDto } from './dto/ip-activity.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';

@Controller('api/ip-monitoring')
@UseGuards(JwtAuthGuard, RolesGuard)
export class IpMonitoringController {
  constructor(private readonly ipMonitoringService: IpMonitoringService) {}

  @Post('log-activity')
  async logActivity(@Body() createDto: CreateIpActivityDto) {
    return await this.ipMonitoringService.logActivity(createDto);
  }

  @Get('activities')
  @Roles(UserRole.ADMIN)
  async getActivities(@Query() filter: IpActivityFilterDto) {
    return await this.ipMonitoringService.getActivities(filter);
  }

  @Get('ip-stats/:ipAddress')
  @Roles(UserRole.ADMIN)
  async getIpStats(
    @Param('ipAddress') ipAddress: string,
    @Query('hours') hours: number = 24,
  ) {
    return await this.ipMonitoringService.getIpStats(ipAddress, hours);
  }

  @Get('suspicious-ips')
  @Roles(UserRole.ADMIN)
  async getSuspiciousIps(@Query('hours') hours: number = 24) {
    return await this.ipMonitoringService.getSuspiciousIps(hours);
  }

  @Post('block-ip')
  @Roles(UserRole.ADMIN)
  async blockIp(@Body() blockDto: BlockIpDto) {
    return await this.ipMonitoringService.blockIp(blockDto);
  }

  @Post('unblock-ip/:ipAddress')
  @Roles(UserRole.ADMIN)
  async unblockIp(@Param('ipAddress') ipAddress: string) {
    await this.ipMonitoringService.unblockIp(ipAddress);
    return { message: 'IP unblocked successfully' };
  }

  @Get('is-blocked/:ipAddress')
  async isIpBlocked(@Param('ipAddress') ipAddress: string) {
    const isBlocked = await this.ipMonitoringService.isIpBlocked(ipAddress);
    return { ipAddress, isBlocked };
  }
}
