import { IsString, IsOptional, IsEnum, IsDateString } from "class-validator";

export enum ErrorSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

export class CreateErrorLogDto {
  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  stack?: string;

  @IsString()
  url: string;

  @IsString()
  userAgent: string;

  @IsDateString()
  timestamp: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsEnum(ErrorSeverity)
  severity: ErrorSeverity;
}
