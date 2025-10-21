import { IsString, IsNumber, IsOptional, Min } from "class-validator";

export class CreateSectionDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsNumber()
  @Min(1)
  order: number;
}
