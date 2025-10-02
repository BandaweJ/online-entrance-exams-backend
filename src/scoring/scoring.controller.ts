import { Controller, Post, Get, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ExamScoringService } from './exam-scoring.service';

@Controller('scoring')
@UseGuards(JwtAuthGuard)
export class ScoringController {
  constructor(private readonly examScoringService: ExamScoringService) {}

  @Post('score-exam/:attemptId')
  @HttpCode(HttpStatus.OK)
  async scoreExam(@Param('attemptId') attemptId: string) {
    return this.examScoringService.scoreExam(attemptId);
  }

  @Get('progress/:attemptId')
  async getScoringProgress(@Param('attemptId') attemptId: string) {
    return this.examScoringService.getScoringProgress(attemptId);
  }

  @Post('regrade-answer/:answerId')
  @HttpCode(HttpStatus.OK)
  async regradeAnswer(@Param('answerId') answerId: string) {
    return this.examScoringService.regradeAnswer(answerId);
  }
}
