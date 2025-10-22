import { IsString, IsEnum, IsOptional, IsDateString } from 'class-validator';

export enum CheatingViolationType {
  PAGE_REFRESH = 'page_refresh',
  TAB_SWITCH = 'tab_switch',
  TAB_CLOSE = 'tab_close',
  DEVTOOLS_ACCESS = 'devtools_access',
  RIGHT_CLICK = 'right_click',
  VIEW_SOURCE = 'view_source',
  KEYBOARD_SHORTCUT = 'keyboard_shortcut'
}

export class CheatingViolationDto {
  @IsEnum(CheatingViolationType)
  type: CheatingViolationType;

  @IsString()
  description: string;

  @IsDateString()
  timestamp: string;

  @IsOptional()
  @IsString()
  userAgent?: string;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  metadata?: any;
}

export class AddCheatingViolationDto {
  @IsEnum(CheatingViolationType)
  type: CheatingViolationType;

  @IsString()
  description: string;

  @IsOptional()
  metadata?: any;
}

export class CheatingWarningResponseDto {
  warningCount: number;
  maxWarnings: number;
  remainingWarnings: number;
  shouldAutoSubmit: boolean;
  violations: CheatingViolationDto[];
}
