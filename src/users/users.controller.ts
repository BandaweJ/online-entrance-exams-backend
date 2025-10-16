import {
  Controller,
  Get,
  Patch,
  Param,
  Delete,
  UseGuards,
  Body,
} from "@nestjs/common";
import { UsersService } from "./users.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { UserRole } from "./user.entity";
import { UpdateUserDto } from "./dto/update-user.dto";
import { ChangeRoleDto } from "./dto/change-role.dto";

@Controller("users")
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  findAll() {
    return this.usersService.findAll();
  }

  @Get("stats")
  @Roles(UserRole.ADMIN)
  getStats() {
    return this.usersService.getStats();
  }

  @Get(":id")
  @Roles(UserRole.ADMIN)
  findOne(@Param("id") id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(":id")
  @Roles(UserRole.ADMIN)
  update(@Param("id") id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Patch(":id/role")
  @Roles(UserRole.ADMIN)
  changeRole(@Param("id") id: string, @Body() changeRoleDto: ChangeRoleDto) {
    return this.usersService.changeRole(id, changeRoleDto.role);
  }

  @Patch(":id/deactivate")
  @Roles(UserRole.ADMIN)
  deactivate(@Param("id") id: string) {
    return this.usersService.deactivate(id);
  }

  @Patch(":id/activate")
  @Roles(UserRole.ADMIN)
  activate(@Param("id") id: string) {
    return this.usersService.activate(id);
  }

  @Delete(":id")
  @Roles(UserRole.ADMIN)
  remove(@Param("id") id: string) {
    // In a real application, you might want to soft delete
    return this.usersService.deactivate(id);
  }
}
