import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Exam, ExamStatus } from "./exam.entity";
import { Section } from "./section.entity";
import { CreateExamDto } from "./dto/create-exam.dto";
import { UpdateExamDto } from "./dto/update-exam.dto";

@Injectable()
export class ExamsService {
  constructor(
    @InjectRepository(Exam)
    private examRepository: Repository<Exam>,
    @InjectRepository(Section)
    private sectionRepository: Repository<Section>,
  ) {}

  async create(createExamDto: CreateExamDto, createdBy: string): Promise<Exam> {
    const exam = this.examRepository.create({
      ...createExamDto,
      createdBy: { id: createdBy } as any,
    });

    return this.examRepository.save(exam);
  }

  async findAll(): Promise<Exam[]> {
    return this.examRepository.find({
      relations: ["sections", "createdBy"],
      order: { createdAt: "DESC" },
    });
  }

  async findOne(id: string): Promise<Exam> {
    const exam = await this.examRepository.findOne({
      where: { id },
      relations: ["sections", "sections.questions", "createdBy"],
    });

    if (!exam) {
      throw new NotFoundException("Exam not found");
    }

    return exam;
  }

  async update(id: string, updateExamDto: UpdateExamDto): Promise<Exam> {
    const exam = await this.findOne(id);

    // For published exams, only allow certain updates
    if (exam.status === ExamStatus.PUBLISHED) {
      const allowedFields = ["examDate", "durationMinutes", "description"];
      const updateFields = Object.keys(updateExamDto);
      const hasDisallowedFields = updateFields.some(
        (field) => !allowedFields.includes(field),
      );

      if (hasDisallowedFields) {
        throw new BadRequestException(
          "Cannot update exam content after publishing. Only exam date, duration, and description can be modified.",
        );
      }
    }

    Object.assign(exam, updateExamDto);
    return this.examRepository.save(exam);
  }

  async remove(id: string): Promise<void> {
    const exam = await this.findOne(id);

    // Prevent deleting published exams
    if (exam.status === ExamStatus.PUBLISHED) {
      throw new BadRequestException("Cannot delete published exam");
    }

    await this.examRepository.remove(exam);
  }

  async publish(id: string): Promise<Exam> {
    const exam = await this.findOne(id);

    if (exam.status !== ExamStatus.DRAFT) {
      throw new BadRequestException("Only draft exams can be published");
    }

    if (!exam.sections || exam.sections.length === 0) {
      throw new BadRequestException("Cannot publish exam without sections");
    }

    // Calculate total marks and questions
    let totalMarks = 0;
    let totalQuestions = 0;

    for (const section of exam.sections) {
      totalMarks += parseFloat(section.totalMarks.toString());
      totalQuestions += section.questionCount;
    }

    exam.status = ExamStatus.PUBLISHED;
    exam.totalMarks = totalMarks;
    exam.totalQuestions = totalQuestions;

    return this.examRepository.save(exam);
  }

  async close(id: string): Promise<Exam> {
    const exam = await this.findOne(id);

    if (exam.status !== ExamStatus.PUBLISHED) {
      throw new BadRequestException("Only published exams can be closed");
    }

    exam.status = ExamStatus.CLOSED;
    return this.examRepository.save(exam);
  }

  async recalculateExamStats(examId: string): Promise<void> {
    const exam = await this.examRepository.findOne({
      where: { id: examId },
      relations: ["sections", "sections.questions"],
    });

    if (!exam) {
      throw new NotFoundException("Exam not found");
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

  async getStats() {
    const totalExams = await this.examRepository.count();
    const draftExams = await this.examRepository.count({
      where: { status: ExamStatus.DRAFT },
    });
    const publishedExams = await this.examRepository.count({
      where: { status: ExamStatus.PUBLISHED },
    });
    const closedExams = await this.examRepository.count({
      where: { status: ExamStatus.CLOSED },
    });

    return {
      totalExams,
      draftExams,
      publishedExams,
      closedExams,
    };
  }

  async findActiveExams(): Promise<Exam[]> {
    return this.examRepository.find({
      where: {
        status: ExamStatus.PUBLISHED,
        isActive: true,
      },
      relations: ["sections"],
      order: { examDate: "ASC" },
    });
  }
}
