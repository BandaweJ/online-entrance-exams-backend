import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  UseGuards,
  Request,
  Query,
} from "@nestjs/common";
import { ResultsService } from "./results.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@Controller("results")
@UseGuards(JwtAuthGuard)
export class ResultsController {
  constructor(private readonly resultsService: ResultsService) {}

  @Post("generate/:attemptId")
  generateResult(@Param("attemptId") attemptId: string, @Request() req) {
    return this.resultsService.generateResult(attemptId, req.user.id);
  }

  @Get()
  findAll(
    @Query("studentId") studentId?: string,
    @Query("examId") examId?: string,
  ) {
    return this.resultsService.findAll(studentId, examId);
  }

  @Get("student")
  getStudentResults() {
    // Temporarily use hardcoded user ID for testing
    const userId = "1cbafbdb-fb5e-402b-97dd-09814e36a6d5";
    return this.resultsService.getStudentResults(userId);
  }

  @Get("exam/:examId")
  getExamResults(@Param("examId") examId: string) {
    return this.resultsService.getExamResults(examId);
  }

  @Get("exam/:examId/stats")
  getExamStats(@Param("examId") examId: string) {
    return this.resultsService.getExamStats(examId);
  }

  @Get("student/stats")
  getStudentStats(@Request() req) {
    return this.resultsService.getStudentStats(req.user.id);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.resultsService.findOne(id);
  }

  @Patch(":id/publish")
  publishResult(@Param("id") id: string) {
    return this.resultsService.publishResult(id);
  }
}
