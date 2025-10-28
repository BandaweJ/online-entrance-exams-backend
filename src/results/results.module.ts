import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Result } from "./result.entity";
import { ExamAttempt } from "../attempts/exam-attempt.entity";
import { Answer } from "../answers/answer.entity";
import { Student } from "../students/student.entity";
import { Exam } from "../exams/exam.entity";
import { ResultsController } from "./results.controller";
import { ResultsService } from "./results.service";
import { PdfExportService } from "./pdf-export.service";
import { ScoringModule } from "../scoring/scoring.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Result, ExamAttempt, Answer, Student, Exam]),
    ScoringModule,
  ],
  controllers: [ResultsController],
  providers: [ResultsService, PdfExportService],
  exports: [ResultsService, PdfExportService],
})
export class ResultsModule {}
