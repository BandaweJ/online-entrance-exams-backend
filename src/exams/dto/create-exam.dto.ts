import {
  IsString,
  IsNumber,
  IsDateString,
  IsOptional,
  Min,
  Max,
} from "class-validator";

export class CreateExamDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  // @IsOptional()
  // @IsString()
  // instructions?: string;

  @IsNumber()
  @Min(2020)
  @Max(2030)
  year: number;

  @IsDateString()
  examDate: string;

  @IsNumber()
  @Min(30)
  @Max(300)
  durationMinutes: number;
}
