import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsObject,
  IsDateString,
} from "class-validator";

export class CreateIpActivityDto {
  @IsString()
  ipAddress: string;

  @IsString()
  userAgent: string;

  @IsString()
  action: string;

  @IsOptional()
  @IsString()
  endpoint?: string;

  @IsOptional()
  @IsString()
  method?: string;

  @IsOptional()
  @IsNumber()
  statusCode?: number;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  examId?: string;

  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class IpActivityFilterDto {
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsBoolean()
  isSuspicious?: boolean;

  @IsOptional()
  @IsBoolean()
  isBlocked?: boolean;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  limit?: number = 20;
}

export class BlockIpDto {
  @IsString()
  ipAddress: string;

  @IsString()
  reason: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsString()
  blockType?: string = "manual";

  @IsOptional()
  @IsObject()
  metadata?: any;
}
