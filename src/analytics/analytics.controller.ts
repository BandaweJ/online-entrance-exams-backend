import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  Res,
  Header,
} from "@nestjs/common";
import { Response } from "express";
import { AnalyticsService } from "./analytics.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { UserRole } from "../users/user.entity";

@Controller("analytics")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get("performance-trends")
  @Roles(UserRole.ADMIN)
  async getPerformanceTrends(
    @Query("period") period: "week" | "month" | "quarter" | "year" = "month",
    @Query("examId") examId?: string,
  ) {
    return this.analyticsService.getPerformanceTrends(period, examId);
  }

  @Get("student-performance")
  @Roles(UserRole.ADMIN)
  async getStudentPerformance(
    @Query("limit") limit: number = 50,
    @Query("sortBy")
    sortBy: "averageScore" | "improvement" | "totalExams" = "averageScore",
  ) {
    return this.analyticsService.getStudentPerformanceMetrics(limit, sortBy);
  }

  @Get("exam-analytics/:examId")
  @Roles(UserRole.ADMIN)
  async getExamAnalytics(@Param("examId") examId: string) {
    return this.analyticsService.getExamAnalytics(examId);
  }

  @Get("time-based")
  @Roles(UserRole.ADMIN)
  async getTimeBasedAnalytics(
    @Query("period") period: "day" | "week" | "month" = "week",
    @Query("examId") examId?: string,
  ) {
    return this.analyticsService.getTimeBasedAnalytics(period, examId);
  }

  @Get("subject-performance")
  @Roles(UserRole.ADMIN)
  async getSubjectPerformance() {
    return this.analyticsService.getSubjectPerformance();
  }

  @Get("export/:type")
  @Roles(UserRole.ADMIN)
  @Header("Content-Type", "text/csv")
  async exportData(
    @Param("type") type: "performance" | "students" | "exams" | "time-based",
    @Res() res: Response,
    @Query("format") format: "csv" | "json" = "json",
    @Query("period") period?: string,
    @Query("examId") examId?: string,
    @Query("limit") limit?: number,
    @Query("sortBy") sortBy?: string,
  ) {
    const filters = { period, examId, limit, sortBy };
    const data = await this.analyticsService.exportAnalyticsData(
      type,
      format,
      filters,
    );

    if (format === "csv") {
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${type}-analytics.csv"`,
      );
      res.send(data);
    } else {
      res.json(data);
    }
  }

  @Get("dashboard-summary")
  @Roles(UserRole.ADMIN)
  async getDashboardSummary() {
    const [
      performanceTrends,
      studentPerformance,
      timeBasedAnalytics,
      subjectPerformance,
    ] = await Promise.all([
      this.analyticsService.getPerformanceTrends("month"),
      this.analyticsService.getStudentPerformanceMetrics(10, "averageScore"),
      this.analyticsService.getTimeBasedAnalytics("week"),
      this.analyticsService.getSubjectPerformance(),
    ]);

    return {
      performanceTrends: performanceTrends.slice(-6), // Last 6 periods
      topStudents: studentPerformance.slice(0, 10),
      recentActivity: timeBasedAnalytics.daily.slice(-7), // Last 7 days
      subjectPerformance: subjectPerformance.slice(0, 5), // Top 5 subjects
    };
  }
}
