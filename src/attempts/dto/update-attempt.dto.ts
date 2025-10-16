import { IsOptional, IsNumber, IsEnum } from "class-validator";
import { AttemptStatus } from "../exam-attempt.entity";

export class UpdateAttemptDto {
  @IsOptional()
  @IsEnum(AttemptStatus)
  status?: AttemptStatus;

  @IsOptional()
  @IsNumber()
  timeSpent?: number;

  @IsOptional()
  @IsNumber()
  questionsAnswered?: number;
}
