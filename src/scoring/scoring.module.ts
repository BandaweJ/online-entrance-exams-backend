import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExamScoringService } from './exam-scoring.service';
import { ScoringController } from './scoring.controller';
import { ExamAttempt } from '../attempts/exam-attempt.entity';
import { Answer } from '../answers/answer.entity';
import { Question } from '../questions/question.entity';
import { AiGraderModule } from '../ai-grader/ai-grader.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ExamAttempt, Answer, Question]),
    AiGraderModule,
  ],
  providers: [ExamScoringService],
  controllers: [ScoringController],
  exports: [ExamScoringService],
})
export class ScoringModule {}
