import {
  IsString,
  IsNumber,
  IsDateString,
  IsOptional,
  Min,
  Max,
} from "class-validator";

export class UpdateExamDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsNumber()
  @Min(2020)
  @Max(2030)
  year?: number;

  @IsOptional()
  @IsDateString()
  examDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(300)
  durationMinutes?: number;

  @IsOptional()
  isActive?: boolean;
}
