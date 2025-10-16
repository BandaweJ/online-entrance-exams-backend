import { IsOptional, IsString, IsArray } from "class-validator";

export class UpdateAnswerDto {
  @IsOptional()
  @IsString()
  answerText?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectedOptions?: string[];
}
