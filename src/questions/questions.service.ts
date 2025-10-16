import {
  Injectable,
  NotFoundException,
  BadRequestException,
  forwardRef,
  Inject,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Question, QuestionType } from "./question.entity";
import { Section } from "../exams/section.entity";
import { CreateQuestionDto } from "./dto/create-question.dto";
import { UpdateQuestionDto } from "./dto/update-question.dto";
import { ExamsService } from "../exams/exams.service";

@Injectable()
export class QuestionsService {
  constructor(
    @InjectRepository(Question)
    private questionRepository: Repository<Question>,
    @InjectRepository(Section)
    private sectionRepository: Repository<Section>,
    @Inject(forwardRef(() => ExamsService))
    private examsService: ExamsService,
  ) {}

  async create(
    createQuestionDto: CreateQuestionDto,
    sectionId: string,
  ): Promise<Question> {
    const section = await this.sectionRepository.findOne({
      where: { id: sectionId },
      relations: ["exam"],
    });

    if (!section) {
      throw new NotFoundException("Section not found");
    }

    // Prevent adding questions to published exams
    if (section.exam.status === "published") {
      throw new BadRequestException("Cannot add questions to published exam");
    }

    // Validate question type specific requirements
    this.validateQuestionData(createQuestionDto);

    const question = this.questionRepository.create({
      ...createQuestionDto,
      section: { id: sectionId } as any,
    });

    const savedQuestion = await this.questionRepository.save(question);

    // Recalculate section marks and question count
    await this.recalculateSectionStats(sectionId);

    return savedQuestion;
  }

  async findAll(sectionId: string): Promise<Question[]> {
    return this.questionRepository.find({
      where: { sectionId },
      order: { order: "ASC" },
    });
  }

  async findOne(id: string): Promise<Question> {
    const question = await this.questionRepository.findOne({
      where: { id },
      relations: ["section", "section.exam"],
    });

    if (!question) {
      throw new NotFoundException("Question not found");
    }

    return question;
  }

  async update(
    id: string,
    updateQuestionDto: UpdateQuestionDto,
  ): Promise<Question> {
    const question = await this.findOne(id);

    // Prevent updating questions of published exams
    if (question.section.exam.status === "published") {
      throw new BadRequestException("Cannot update question of published exam");
    }

    // Validate question type specific requirements
    this.validateQuestionData({ ...question, ...updateQuestionDto });

    Object.assign(question, updateQuestionDto);
    const savedQuestion = await this.questionRepository.save(question);

    // Recalculate section stats
    await this.recalculateSectionStats(question.sectionId);

    return savedQuestion;
  }

  async remove(id: string): Promise<void> {
    const question = await this.findOne(id);

    // Prevent deleting questions of published exams
    if (question.section.exam.status === "published") {
      throw new BadRequestException("Cannot delete question of published exam");
    }

    await this.questionRepository.remove(question);

    // Recalculate section stats
    await this.recalculateSectionStats(question.sectionId);
  }

  async updateOrder(id: string, newOrder: number): Promise<Question> {
    const question = await this.findOne(id);

    // Prevent updating order of published exams
    if (question.section.exam.status === "published") {
      throw new BadRequestException(
        "Cannot update question order of published exam",
      );
    }

    question.order = newOrder;
    return this.questionRepository.save(question);
  }

  async duplicate(id: string): Promise<Question> {
    const originalQuestion = await this.findOne(id);

    // Prevent duplicating questions of published exams
    if (originalQuestion.section.exam.status === "published") {
      throw new BadRequestException(
        "Cannot duplicate question of published exam",
      );
    }

    const duplicatedQuestion = this.questionRepository.create({
      questionText: originalQuestion.questionText,
      type: originalQuestion.type,
      options: originalQuestion.options,
      correctAnswer: originalQuestion.correctAnswer,
      marks: originalQuestion.marks,
      order: originalQuestion.order + 1,
      explanation: originalQuestion.explanation,
      section: { id: originalQuestion.sectionId } as any,
    });

    const savedQuestion =
      await this.questionRepository.save(duplicatedQuestion);

    // Recalculate section stats
    await this.recalculateSectionStats(originalQuestion.sectionId);

    return savedQuestion;
  }

  private validateQuestionData(questionData: any): void {
    const { type, options, correctAnswer } = questionData;

    switch (type) {
      case QuestionType.MULTIPLE_CHOICE:
        if (!options || options.length < 2) {
          throw new BadRequestException(
            "Multiple choice questions must have at least 2 options",
          );
        }
        if (!correctAnswer) {
          throw new BadRequestException(
            "Multiple choice questions must have a correct answer",
          );
        }
        break;

      case QuestionType.TRUE_FALSE:
        if (correctAnswer !== "true" && correctAnswer !== "false") {
          throw new BadRequestException(
            'True/False questions must have correct answer as "true" or "false"',
          );
        }
        break;

      case QuestionType.SHORT_ANSWER:
      case QuestionType.ESSAY:
        if (!correctAnswer || correctAnswer.trim().length === 0) {
          throw new BadRequestException(
            "Short answer and essay questions must have a correct answer",
          );
        }
        break;
    }
  }

  private async recalculateSectionStats(sectionId: string): Promise<void> {
    const section = await this.sectionRepository.findOne({
      where: { id: sectionId },
      relations: ["exam"],
    });

    if (!section) {
      return;
    }

    const questions = await this.questionRepository.find({
      where: { sectionId },
    });

    const totalMarks = questions.reduce(
      (sum, question) => sum + parseFloat(question.marks.toString()),
      0,
    );
    const questionCount = questions.length;

    await this.sectionRepository.update(sectionId, {
      totalMarks,
      questionCount,
    });

    // Also recalculate exam stats
    await this.examsService.recalculateExamStats(section.exam.id);
  }

  async getQuestionStats(sectionId: string) {
    const questions = await this.questionRepository.find({
      where: { sectionId },
    });

    const stats = {
      totalQuestions: questions.length,
      totalMarks: questions.reduce(
        (sum, q) => sum + parseFloat(q.marks.toString()),
        0,
      ),
      byType: {
        multipleChoice: questions.filter(
          (q) => q.type === QuestionType.MULTIPLE_CHOICE,
        ).length,
        trueFalse: questions.filter((q) => q.type === QuestionType.TRUE_FALSE)
          .length,
        shortAnswer: questions.filter(
          (q) => q.type === QuestionType.SHORT_ANSWER,
        ).length,
        essay: questions.filter((q) => q.type === QuestionType.ESSAY).length,
      },
    };

    return stats;
  }
}
