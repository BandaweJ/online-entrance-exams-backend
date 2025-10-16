import { IsString, IsNumber, IsOptional, Min } from "class-validator";

export class CreateSectionDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(1)
  order: number;
}
