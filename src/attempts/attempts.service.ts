import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Like } from "typeorm";
import { ExamAttempt, AttemptStatus } from "./exam-attempt.entity";
import { Student } from "../students/student.entity";
import { Exam } from "../exams/exam.entity";
import { User } from "../users/user.entity";
import { CreateAttemptDto } from "./dto/create-attempt.dto";
import { UpdateAttemptDto } from "./dto/update-attempt.dto";
import { AddCheatingViolationDto, CheatingWarningResponseDto } from "./dto/cheating-violation.dto";
import { ExamScoringService } from "../scoring/exam-scoring.service";
import { ResultsService } from "../results/results.service";

@Injectable()
export class AttemptsService {
  constructor(
    @InjectRepository(ExamAttempt)
    private attemptRepository: Repository<ExamAttempt>,
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    @InjectRepository(Exam)
    private examRepository: Repository<Exam>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private examScoringService: ExamScoringService,
    @Inject(forwardRef(() => ResultsService))
    private resultsService: ResultsService,
  ) {}

  async create(
    createAttemptDto: CreateAttemptDto,
    userId: string,
  ): Promise<ExamAttempt> {
    const { examId } = createAttemptDto;

    // First, get the user to check their role and get their email
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (user.role !== "student") {
      throw new BadRequestException("Only students can create exam attempts");
    }

    // Try to find student by user ID first, then by email
    let student = await this.studentRepository.findOne({
      where: { id: userId },
    });
    if (!student) {
      student = await this.studentRepository.findOne({
        where: { email: user.email },
      });
    }

    // If still no student found, create one automatically
    if (!student) {
      const studentId = await this.generateStudentId();
      student = this.studentRepository.create({
        id: userId, // Use the same ID as the user
        studentId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        createdBy: userId, // Self-created
      });
      student = await this.studentRepository.save(student);
    }

    // Check if exam exists and is published
    const exam = await this.examRepository.findOne({
      where: { id: examId },
      relations: ["sections"],
    });
    if (!exam) {
      throw new NotFoundException("Exam not found");
    }

    if (exam.status !== "published") {
      throw new BadRequestException("Exam is not available for attempts");
    }

    // Check if student already has an attempt for this exam
    const existingAttempt = await this.attemptRepository.findOne({
      where: { studentId: student.id, examId },
    });

    if (existingAttempt) {
      if (existingAttempt.status === AttemptStatus.SUBMITTED) {
        throw new BadRequestException(
          "Student has already submitted this exam and cannot retake it",
        );
      }
      throw new BadRequestException(
        "Student already has an attempt for this exam",
      );
    }

    // Create new attempt
    const attempt = this.attemptRepository.create({
      studentId: student.id,
      examId,
      status: AttemptStatus.IN_PROGRESS,
      startedAt: new Date(),
      totalQuestions: exam.totalQuestions,
    });

    return this.attemptRepository.save(attempt);
  }

  async findAll(studentId: string): Promise<ExamAttempt[]> {
    return this.attemptRepository.find({
      where: { studentId },
      relations: ["exam", "student"],
      order: { createdAt: "DESC" },
    });
  }

  async findAllForAdmin(): Promise<ExamAttempt[]> {
    return this.attemptRepository.find({
      relations: ["exam", "student"],
      order: { createdAt: "DESC" },
    });
  }

  async findOne(id: string, studentId: string): Promise<ExamAttempt> {
    const attempt = await this.attemptRepository.findOne({
      where: { id, studentId },
      relations: ["exam", "student", "answers", "answers.question"],
    });

    if (!attempt) {
      throw new NotFoundException("Attempt not found");
    }

    return attempt;
  }

  async update(
    id: string,
    updateAttemptDto: UpdateAttemptDto,
    studentId: string,
  ): Promise<ExamAttempt> {
    const attempt = await this.findOne(id, studentId);

    // Prevent updating submitted attempts
    if (attempt.status === AttemptStatus.SUBMITTED) {
      throw new BadRequestException("Cannot update submitted attempt");
    }

    // Filter out null/undefined values to prevent database constraint violations
    const filteredUpdate = Object.fromEntries(
      Object.entries(updateAttemptDto).filter(
        ([, value]) => value !== null && value !== undefined,
      ),
    );

    Object.assign(attempt, filteredUpdate);
    return this.attemptRepository.save(attempt);
  }

  async pause(id: string, studentId: string): Promise<ExamAttempt> {
    const attempt = await this.findOne(id, studentId);

    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new BadRequestException("Only in-progress attempts can be paused");
    }

    attempt.status = AttemptStatus.PAUSED;
    attempt.pausedAt = new Date();

    // Calculate time spent so far
    if (attempt.startedAt) {
      const timeSpent = Math.floor(
        (Date.now() - attempt.startedAt.getTime()) / 1000,
      );
      attempt.timeSpent += timeSpent;
    }

    return this.attemptRepository.save(attempt);
  }

  async resume(id: string, studentId: string): Promise<ExamAttempt> {
    const attempt = await this.findOne(id, studentId);

    if (attempt.status !== AttemptStatus.PAUSED) {
      throw new BadRequestException("Only paused attempts can be resumed");
    }

    attempt.status = AttemptStatus.IN_PROGRESS;
    attempt.resumedAt = new Date();
    attempt.startedAt = new Date(); // Reset start time for remaining duration

    return this.attemptRepository.save(attempt);
  }

  async submit(id: string, studentId: string): Promise<ExamAttempt> {
    const attempt = await this.findOne(id, studentId);

    if (attempt.status === AttemptStatus.SUBMITTED) {
      throw new BadRequestException("Attempt already submitted");
    }

    // Calculate final time spent
    if (attempt.startedAt) {
      const timeSpent = Math.floor(
        (Date.now() - attempt.startedAt.getTime()) / 1000,
      );
      attempt.timeSpent += timeSpent;
    }

    attempt.status = AttemptStatus.SUBMITTED;
    attempt.submittedAt = new Date();

    const savedAttempt = await this.attemptRepository.save(attempt);

    // Generate result immediately after submission
    try {
      await this.triggerAutomaticScoring(id);
    } catch (error) {
      // Don't throw error - submission was successful, just result generation failed
    }

    return savedAttempt;
  }

  private async triggerAutomaticScoring(attemptId: string): Promise<void> {
    try {
      await this.examScoringService.scoreExam(attemptId);

      // Generate result after scoring is complete
      const attempt = await this.attemptRepository.findOne({
        where: { id: attemptId },
        relations: ["student"],
      });

      if (attempt) {
        await this.resultsService.generateResult(attemptId, attempt.studentId);
      }
    } catch (error) {
      throw error;
    }
  }

  async getCurrentAttempt(
    studentId: string,
    examId: string,
  ): Promise<ExamAttempt | null> {
    return this.attemptRepository.findOne({
      where: {
        studentId,
        examId,
        status: AttemptStatus.IN_PROGRESS,
      },
      relations: ["exam", "answers", "answers.question"],
    });
  }

  async getAttemptStats(studentId: string) {
    const attempts = await this.attemptRepository.find({
      where: { studentId },
      relations: ["exam"],
    });

    const stats = {
      totalAttempts: attempts.length,
      completedAttempts: attempts.filter(
        (a) => a.status === AttemptStatus.SUBMITTED,
      ).length,
      inProgressAttempts: attempts.filter(
        (a) => a.status === AttemptStatus.IN_PROGRESS,
      ).length,
      pausedAttempts: attempts.filter((a) => a.status === AttemptStatus.PAUSED)
        .length,
      averageScore: 0,
      totalTimeSpent: 0,
    };

    const completedAttempts = attempts.filter(
      (a) => a.status === AttemptStatus.SUBMITTED,
    );
    if (completedAttempts.length > 0) {
      stats.averageScore =
        completedAttempts.reduce((sum, a) => sum + a.score, 0) /
        completedAttempts.length;
      stats.totalTimeSpent = attempts.reduce((sum, a) => sum + a.timeSpent, 0);
    }

    return stats;
  }

  async checkTimeRemaining(
    attemptId: string,
    studentId: string,
  ): Promise<number> {
    const attempt = await this.findOne(attemptId, studentId);

    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      return 0;
    }

    const examDuration = attempt.exam.durationMinutes * 60; // Convert to seconds
    const elapsed = Math.floor(
      (Date.now() - attempt.startedAt.getTime()) / 1000,
    );
    const remaining = Math.max(0, examDuration - elapsed - attempt.timeSpent);

    // Auto-submit if time is up
    if (remaining <= 0) {
      attempt.status = AttemptStatus.TIMED_OUT;
      attempt.submittedAt = new Date();
      await this.attemptRepository.save(attempt);
    }

    return remaining;
  }

  private async generateStudentId(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `STU${year}`;

    // Find the last student ID for this year
    const lastStudent = await this.studentRepository.findOne({
      where: { studentId: Like(`${prefix}%`) },
      order: { studentId: "DESC" },
    });

    let nextNumber = 1;
    if (lastStudent) {
      const lastNumber = parseInt(lastStudent.studentId.replace(prefix, ""));
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(4, "0")}`;
  }

  // Anti-cheating methods
  async addCheatingViolation(
    attemptId: string,
    violationDto: AddCheatingViolationDto,
  ): Promise<CheatingWarningResponseDto> {
    const attempt = await this.attemptRepository.findOne({
      where: { id: attemptId },
    });

    if (!attempt) {
      throw new NotFoundException("Exam attempt not found");
    }

    if (attempt.status === AttemptStatus.SUBMITTED) {
      throw new BadRequestException("Cannot add violations to submitted exam");
    }

    // Create violation record
    const violation = {
      type: violationDto.type,
      description: violationDto.description,
      timestamp: new Date().toISOString(),
      metadata: violationDto.metadata || {},
    };

    // Get existing violations or initialize empty array
    const existingViolations = attempt.cheatingViolations || [];
    existingViolations.push(violation);

    // Increment warning count
    const newWarningCount = attempt.cheatingWarnings + 1;

    // Update attempt
    await this.attemptRepository.update(attemptId, {
      cheatingWarnings: newWarningCount,
      cheatingViolations: existingViolations,
    });

    // Get updated attempt
    const updatedAttempt = await this.attemptRepository.findOne({
      where: { id: attemptId },
    });

    return {
      warningCount: updatedAttempt!.cheatingWarnings,
      maxWarnings: updatedAttempt!.maxCheatingWarnings,
      remainingWarnings: updatedAttempt!.remainingCheatingWarnings,
      shouldAutoSubmit: updatedAttempt!.shouldAutoSubmit,
      violations: existingViolations,
    };
  }

  async getCheatingWarnings(attemptId: string): Promise<CheatingWarningResponseDto> {
    const attempt = await this.attemptRepository.findOne({
      where: { id: attemptId },
    });

    if (!attempt) {
      throw new NotFoundException("Exam attempt not found");
    }

    return {
      warningCount: attempt.cheatingWarnings,
      maxWarnings: attempt.maxCheatingWarnings,
      remainingWarnings: attempt.remainingCheatingWarnings,
      shouldAutoSubmit: attempt.shouldAutoSubmit,
      violations: attempt.cheatingViolations || [],
    };
  }

  async resetCheatingWarnings(attemptId: string): Promise<void> {
    await this.attemptRepository.update(attemptId, {
      cheatingWarnings: 0,
      cheatingViolations: [],
    });
  }
}
