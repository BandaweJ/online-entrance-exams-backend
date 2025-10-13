import { Controller, Post, Get, Param, UseGuards, HttpCode, HttpStatus, Body } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ExamScoringService } from './exam-scoring.service';
import { ScoringService } from './scoring.service';
import { ScoreRequestDto } from './dto/score-request.dto';

@Controller('scoring')
@UseGuards(JwtAuthGuard)
export class ScoringController {
  constructor(
    private readonly examScoringService: ExamScoringService,
    private readonly scoringService: ScoringService,
  ) {}

  @Post('score-exam/:attemptId')
  @HttpCode(HttpStatus.OK)
  async scoreExam(@Param('attemptId') attemptId: string) {
    return this.examScoringService.scoreExam(attemptId);
  }

  @Post('calculate-similarity')
  @HttpCode(HttpStatus.OK)
  async calculateSimilarity(@Body() scoreRequest: ScoreRequestDto) {
    return this.scoringService.calculateSimilarityScore(scoreRequest);
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
