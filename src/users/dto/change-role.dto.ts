import { IsEnum } from "class-validator";
import { UserRole } from "../user.entity";

export class ChangeRoleDto {
  @IsEnum(UserRole)
  role: UserRole;
}
