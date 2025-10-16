import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsArray,
  Min,
} from "class-validator";
import { QuestionType } from "../question.entity";

export class CreateQuestionDto {
  @IsString()
  questionText: string;

  @IsEnum(QuestionType)
  type: QuestionType;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @IsString()
  correctAnswer: string;

  @IsNumber()
  @Min(0.5)
  marks: number;

  @IsNumber()
  @Min(1)
  order: number;

  @IsOptional()
  @IsString()
  explanation?: string;
}
