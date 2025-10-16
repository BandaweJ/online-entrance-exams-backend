import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Request,
} from "@nestjs/common";
import { AttemptsService } from "./attempts.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { UserRole } from "../users/user.entity";
import { CreateAttemptDto } from "./dto/create-attempt.dto";
import { UpdateAttemptDto } from "./dto/update-attempt.dto";

@Controller("attempts")
@UseGuards(JwtAuthGuard)
export class AttemptsController {
  constructor(private readonly attemptsService: AttemptsService) {}

  @Post()
  create(@Body() createAttemptDto: CreateAttemptDto, @Request() req) {
    return this.attemptsService.create(createAttemptDto, req.user.id);
  }

  @Get()
  findAll(@Request() req) {
    return this.attemptsService.findAll(req.user.id);
  }

  @Get("admin")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  findAllForAdmin() {
    return this.attemptsService.findAllForAdmin();
  }

  @Get("stats")
  getStats(@Request() req) {
    return this.attemptsService.getAttemptStats(req.user.id);
  }

  @Get("current/:examId")
  getCurrentAttempt(@Param("examId") examId: string, @Request() req) {
    return this.attemptsService.getCurrentAttempt(req.user.id, examId);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @Request() req) {
    return this.attemptsService.findOne(id, req.user.id);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() updateAttemptDto: UpdateAttemptDto,
    @Request() req,
  ) {
    return this.attemptsService.update(id, updateAttemptDto, req.user.id);
  }

  @Patch(":id/pause")
  pause(@Param("id") id: string, @Request() req) {
    return this.attemptsService.pause(id, req.user.id);
  }

  @Patch(":id/resume")
  resume(@Param("id") id: string, @Request() req) {
    return this.attemptsService.resume(id, req.user.id);
  }

  @Patch(":id/submit")
  submit(@Param("id") id: string, @Request() req) {
    return this.attemptsService.submit(id, req.user.id);
  }

  @Get(":id/time-remaining")
  checkTimeRemaining(@Param("id") id: string, @Request() req) {
    return this.attemptsService.checkTimeRemaining(id, req.user.id);
  }
}
