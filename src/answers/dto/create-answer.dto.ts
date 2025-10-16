import { IsString, IsUUID, IsOptional, IsArray } from "class-validator";

export class CreateAnswerDto {
  @IsString()
  @IsUUID()
  questionId: string;

  @IsString()
  @IsUUID()
  attemptId: string;

  @IsOptional()
  @IsString()
  answerText?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectedOptions?: string[];
}
