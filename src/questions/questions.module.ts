import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Question } from "./question.entity";
import { Section } from "../exams/section.entity";
import { QuestionsController } from "./questions.controller";
import { QuestionsService } from "./questions.service";
import { ExamsModule } from "../exams/exams.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Question, Section]),
    forwardRef(() => ExamsModule),
  ],
  controllers: [QuestionsController],
  providers: [QuestionsService],
  exports: [QuestionsService],
})
export class QuestionsModule {}
