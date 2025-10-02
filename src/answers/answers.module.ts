import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Answer } from './answer.entity';
import { Question } from '../questions/question.entity';
import { ExamAttempt } from '../attempts/exam-attempt.entity';
import { Student } from '../students/student.entity';
import { AnswersController } from './answers.controller';
import { AnswersService } from './answers.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Answer, Question, ExamAttempt, Student]),
  ],
  controllers: [AnswersController],
  providers: [AnswersService],
  exports: [AnswersService],
})
export class AnswersModule {}
