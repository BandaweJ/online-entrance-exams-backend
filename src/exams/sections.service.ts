import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Section } from "./section.entity";
import { Exam } from "./exam.entity";
import { CreateSectionDto } from "./dto/create-section.dto";
import { UpdateSectionDto } from "./dto/update-section.dto";

@Injectable()
export class SectionsService {
  constructor(
    @InjectRepository(Section)
    private sectionRepository: Repository<Section>,
    @InjectRepository(Exam)
    private examRepository: Repository<Exam>,
  ) {}

  async create(
    createSectionDto: CreateSectionDto,
    examId: string,
  ): Promise<Section> {
    const exam = await this.examRepository.findOne({ where: { id: examId } });
    if (!exam) {
      throw new NotFoundException("Exam not found");
    }

    // Prevent adding sections to published exams
    if (exam.status === "published") {
      throw new BadRequestException("Cannot add sections to published exam");
    }

    const section = this.sectionRepository.create({
      ...createSectionDto,
      exam: { id: examId } as any,
    });

    const savedSection = await this.sectionRepository.save(section);

    // Recalculate exam statistics after creating section
    await this.recalculateExamStats(examId);

    return savedSection;
  }

  async findAll(examId: string): Promise<Section[]> {
    return this.sectionRepository.find({
      where: { examId },
      relations: ["questions"],
      order: { order: "ASC" },
    });
  }

  async findOne(id: string): Promise<Section> {
    const section = await this.sectionRepository.findOne({
      where: { id },
      relations: ["exam", "questions"],
    });

    if (!section) {
      throw new NotFoundException("Section not found");
    }

    return section;
  }

  async update(
    id: string,
    updateSectionDto: UpdateSectionDto,
  ): Promise<Section> {
    const section = await this.findOne(id);

    // Prevent updating sections of published exams
    if (section.exam.status === "published") {
      throw new BadRequestException("Cannot update section of published exam");
    }

    Object.assign(section, updateSectionDto);
    const savedSection = await this.sectionRepository.save(section);

    // Recalculate exam statistics after updating section
    await this.recalculateExamStats(section.exam.id);

    return savedSection;
  }

  async remove(id: string): Promise<void> {
    const section = await this.findOne(id);

    // Prevent deleting sections of published exams
    if (section.exam.status === "published") {
      throw new BadRequestException("Cannot delete section of published exam");
    }

    const examId = section.exam.id;
    await this.sectionRepository.remove(section);

    // Recalculate exam statistics after deleting section
    await this.recalculateExamStats(examId);
  }

  async updateOrder(id: string, newOrder: number): Promise<Section> {
    const section = await this.findOne(id);

    // Prevent updating order of published exams
    if (section.exam.status === "published") {
      throw new BadRequestException(
        "Cannot update section order of published exam",
      );
    }

    section.order = newOrder;
    return this.sectionRepository.save(section);
  }

  async recalculateMarks(sectionId: string): Promise<Section> {
    const section = await this.findOne(sectionId);

    // Calculate total marks from questions
    const questions = section.questions || [];
    const totalMarks = questions.reduce(
      (sum, question) => sum + parseFloat(question.marks.toString()),
      0,
    );

    section.totalMarks = totalMarks;
    section.questionCount = questions.length;

    const savedSection = await this.sectionRepository.save(section);

    // Recalculate exam statistics after updating section marks
    await this.recalculateExamStats(section.exam.id);

    return savedSection;
  }

  private async recalculateExamStats(examId: string): Promise<void> {
    const exam = await this.examRepository.findOne({
      where: { id: examId },
      relations: ["sections", "sections.questions"],
    });

    if (!exam) {
      return;
    }

    let totalMarks = 0;
    let totalQuestions = 0;

    for (const section of exam.sections) {
      totalMarks += parseFloat(section.totalMarks.toString());
      totalQuestions += section.questionCount;
    }

    exam.totalMarks = totalMarks;
    exam.totalQuestions = totalQuestions;

    await this.examRepository.save(exam);
  }
}
