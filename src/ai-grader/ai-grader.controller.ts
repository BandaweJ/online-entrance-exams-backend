import { Controller, Post, Body, Get, UseGuards } from "@nestjs/common";
import { AiGraderService } from "./ai-grader.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AiGraderRequest } from "./interfaces/ai-grader.interface";

@Controller("ai-grader")
@UseGuards(JwtAuthGuard)
export class AiGraderController {
  constructor(private readonly aiGraderService: AiGraderService) {}

  @Post("grade")
  async gradeAnswer(@Body() request: AiGraderRequest) {
    return this.aiGraderService.gradeAnswer(request);
  }

  @Post("grade-multiple")
  async gradeMultipleAnswers(@Body() body: { requests: AiGraderRequest[] }) {
    return this.aiGraderService.gradeMultipleAnswers(body.requests);
  }

  @Get("status")
  async getServiceStatus() {
    return this.aiGraderService.getServiceStatus();
  }
}
