import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from "@nestjs/common";
import { AnswersService } from "./answers.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CreateAnswerDto } from "./dto/create-answer.dto";
import { UpdateAnswerDto } from "./dto/update-answer.dto";

@Controller("answers")
@UseGuards(JwtAuthGuard)
export class AnswersController {
  constructor(private readonly answersService: AnswersService) {}

  @Post()
  create(@Body() createAnswerDto: CreateAnswerDto, @Request() req) {
    return this.answersService.create(createAnswerDto, req.user.id);
  }

  @Get("attempt/:attemptId")
  findAll(@Param("attemptId") attemptId: string, @Request() req) {
    return this.answersService.findAll(attemptId, req.user.id);
  }

  @Get("attempt/:attemptId/stats")
  getStats(@Param("attemptId") attemptId: string, @Request() req) {
    return this.answersService.getAnswerStats(attemptId, req.user.id);
  }

  @Get("attempt/:attemptId/unanswered")
  getUnansweredQuestions(
    @Param("attemptId") attemptId: string,
    @Request() req,
  ) {
    return this.answersService.getUnansweredQuestions(attemptId, req.user.id);
  }

  @Get("question/:questionId/attempt/:attemptId")
  getQuestionAnswer(
    @Param("questionId") questionId: string,
    @Param("attemptId") attemptId: string,
    @Request() req,
  ) {
    return this.answersService.getQuestionAnswer(
      questionId,
      attemptId,
      req.user.id,
    );
  }

  @Get(":id")
  findOne(@Param("id") id: string, @Request() req) {
    return this.answersService.findOne(id, req.user.id);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() updateAnswerDto: UpdateAnswerDto,
    @Request() req,
  ) {
    return this.answersService.update(id, updateAnswerDto, req.user.id);
  }

  @Patch(":id/mark")
  markAnswer(
    @Param("id") id: string,
    @Body() body: { score: number; feedback?: string },
  ) {
    return this.answersService.markAnswer(id, body.score, body.feedback);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @Request() req) {
    return this.answersService.remove(id, req.user.id);
  }
}
