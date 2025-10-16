import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ExamAttempt } from "./exam-attempt.entity";
import { Student } from "../students/student.entity";
import { Exam } from "../exams/exam.entity";
import { User } from "../users/user.entity";
import { AttemptsController } from "./attempts.controller";
import { AttemptsService } from "./attempts.service";
import { ScoringModule } from "../scoring/scoring.module";
import { ResultsModule } from "../results/results.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([ExamAttempt, Student, Exam, User]),
    ScoringModule,
    forwardRef(() => ResultsModule),
  ],
  controllers: [AttemptsController],
  providers: [AttemptsService],
  exports: [AttemptsService],
})
export class AttemptsModule {}
