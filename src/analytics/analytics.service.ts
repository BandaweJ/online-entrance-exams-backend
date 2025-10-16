import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Between } from "typeorm";
import { Result, Grade } from "../results/result.entity";
import { ExamAttempt } from "../attempts/exam-attempt.entity";
import { Student } from "../students/student.entity";
import { Exam } from "../exams/exam.entity";
import { Answer } from "../answers/answer.entity";

export interface PerformanceTrends {
  period: string;
  averageScore: number;
  averagePercentage: number;
  passRate: number;
  totalAttempts: number;
  completionRate: number;
}

export interface StudentPerformanceMetrics {
  studentId: string;
  studentName: string;
  totalExams: number;
  averageScore: number;
  averagePercentage: number;
  bestGrade: Grade;
  improvementTrend: "improving" | "declining" | "stable";
  lastExamDate: Date;
  totalTimeSpent: number;
}

export interface ExamAnalytics {
  examId: string;
  examTitle: string;
  totalAttempts: number;
  averageScore: number;
  averagePercentage: number;
  passRate: number;
  completionRate: number;
  averageTimeSpent: number;
  gradeDistribution: Record<string, number>;
  difficultyAnalysis: {
    easyQuestions: number;
    mediumQuestions: number;
    hardQuestions: number;
  };
  questionPerformance: Array<{
    questionId: string;
    questionText: string;
    correctAnswers: number;
    totalAttempts: number;
    accuracyRate: number;
    averageTimeSpent: number;
  }>;
}

export interface TimeBasedAnalytics {
  hourly: Array<{ hour: number; attempts: number; averageScore: number }>;
  daily: Array<{ date: string; attempts: number; averageScore: number }>;
  weekly: Array<{ week: string; attempts: number; averageScore: number }>;
  monthly: Array<{ month: string; attempts: number; averageScore: number }>;
}

export interface SubjectPerformance {
  subject: string;
  totalQuestions: number;
  averageAccuracy: number;
  totalAttempts: number;
  difficultyBreakdown: {
    easy: number;
    medium: number;
    hard: number;
  };
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Result)
    private resultRepository: Repository<Result>,
    @InjectRepository(ExamAttempt)
    private attemptRepository: Repository<ExamAttempt>,
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    @InjectRepository(Exam)
    private examRepository: Repository<Exam>,
    @InjectRepository(Answer)
    private answerRepository: Repository<Answer>,
  ) {}

  async getPerformanceTrends(
    period: "week" | "month" | "quarter" | "year" = "month",
    examId?: string,
  ): Promise<PerformanceTrends[]> {
    const endDate = new Date();
    const startDate = this.getStartDateForPeriod(period, endDate);

    const whereCondition: any = {
      createdAt: Between(startDate, endDate),
    };

    if (examId) {
      whereCondition.examId = examId;
    }

    const results = await this.resultRepository.find({
      where: whereCondition,
      relations: ["exam", "attempt"],
      order: { createdAt: "ASC" },
    });

    return this.calculatePerformanceTrends(results, period);
  }

  async getStudentPerformanceMetrics(
    limit: number = 50,
    sortBy: "averageScore" | "improvement" | "totalExams" = "averageScore",
  ): Promise<StudentPerformanceMetrics[]> {
    const students = await this.studentRepository.find({
      relations: ["examAttempts", "examAttempts.results"],
      take: limit,
    });

    const metrics = students.map((student) => {
      const results = student.examAttempts
        .flatMap((attempt) => attempt.results)
        .filter((result) => result.isPublished);

      if (results.length === 0) {
        return {
          studentId: student.id,
          studentName: student.fullName,
          totalExams: 0,
          averageScore: 0,
          averagePercentage: 0,
          bestGrade: null,
          improvementTrend: "stable" as const,
          lastExamDate: null,
          totalTimeSpent: 0,
        };
      }

      const scores = results.map((r) => r.percentage);
      const averageScore =
        scores.reduce((sum, score) => sum + score, 0) / scores.length;
      const averagePercentage =
        results.reduce((sum, r) => sum + r.percentage, 0) / results.length;

      const bestGrade = this.getBestGrade(results);
      const improvementTrend = this.calculateImprovementTrend(results);
      const lastExamDate = results.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )[0]?.createdAt;
      const totalTimeSpent = results.reduce((sum, r) => sum + r.timeSpent, 0);

      return {
        studentId: student.id,
        studentName: student.fullName,
        totalExams: results.length,
        averageScore,
        averagePercentage,
        bestGrade,
        improvementTrend,
        lastExamDate,
        totalTimeSpent,
      };
    });

    return this.sortMetrics(metrics, sortBy);
  }

  async getExamAnalytics(examId: string): Promise<ExamAnalytics> {
    const exam = await this.examRepository.findOne({
      where: { id: examId },
      relations: ["questions", "attempts", "attempts.results"],
    });

    if (!exam) {
      throw new Error("Exam not found");
    }

    const results = exam.attempts.flatMap((attempt) => attempt.results);
    const publishedResults = results.filter((r) => r.isPublished);

    if (publishedResults.length === 0) {
      return {
        examId: exam.id,
        examTitle: exam.title,
        totalAttempts: 0,
        averageScore: 0,
        averagePercentage: 0,
        passRate: 0,
        completionRate: 0,
        averageTimeSpent: 0,
        gradeDistribution: {},
        difficultyAnalysis: {
          easyQuestions: 0,
          mediumQuestions: 0,
          hardQuestions: 0,
        },
        questionPerformance: [],
      };
    }

    const scores = publishedResults.map((r) => r.score);
    const percentages = publishedResults.map((r) => r.percentage);
    const passedCount = publishedResults.filter((r) => r.isPassed).length;
    const totalAttempts = exam.attempts.length;
    const completedAttempts = publishedResults.length;

    const averageScore =
      scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const averagePercentage =
      percentages.reduce((sum, p) => sum + p, 0) / percentages.length;
    const passRate = (passedCount / publishedResults.length) * 100;
    const completionRate = (completedAttempts / totalAttempts) * 100;
    const averageTimeSpent =
      publishedResults.reduce((sum, r) => sum + r.timeSpent, 0) /
      publishedResults.length;

    const gradeDistribution = this.calculateGradeDistribution(publishedResults);
    const difficultyAnalysis = {
      easyQuestions: 0,
      mediumQuestions: 0,
      hardQuestions: 0,
    }; // TODO: Implement when questions relationship is available
    const questionPerformance = await this.analyzeQuestionPerformance(examId);

    return {
      examId: exam.id,
      examTitle: exam.title,
      totalAttempts,
      averageScore,
      averagePercentage,
      passRate,
      completionRate,
      averageTimeSpent,
      gradeDistribution,
      difficultyAnalysis,
      questionPerformance,
    };
  }

  async getTimeBasedAnalytics(
    period: "day" | "week" | "month" = "week",
    examId?: string,
  ): Promise<TimeBasedAnalytics> {
    const endDate = new Date();
    const startDate = this.getStartDateForPeriod(period, endDate);

    const whereCondition: any = {
      createdAt: Between(startDate, endDate),
    };

    if (examId) {
      whereCondition.examId = examId;
    }

    const results = await this.resultRepository.find({
      where: whereCondition,
      relations: ["attempt"],
      order: { createdAt: "ASC" },
    });

    return {
      hourly: this.calculateHourlyAnalytics(results),
      daily: this.calculateDailyAnalytics(results),
      weekly: this.calculateWeeklyAnalytics(results),
      monthly: this.calculateMonthlyAnalytics(results),
    };
  }

  async getSubjectPerformance(): Promise<SubjectPerformance[]> {
    // This would require a subject field in questions or exam sections
    // For now, we'll return a placeholder implementation
    const results = await this.resultRepository.find({
      relations: [
        "exam",
        "attempt",
        "attempt.answers",
        "attempt.answers.question",
      ],
    });

    // Group by exam title as a proxy for subject
    const subjectMap = new Map<string, any>();

    results.forEach((result) => {
      const subject = result.exam?.title || "Unknown";
      if (!subjectMap.has(subject)) {
        subjectMap.set(subject, {
          subject,
          totalQuestions: 0,
          correctAnswers: 0,
          totalAttempts: 0,
          questions: new Set(),
          difficultyBreakdown: { easy: 0, medium: 0, hard: 0 },
        });
      }

      const subjectData = subjectMap.get(subject);
      subjectData.totalAttempts++;

      if (result.attempt?.answers) {
        result.attempt.answers.forEach((answer) => {
          if (answer.question) {
            subjectData.questions.add(answer.question.id);
            if (answer.isCorrect) {
              subjectData.correctAnswers++;
            }
          }
        });
      }
    });

    return Array.from(subjectMap.values()).map((data) => ({
      subject: data.subject,
      totalQuestions: data.questions.size,
      averageAccuracy:
        data.totalAttempts > 0
          ? (data.correctAnswers / (data.totalAttempts * data.questions.size)) *
            100
          : 0,
      totalAttempts: data.totalAttempts,
      difficultyBreakdown: data.difficultyBreakdown,
    }));
  }

  async exportAnalyticsData(
    type: "performance" | "students" | "exams" | "time-based",
    format: "csv" | "json" = "json",
    filters?: any,
  ): Promise<any> {
    let data: any;

    switch (type) {
      case "performance":
        data = await this.getPerformanceTrends(
          filters?.period,
          filters?.examId,
        );
        break;
      case "students":
        data = await this.getStudentPerformanceMetrics(
          filters?.limit,
          filters?.sortBy,
        );
        break;
      case "exams":
        data = await this.getExamAnalytics(filters?.examId);
        break;
      case "time-based":
        data = await this.getTimeBasedAnalytics(
          filters?.period,
          filters?.examId,
        );
        break;
      default:
        throw new Error("Invalid export type");
    }

    if (format === "csv") {
      return this.convertToCSV(data);
    }

    return data;
  }

  private getStartDateForPeriod(period: string, endDate: Date): Date {
    const startDate = new Date(endDate);

    switch (period) {
      case "week":
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "month":
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case "quarter":
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case "year":
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case "day":
        startDate.setDate(startDate.getDate() - 1);
        break;
    }

    return startDate;
  }

  private calculatePerformanceTrends(
    results: Result[],
    period: string,
  ): PerformanceTrends[] {
    const trends: PerformanceTrends[] = [];
    const groupedResults = this.groupResultsByPeriod(results, period);

    Object.entries(groupedResults).forEach(([periodKey, periodResults]) => {
      if (periodResults.length === 0) return;

      const scores = periodResults.map((r) => r.score);
      const percentages = periodResults.map((r) => r.percentage);
      const passedCount = periodResults.filter((r) => r.isPassed).length;
      const totalAttempts = periodResults.length;
      const completedCount = periodResults.filter((r) => r.isPublished).length;

      trends.push({
        period: periodKey,
        averageScore:
          scores.reduce((sum, score) => sum + score, 0) / scores.length,
        averagePercentage:
          percentages.reduce((sum, p) => sum + p, 0) / percentages.length,
        passRate: (passedCount / periodResults.length) * 100,
        totalAttempts,
        completionRate: (completedCount / totalAttempts) * 100,
      });
    });

    return trends.sort((a, b) => a.period.localeCompare(b.period));
  }

  private groupResultsByPeriod(
    results: Result[],
    period: string,
  ): Record<string, Result[]> {
    const grouped: Record<string, Result[]> = {};

    results.forEach((result) => {
      const date = new Date(result.createdAt);
      let key: string;

      switch (period) {
        case "week":
          key = this.getWeekKey(date);
          break;
        case "month":
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
          break;
        case "quarter":
          const quarter = Math.floor(date.getMonth() / 3) + 1;
          key = `${date.getFullYear()}-Q${quarter}`;
          break;
        case "year":
          key = String(date.getFullYear());
          break;
        default:
          key = date.toISOString().split("T")[0];
      }

      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(result);
    });

    return grouped;
  }

  private getWeekKey(date: Date): string {
    const year = date.getFullYear();
    const week = this.getWeekNumber(date);
    return `${year}-W${String(week).padStart(2, "0")}`;
  }

  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear =
      (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  private getBestGrade(results: Result[]): Grade | null {
    if (results.length === 0) return null;

    const gradeOrder = [
      Grade.A_PLUS,
      Grade.A,
      Grade.B_PLUS,
      Grade.B,
      Grade.C_PLUS,
      Grade.C,
      Grade.D,
      Grade.F,
    ];

    for (const grade of gradeOrder) {
      if (results.some((r) => r.grade === grade)) {
        return grade;
      }
    }

    return null;
  }

  private calculateImprovementTrend(
    results: Result[],
  ): "improving" | "declining" | "stable" {
    if (results.length < 2) return "stable";

    const sortedResults = results.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

    const firstHalf = sortedResults.slice(
      0,
      Math.floor(sortedResults.length / 2),
    );
    const secondHalf = sortedResults.slice(
      Math.floor(sortedResults.length / 2),
    );

    const firstHalfAvg =
      firstHalf.reduce((sum, r) => sum + r.percentage, 0) / firstHalf.length;
    const secondHalfAvg =
      secondHalf.reduce((sum, r) => sum + r.percentage, 0) / secondHalf.length;

    const improvement = secondHalfAvg - firstHalfAvg;

    if (improvement > 5) return "improving";
    if (improvement < -5) return "declining";
    return "stable";
  }

  private sortMetrics(
    metrics: StudentPerformanceMetrics[],
    sortBy: string,
  ): StudentPerformanceMetrics[] {
    return metrics.sort((a, b) => {
      switch (sortBy) {
        case "averageScore":
          return b.averageScore - a.averageScore;
        case "totalExams":
          return b.totalExams - a.totalExams;
        case "improvement":
          const improvementOrder = { improving: 2, stable: 1, declining: 0 };
          return (
            improvementOrder[b.improvementTrend] -
            improvementOrder[a.improvementTrend]
          );
        default:
          return 0;
      }
    });
  }

  private calculateGradeDistribution(
    results: Result[],
  ): Record<string, number> {
    const distribution: Record<string, number> = {};

    Object.values(Grade).forEach((grade) => {
      distribution[grade] = results.filter((r) => r.grade === grade).length;
    });

    return distribution;
  }

  private analyzeQuestionDifficulty(questions: any[]): {
    easyQuestions: number;
    mediumQuestions: number;
    hardQuestions: number;
  } {
    // This is a simplified implementation - in a real system, you'd have difficulty levels
    return {
      easyQuestions: Math.floor(questions.length * 0.3),
      mediumQuestions: Math.floor(questions.length * 0.5),
      hardQuestions: Math.floor(questions.length * 0.2),
    };
  }

  private async analyzeQuestionPerformance(examId: string): Promise<any[]> {
    const answers = await this.answerRepository.find({
      where: { attempt: { examId } },
      relations: ["question", "attempt"],
    });

    const questionMap = new Map<string, any>();

    answers.forEach((answer) => {
      if (!answer.question) return;

      const questionId = answer.question.id;
      if (!questionMap.has(questionId)) {
        questionMap.set(questionId, {
          questionId,
          questionText: answer.question.questionText,
          correctAnswers: 0,
          totalAttempts: 0,
          totalTimeSpent: 0,
        });
      }

      const questionData = questionMap.get(questionId);
      questionData.totalAttempts++;
      questionData.totalTimeSpent += 0; // timeSpent not available on Answer entity

      if (answer.isCorrect) {
        questionData.correctAnswers++;
      }
    });

    return Array.from(questionMap.values()).map((data) => ({
      ...data,
      accuracyRate:
        data.totalAttempts > 0
          ? (data.correctAnswers / data.totalAttempts) * 100
          : 0,
      averageTimeSpent:
        data.totalAttempts > 0 ? data.totalTimeSpent / data.totalAttempts : 0,
    }));
  }

  private calculateHourlyAnalytics(
    results: Result[],
  ): Array<{ hour: number; attempts: number; averageScore: number }> {
    const hourlyData: Record<number, { attempts: number; totalScore: number }> =
      {};

    results.forEach((result) => {
      const hour = new Date(result.createdAt).getHours();
      if (!hourlyData[hour]) {
        hourlyData[hour] = { attempts: 0, totalScore: 0 };
      }
      hourlyData[hour].attempts++;
      hourlyData[hour].totalScore += result.score;
    });

    return Object.entries(hourlyData).map(([hour, data]) => ({
      hour: parseInt(hour),
      attempts: data.attempts,
      averageScore: data.totalScore / data.attempts,
    }));
  }

  private calculateDailyAnalytics(
    results: Result[],
  ): Array<{ date: string; attempts: number; averageScore: number }> {
    const dailyData: Record<string, { attempts: number; totalScore: number }> =
      {};

    results.forEach((result) => {
      const date = result.createdAt.toISOString().split("T")[0];
      if (!dailyData[date]) {
        dailyData[date] = { attempts: 0, totalScore: 0 };
      }
      dailyData[date].attempts++;
      dailyData[date].totalScore += result.score;
    });

    return Object.entries(dailyData).map(([date, data]) => ({
      date,
      attempts: data.attempts,
      averageScore: data.totalScore / data.attempts,
    }));
  }

  private calculateWeeklyAnalytics(
    results: Result[],
  ): Array<{ week: string; attempts: number; averageScore: number }> {
    const weeklyData: Record<string, { attempts: number; totalScore: number }> =
      {};

    results.forEach((result) => {
      const weekKey = this.getWeekKey(new Date(result.createdAt));
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = { attempts: 0, totalScore: 0 };
      }
      weeklyData[weekKey].attempts++;
      weeklyData[weekKey].totalScore += result.score;
    });

    return Object.entries(weeklyData).map(([week, data]) => ({
      week,
      attempts: data.attempts,
      averageScore: data.totalScore / data.attempts,
    }));
  }

  private calculateMonthlyAnalytics(
    results: Result[],
  ): Array<{ month: string; attempts: number; averageScore: number }> {
    const monthlyData: Record<
      string,
      { attempts: number; totalScore: number }
    > = {};

    results.forEach((result) => {
      const monthKey = `${result.createdAt.getFullYear()}-${String(result.createdAt.getMonth() + 1).padStart(2, "0")}`;
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { attempts: 0, totalScore: 0 };
      }
      monthlyData[monthKey].attempts++;
      monthlyData[monthKey].totalScore += result.score;
    });

    return Object.entries(monthlyData).map(([month, data]) => ({
      month,
      attempts: data.attempts,
      averageScore: data.totalScore / data.attempts,
    }));
  }

  private convertToCSV(data: any): string {
    if (!Array.isArray(data) || data.length === 0) {
      return "";
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(","),
      ...data.map((row) =>
        headers.map((header) => `"${row[header] || ""}"`).join(","),
      ),
    ].join("\n");

    return csvContent;
  }
}
