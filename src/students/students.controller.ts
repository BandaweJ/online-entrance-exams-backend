import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from "@nestjs/common";
import { StudentsService } from "./students.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { UserRole } from "../users/user.entity";
import { CreateStudentDto } from "./dto/create-student.dto";
import { UpdateStudentDto } from "./dto/update-student.dto";

@Controller("students")
@UseGuards(JwtAuthGuard, RolesGuard)
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() createStudentDto: CreateStudentDto, @Request() req) {
    return this.studentsService.create(createStudentDto, req.user.id);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  findAll() {
    return this.studentsService.findAll();
  }

  @Get("stats")
  @Roles(UserRole.ADMIN)
  getStats() {
    return this.studentsService.getStats();
  }

  @Get(":id")
  @Roles(UserRole.ADMIN)
  findOne(@Param("id") id: string) {
    return this.studentsService.findOne(id);
  }

  @Patch(":id")
  @Roles(UserRole.ADMIN)
  update(@Param("id") id: string, @Body() updateStudentDto: UpdateStudentDto) {
    return this.studentsService.update(id, updateStudentDto);
  }

  @Post(":id/resend-credentials")
  @Roles(UserRole.ADMIN)
  resendCredentials(@Param("id") id: string) {
    return this.studentsService.resendCredentials(id);
  }

  @Delete(":id")
  @Roles(UserRole.ADMIN)
  remove(@Param("id") id: string) {
    return this.studentsService.remove(id);
  }
}
