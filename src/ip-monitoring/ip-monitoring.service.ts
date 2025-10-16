import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan, LessThan } from 'typeorm';
import { IpActivity } from './ip-activity.entity';
import { IpBlocklist } from './ip-blocklist.entity';
import { CreateIpActivityDto, IpActivityFilterDto, BlockIpDto } from './dto/ip-activity.dto';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class IpMonitoringService {
  private readonly logger = new Logger(IpMonitoringService.name);

  constructor(
    @InjectRepository(IpActivity)
    private ipActivityRepository: Repository<IpActivity>,
    @InjectRepository(IpBlocklist)
    private ipBlocklistRepository: Repository<IpBlocklist>,
  ) {}

  async logActivity(createDto: CreateIpActivityDto): Promise<IpActivity> {
    try {
      // Check if IP is blocked
      const isBlocked = await this.isIpBlocked(createDto.ipAddress);
      
      // Get geolocation data (simplified - in production, use a proper service)
      const geoData = await this.getGeolocationData(createDto.ipAddress);
      
      // Check for suspicious activity
      const isSuspicious = await this.detectSuspiciousActivity(createDto);

      const activity = this.ipActivityRepository.create({
        ...createDto,
        isBlocked,
        isSuspicious,
        country: geoData.country,
        city: geoData.city,
        region: geoData.region,
      });

      const savedActivity = await this.ipActivityRepository.save(activity);

      // If suspicious, take action
      if (isSuspicious) {
        await this.handleSuspiciousActivity(createDto.ipAddress, createDto);
      }

      return savedActivity;
    } catch (error) {
      this.logger.error('Error logging IP activity:', error);
      throw error;
    }
  }

  async isIpBlocked(ipAddress: string): Promise<boolean> {
    const blockEntry = await this.ipBlocklistRepository.findOne({
      where: {
        ipAddress,
        isActive: true,
      },
    });

    if (blockEntry) {
      // Check if block has expired
      if (blockEntry.expiresAt && blockEntry.expiresAt < new Date()) {
        await this.unblockIp(ipAddress);
        return false;
      }
      return true;
    }

    return false;
  }

  async blockIp(blockDto: BlockIpDto): Promise<IpBlocklist> {
    const existingBlock = await this.ipBlocklistRepository.findOne({
      where: { ipAddress: blockDto.ipAddress },
    });

    if (existingBlock) {
      existingBlock.isActive = true;
      existingBlock.reason = blockDto.reason;
      existingBlock.expiresAt = blockDto.expiresAt ? new Date(blockDto.expiresAt) : null;
      existingBlock.blockType = blockDto.blockType;
      existingBlock.metadata = blockDto.metadata;
      existingBlock.violationCount += 1;
      return await this.ipBlocklistRepository.save(existingBlock);
    }

    const blockEntry = this.ipBlocklistRepository.create(blockDto);
    return await this.ipBlocklistRepository.save(blockEntry);
  }

  async unblockIp(ipAddress: string): Promise<void> {
    await this.ipBlocklistRepository.update(
      { ipAddress },
      { isActive: false }
    );
  }

  async getActivities(filter: IpActivityFilterDto) {
    const query = this.ipActivityRepository.createQueryBuilder('activity');

    if (filter.ipAddress) {
      query.andWhere('activity.ipAddress = :ipAddress', { ipAddress: filter.ipAddress });
    }

    if (filter.action) {
      query.andWhere('activity.action = :action', { action: filter.action });
    }

    if (filter.isSuspicious !== undefined) {
      query.andWhere('activity.isSuspicious = :isSuspicious', { isSuspicious: filter.isSuspicious });
    }

    if (filter.isBlocked !== undefined) {
      query.andWhere('activity.isBlocked = :isBlocked', { isBlocked: filter.isBlocked });
    }

    if (filter.startDate && filter.endDate) {
      query.andWhere('activity.createdAt BETWEEN :startDate AND :endDate', {
        startDate: filter.startDate,
        endDate: filter.endDate,
      });
    }

    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const skip = (page - 1) * limit;

    query
      .orderBy('activity.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [activities, total] = await query.getManyAndCount();

    return {
      activities,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getIpStats(ipAddress: string, hours: number = 24) {
    const startDate = new Date();
    startDate.setHours(startDate.getHours() - hours);

    const stats = await this.ipActivityRepository
      .createQueryBuilder('activity')
      .select([
        'COUNT(*) as total_requests',
        'COUNT(CASE WHEN activity.isSuspicious = true THEN 1 END) as suspicious_requests',
        'COUNT(CASE WHEN activity.action = :loginAction THEN 1 END) as login_attempts',
        'COUNT(CASE WHEN activity.action = :examAction THEN 1 END) as exam_attempts',
        'COUNT(DISTINCT activity.userId) as unique_users',
        'COUNT(DISTINCT activity.examId) as unique_exams',
      ])
      .setParameters({
        loginAction: 'login',
        examAction: 'exam_start',
      })
      .where('activity.ipAddress = :ipAddress', { ipAddress })
      .andWhere('activity.createdAt >= :startDate', { startDate })
      .getRawOne();

    return stats;
  }

  async getSuspiciousIps(hours: number = 24) {
    const startDate = new Date();
    startDate.setHours(startDate.getHours() - hours);

    const suspiciousIps = await this.ipActivityRepository
      .createQueryBuilder('activity')
      .select([
        'activity.ipAddress',
        'COUNT(*) as total_requests',
        'COUNT(CASE WHEN activity.isSuspicious = true THEN 1 END) as suspicious_requests',
        'MAX(activity.createdAt) as last_activity',
      ])
      .where('activity.createdAt >= :startDate', { startDate })
      .groupBy('activity.ipAddress')
      .having('COUNT(CASE WHEN activity.isSuspicious = true THEN 1 END) > 0')
      .orderBy('suspicious_requests', 'DESC')
      .getRawMany();

    return suspiciousIps;
  }

  private async detectSuspiciousActivity(activity: CreateIpActivityDto): Promise<boolean> {
    const suspiciousPatterns = [];

    // Check for rapid requests (more than 10 requests per minute)
    const recentRequests = await this.ipActivityRepository.count({
      where: {
        ipAddress: activity.ipAddress,
        createdAt: MoreThan(new Date(Date.now() - 60000)), // Last minute
      },
    });

    if (recentRequests > 10) {
      suspiciousPatterns.push('Rapid requests detected');
    }

    // Check for multiple failed login attempts
    if (activity.action === 'login' && activity.statusCode === 401) {
      const failedLogins = await this.ipActivityRepository.count({
        where: {
          ipAddress: activity.ipAddress,
          action: 'login',
          statusCode: 401,
          createdAt: MoreThan(new Date(Date.now() - 300000)), // Last 5 minutes
        },
      });

      if (failedLogins > 5) {
        suspiciousPatterns.push('Multiple failed login attempts');
      }
    }

    // Check for unusual exam activity patterns
    if (activity.action === 'exam_start') {
      const examStarts = await this.ipActivityRepository.count({
        where: {
          ipAddress: activity.ipAddress,
          action: 'exam_start',
          createdAt: MoreThan(new Date(Date.now() - 3600000)), // Last hour
        },
      });

      if (examStarts > 3) {
        suspiciousPatterns.push('Multiple exam starts from same IP');
      }
    }

    // Check for requests from different user agents (possible bot)
    const uniqueUserAgents = await this.ipActivityRepository
      .createQueryBuilder('activity')
      .select('COUNT(DISTINCT activity.userAgent)', 'count')
      .where('activity.ipAddress = :ipAddress', { ipAddress: activity.ipAddress })
      .andWhere('activity.createdAt >= :startDate', { 
        startDate: new Date(Date.now() - 3600000) 
      })
      .getRawOne();

    if (parseInt(uniqueUserAgents.count) > 5) {
      suspiciousPatterns.push('Multiple user agents from same IP');
    }

    return suspiciousPatterns.length > 0;
  }

  private async handleSuspiciousActivity(ipAddress: string, activity: CreateIpActivityDto): Promise<void> {
    this.logger.warn(`Suspicious activity detected from IP: ${ipAddress}`, activity);

    // Check if IP should be automatically blocked
    const violationCount = await this.ipActivityRepository.count({
      where: {
        ipAddress,
        isSuspicious: true,
        createdAt: MoreThan(new Date(Date.now() - 3600000)), // Last hour
      },
    });

    if (violationCount > 10) {
      await this.blockIp({
        ipAddress,
        reason: 'Automatic block due to suspicious activity',
        blockType: 'suspicious_activity',
        metadata: { violationCount, lastActivity: activity },
      });

      this.logger.warn(`IP ${ipAddress} has been automatically blocked`);
    }
  }

  private async getGeolocationData(ipAddress: string): Promise<{ country: string; city: string; region: string }> {
    // Simplified geolocation - in production, use a proper service like MaxMind GeoIP2
    // For now, return placeholder data
    return {
      country: 'Unknown',
      city: 'Unknown',
      region: 'Unknown',
    };
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupOldActivities(): Promise<void> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await this.ipActivityRepository.delete({
      createdAt: LessThan(thirtyDaysAgo),
    });

    this.logger.log(`Cleaned up ${result.affected} old IP activities`);
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupExpiredBlocks(): Promise<void> {
    const result = await this.ipBlocklistRepository.update(
      {
        isActive: true,
        expiresAt: LessThan(new Date()),
      },
      { isActive: false }
    );

    this.logger.log(`Cleaned up ${result.affected} expired IP blocks`);
  }
}

