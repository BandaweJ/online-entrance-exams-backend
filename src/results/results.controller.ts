import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  UseGuards,
  Request,
  Query,
  NotFoundException,
  Res,
  StreamableFile,
} from "@nestjs/common";
import { Response } from "express";
import { ResultsService } from "./results.service";
import { PdfExportService } from "./pdf-export.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { UserRole } from "../users/user.entity";

@Controller("results")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ResultsController {
  constructor(
    private readonly resultsService: ResultsService,
    private readonly pdfExportService: PdfExportService,
  ) {}

  @Post("generate/:attemptId")
  @Roles(UserRole.ADMIN)
  async generateResult(@Param("attemptId") attemptId: string, @Request() req) {
    // First get the attempt to find the student ID
    const attempt = await this.resultsService.findAttemptById(attemptId);
    if (!attempt) {
      throw new NotFoundException("Attempt not found");
    }
    return this.resultsService.generateResult(attemptId, attempt.studentId);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  findAll(
    @Query("studentId") studentId?: string,
    @Query("examId") examId?: string,
  ) {
    console.log('Admin requesting all results, studentId:', studentId, 'examId:', examId);
    return this.resultsService.findAll(studentId, examId);
  }

  @Get("student")
  getStudentResults(@Request() req) {
    return this.resultsService.getStudentResults(req.user.id);
  }

  @Get("exam/:examId")
  @Roles(UserRole.ADMIN)
  getExamResults(@Param("examId") examId: string) {
    return this.resultsService.getExamResults(examId);
  }

  @Get("exam/:examId/stats")
  @Roles(UserRole.ADMIN)
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
  @Roles(UserRole.ADMIN)
  publishResult(@Param("id") id: string) {
    return this.resultsService.publishResult(id);
  }

  @Get(":id/export/pdf")
  async exportResultPdf(@Param("id") id: string, @Res() res: Response) {
    const result = await this.resultsService.findOne(id);
    if (!result) {
      throw new NotFoundException("Result not found");
    }

    const pdfBuffer = await this.pdfExportService.generateResultPdf(result);
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="result-${result.student?.studentId || result.id}.pdf"`,
      'Content-Length': pdfBuffer.length.toString(),
    });

    res.send(pdfBuffer);
  }

  @Get("exam/:examId/export/pdf")
  @Roles(UserRole.ADMIN)
  async exportExamResultsPdf(@Param("examId") examId: string, @Res() res: Response) {
    const results = await this.resultsService.getExamResults(examId);
    if (!results || results.length === 0) {
      throw new NotFoundException("No results found for this exam");
    }

    const pdfBuffer = await this.pdfExportService.generateBulkResultsPdf(results);
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="exam-results-${examId}.pdf"`,
      'Content-Length': pdfBuffer.length.toString(),
    });

    res.send(pdfBuffer);
  }

  @Get("student/export/pdf")
  async exportStudentResultsPdf(@Request() req, @Res() res: Response) {
    const results = await this.resultsService.getStudentResults(req.user.id);
    if (!results || results.length === 0) {
      throw new NotFoundException("No results found for this student");
    }

    const pdfBuffer = await this.pdfExportService.generateBulkResultsPdf(results);
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="my-results-${req.user.id}.pdf"`,
      'Content-Length': pdfBuffer.length.toString(),
    });

    res.send(pdfBuffer);
  }
}
