import { IsString, IsNumber, IsOptional, Min } from "class-validator";

export class UpdateSectionDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  // @IsOptional()
  // @IsString()
  // instructions?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  order?: number;

  @IsOptional()
  isActive?: boolean;
}
