import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from "@nestjs/common";
import { QuestionsService } from "./questions.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CreateQuestionDto } from "./dto/create-question.dto";
import { UpdateQuestionDto } from "./dto/update-question.dto";

@Controller("sections/:sectionId/questions")
@UseGuards(JwtAuthGuard)
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Post()
  create(
    @Param("sectionId") sectionId: string,
    @Body() createQuestionDto: CreateQuestionDto,
  ) {
    return this.questionsService.create(createQuestionDto, sectionId);
  }

  @Get()
  findAll(@Param("sectionId") sectionId: string) {
    return this.questionsService.findAll(sectionId);
  }

  @Get("stats")
  getStats(@Param("sectionId") sectionId: string) {
    return this.questionsService.getQuestionStats(sectionId);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.questionsService.findOne(id);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() updateQuestionDto: UpdateQuestionDto,
  ) {
    return this.questionsService.update(id, updateQuestionDto);
  }

  @Patch(":id/order")
  updateOrder(@Param("id") id: string, @Body() body: { order: number }) {
    return this.questionsService.updateOrder(id, body.order);
  }

  @Post(":id/duplicate")
  duplicate(@Param("id") id: string) {
    return this.questionsService.duplicate(id);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.questionsService.remove(id);
  }
}
