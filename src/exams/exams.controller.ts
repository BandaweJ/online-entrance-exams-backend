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
import { CreateExamDto } from "./dto/create-exam.dto";
import { UpdateExamDto } from "./dto/update-exam.dto";

@Controller("exams")
@UseGuards(JwtAuthGuard)
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Post()
  create(@Body() createExamDto: CreateExamDto, @Request() req) {
    return this.examsService.create(createExamDto, req.user.id);
  }

  @Get()
  findAll() {
    return this.examsService.findAll();
  }

  @Get("active")
  findActiveExams() {
    return this.examsService.findActiveExams();
  }

  @Get("stats")
  getStats() {
    return this.examsService.getStats();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.examsService.findOne(id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() updateExamDto: UpdateExamDto) {
    return this.examsService.update(id, updateExamDto);
  }

  @Patch(":id/publish")
  publish(@Param("id") id: string) {
    return this.examsService.publish(id);
  }

  @Patch(":id/close")
  close(@Param("id") id: string) {
    return this.examsService.close(id);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.examsService.remove(id);
  }
}
