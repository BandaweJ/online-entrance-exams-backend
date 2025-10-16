import { IsString, IsUUID } from "class-validator";

export class CreateAttemptDto {
  @IsString()
  @IsUUID()
  examId: string;
}
