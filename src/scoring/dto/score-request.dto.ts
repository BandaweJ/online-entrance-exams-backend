import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class ScoreRequestDto {
  @IsString()
  question: string;

  @IsString()
  correctAnswerText: string;

  @IsString()
  studentAnswerText: string;

  @IsNumber()
  @Min(0.01)
  totalMarks: number;

  @IsOptional()
  @IsString()
  questionType?: string;

  @IsOptional()
  @IsString()
  rubric?: string;
}
