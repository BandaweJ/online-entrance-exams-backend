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
import { SectionsService } from "./sections.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CreateSectionDto } from "./dto/create-section.dto";
import { UpdateSectionDto } from "./dto/update-section.dto";

@Controller("exams/:examId/sections")
@UseGuards(JwtAuthGuard)
export class SectionsController {
  constructor(private readonly sectionsService: SectionsService) {}

  @Post()
  create(
    @Param("examId") examId: string,
    @Body() createSectionDto: CreateSectionDto,
  ) {
    return this.sectionsService.create(createSectionDto, examId);
  }

  @Get()
  findAll(@Param("examId") examId: string) {
    return this.sectionsService.findAll(examId);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.sectionsService.findOne(id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() updateSectionDto: UpdateSectionDto) {
    return this.sectionsService.update(id, updateSectionDto);
  }

  @Patch(":id/order")
  updateOrder(@Param("id") id: string, @Body() body: { order: number }) {
    return this.sectionsService.updateOrder(id, body.order);
  }

  @Patch(":id/recalculate-marks")
  recalculateMarks(@Param("id") id: string) {
    return this.sectionsService.recalculateMarks(id);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.sectionsService.remove(id);
  }
}
