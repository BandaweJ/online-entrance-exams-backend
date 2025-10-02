import { IsString, IsNumber, IsEnum, IsOptional, IsArray, Min } from 'class-validator';
import { QuestionType } from '../question.entity';

export class UpdateQuestionDto {
  @IsOptional()
  @IsString()
  questionText?: string;

  @IsOptional()
  @IsEnum(QuestionType)
  type?: QuestionType;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @IsOptional()
  @IsString()
  correctAnswer?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.5)
  marks?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  order?: number;

  @IsOptional()
  @IsString()
  explanation?: string;

  @IsOptional()
  isActive?: boolean;
}
