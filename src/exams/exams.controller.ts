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
import { ExamsService } from "./exams.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { UserRole } from "../users/user.entity";
import { CreateExamDto } from "./dto/create-exam.dto";
import { UpdateExamDto } from "./dto/update-exam.dto";

@Controller("exams")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() createExamDto: CreateExamDto, @Request() req) {
    return this.examsService.create(createExamDto, req.user.id);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  findAll() {
    return this.examsService.findAll();
  }

  @Get("active")
  findActiveExams() {
    return this.examsService.findActiveExams();
  }

  @Get("stats")
  @Roles(UserRole.ADMIN)
  getStats() {
    return this.examsService.getStats();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.examsService.findOne(id);
  }

  @Patch(":id")
  @Roles(UserRole.ADMIN)
  update(@Param("id") id: string, @Body() updateExamDto: UpdateExamDto) {
    return this.examsService.update(id, updateExamDto);
  }

  @Patch(":id/publish")
  @Roles(UserRole.ADMIN)
  publish(@Param("id") id: string) {
    return this.examsService.publish(id);
  }

  @Patch(":id/close")
  @Roles(UserRole.ADMIN)
  close(@Param("id") id: string) {
    return this.examsService.close(id);
  }

  @Delete(":id")
  @Roles(UserRole.ADMIN)
  remove(@Param("id") id: string) {
    return this.examsService.remove(id);
  }
}
