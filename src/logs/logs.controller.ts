import { Controller, Post, Body, UseGuards } from "@nestjs/common";
import { LogsService } from "./logs.service";
import { CreateErrorLogDto } from "./dto/create-error-log.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@Controller("logs")
@UseGuards(JwtAuthGuard)
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Post("error")
  createErrorLog(@Body() createErrorLogDto: CreateErrorLogDto) {
    return this.logsService.createErrorLog(createErrorLogDto);
  }
}
