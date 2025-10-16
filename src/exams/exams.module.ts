import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Exam } from "./exam.entity";
import { Section } from "./section.entity";
import { ExamsController } from "./exams.controller";
import { ExamsService } from "./exams.service";
import { SectionsController } from "./sections.controller";
import { SectionsService } from "./sections.service";

@Module({
  imports: [TypeOrmModule.forFeature([Exam, Section])],
  controllers: [ExamsController, SectionsController],
  providers: [ExamsService, SectionsService],
  exports: [ExamsService, SectionsService],
})
export class ExamsModule {}
