import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AnalyticsController } from "./analytics.controller";
import { AnalyticsService } from "./analytics.service";
import { Result } from "../results/result.entity";
import { ExamAttempt } from "../attempts/exam-attempt.entity";
import { Student } from "../students/student.entity";
import { Exam } from "../exams/exam.entity";
import { Answer } from "../answers/answer.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([Result, ExamAttempt, Student, Exam, Answer]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
