import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, MoreThan } from "typeorm";
import { Result, Grade } from "./result.entity";
import { ExamAttempt, AttemptStatus } from "../attempts/exam-attempt.entity";
import { Answer } from "../answers/answer.entity";
import { Student } from "../students/student.entity";
import { Exam } from "../exams/exam.entity";
import { ExamScoringService } from "../scoring/exam-scoring.service";

@Injectable()
export class ResultsService {
  constructor(
    @InjectRepository(Result)
    private resultRepository: Repository<Result>,
    @InjectRepository(ExamAttempt)
    private attemptRepository: Repository<ExamAttempt>,
    @InjectRepository(Answer)
    private answerRepository: Repository<Answer>,
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    @InjectRepository(Exam)
    private examRepository: Repository<Exam>,
    private examScoringService: ExamScoringService,
  ) {}

  async generateResult(attemptId: string, studentId: string): Promise<Result> {
    const attempt = await this.attemptRepository.findOne({
      where: { id: attemptId, studentId },
      relations: ["exam", "exam.sections", "exam.sections.questions", "student", "answers", "answers.question"],
    });

    if (!attempt) {
      throw new NotFoundException("Attempt not found");
    }

    if (attempt.status !== AttemptStatus.SUBMITTED) {
      throw new BadRequestException(
        "Cannot generate result for non-submitted attempt",
      );
    }

    // Check if result already exists
    const existingResult = await this.resultRepository.findOne({
      where: { attemptId },
    });

    if (existingResult) {
      return existingResult;
    }

    // Check if attempt is already graded by looking for existing result
    // (The isGraded field on attempt is not currently being used properly)

    // Score the exam using the new scoring system
    const scoringResult = await this.examScoringService.scoreExam(attemptId);

    // Use the scored results
    const totalMarks = scoringResult.totalMarks;
    const score = scoringResult.totalScore;
    const percentage = scoringResult.percentage;

    // Calculate statistics from graded answers
    const gradedAnswers = scoringResult.gradedAnswers;
    const questionsAnswered = gradedAnswers.length;
    
    // Calculate total questions from ALL sections of the exam, not just from attempt
    const allExamQuestions = attempt.exam.sections?.flatMap(section => section.questions || []) || [];
    const totalQuestions = allExamQuestions.length;
    
    const correctAnswers = gradedAnswers.filter((a) => a.isCorrect).length;
    const wrongAnswers = questionsAnswered - correctAnswers;

    // Determine grade
    const grade = this.calculateGrade(percentage);

    // Calculate rank
    const rank = await this.calculateRank(attempt.examId, score);

    // Check if passed (assuming 50% is passing)
    const passPercentage = 50;
    const isPassed = percentage >= passPercentage;

    // Generate question results for detailed review
    const questionResults = await this.generateQuestionResults(
      attempt,
      gradedAnswers,
    );

    // Create result
    const result = this.resultRepository.create({
      studentId: attempt.studentId,
      examId: attempt.examId,
      attemptId: attempt.id,
      score,
      totalMarks,
      percentage,
      grade,
      rank,
      totalStudents: await this.getTotalStudentsForExam(attempt.examId),
      questionsAnswered,
      totalQuestions,
      correctAnswers,
      wrongAnswers,
      timeSpent: attempt.timeSpent,
      isPassed,
      passPercentage,
      isPublished: true, // Make results immediately available to students
    });

    const savedResult = await this.resultRepository.save(result);

    // Mark the attempt as graded
    attempt.isGraded = true;
    await this.attemptRepository.save(attempt);


    // Create a new object with questionResults included
    const resultWithQuestionResults = {
      ...savedResult,
      questionResults: questionResults,
    } as Result;

    return resultWithQuestionResults;
  }

  async findAll(studentId?: string, examId?: string): Promise<Result[]> {
    const whereCondition: any = {};
    if (studentId) whereCondition.studentId = studentId;
    if (examId) whereCondition.examId = examId;

    const results = await this.resultRepository.find({
      where: whereCondition,
      relations: ["student", "exam", "attempt"],
      order: { createdAt: "DESC" },
    });
    
    return results;
  }

  async findOne(id: string): Promise<Result> {
    const result = await this.resultRepository.findOne({
      where: { id },
      relations: [
        "student",
        "exam",
        "attempt",
        "attempt.answers",
        "attempt.answers.question",
      ],
    });

    if (!result) {
      throw new NotFoundException("Result not found");
    }

    // Generate question results for detailed review
    if (result.attempt && result.attempt.answers) {
      const gradedAnswers = result.attempt.answers.filter(
        (answer) => answer.isGraded,
      );
      const questionResults = await this.generateQuestionResults(
        result.attempt,
        gradedAnswers,
      );

      // Create a new object with questionResults included
      const resultWithQuestionResults = {
        ...result,
        questionResults: questionResults,
      } as Result;

      return resultWithQuestionResults;
    } else {
      return result;
    }
  }

  async findByAttempt(attemptId: string): Promise<Result | null> {
    return this.resultRepository.findOne({
      where: { attemptId },
      relations: ["student", "exam", "attempt"],
    });
  }

  async findAttemptById(attemptId: string): Promise<ExamAttempt | null> {
    return this.attemptRepository.findOne({
      where: { id: attemptId },
      relations: ["student", "exam"],
    });
  }

  async publishResult(id: string): Promise<Result> {
    const result = await this.findOne(id);

    result.isPublished = true;
    result.publishedAt = new Date();

    return this.resultRepository.save(result);
  }

  async getExamResults(examId: string): Promise<Result[]> {
    return this.resultRepository.find({
      where: { examId, isPublished: true },
      relations: ["student"],
      order: { score: "DESC" },
    });
  }

  async getStudentResults(studentId: string): Promise<Result[]> {
    try {
      const results = await this.resultRepository.find({
        where: { studentId },
        relations: ["exam", "student", "attempt"],
        order: { createdAt: "DESC" },
      });
      return results;
    } catch (error) {
      throw error;
    }
  }

  async getExamStats(examId: string) {
    const results = await this.resultRepository.find({
      where: { examId },
      relations: ["student"],
    });

    if (results.length === 0) {
      return {
        totalStudents: 0,
        averageScore: 0,
        highestScore: 0,
        lowestScore: 0,
        averagePercentage: 0,
        passRate: 0,
        gradeDistribution: {},
      };
    }

    const scores = results.map((r) => r.score);
    const percentages = results.map((r) => r.percentage);
    const passedCount = results.filter((r) => r.isPassed).length;

    const stats = {
      totalStudents: results.length,
      averageScore:
        scores.reduce((sum, score) => sum + score, 0) / scores.length,
      highestScore: Math.max(...scores),
      lowestScore: Math.min(...scores),
      averagePercentage:
        percentages.reduce((sum, percentage) => sum + percentage, 0) /
        percentages.length,
      passRate: (passedCount / results.length) * 100,
      gradeDistribution: this.calculateGradeDistribution(results),
    };

    return stats;
  }

  async getStudentStats(studentId: string) {
    const results = await this.resultRepository.find({
      where: { studentId },
      relations: ["exam"],
    });

    const stats = {
      totalExams: results.length,
      averageScore: 0,
      averagePercentage: 0,
      totalTimeSpent: 0,
      examsPassed: results.filter((r) => r.isPassed).length,
      bestGrade: null as Grade | null,
      recentExams: results.slice(0, 5),
    };

    if (results.length > 0) {
      stats.averageScore =
        results.reduce((sum, r) => sum + r.score, 0) / results.length;
      stats.averagePercentage =
        results.reduce((sum, r) => sum + r.percentage, 0) / results.length;
      stats.totalTimeSpent = results.reduce((sum, r) => sum + r.timeSpent, 0);
      stats.bestGrade = this.getBestGrade(results);
    }

    return stats;
  }

  private calculateGrade(percentage: number): Grade {
    if (percentage >= 95) return Grade.A_PLUS;
    if (percentage >= 90) return Grade.A;
    if (percentage >= 85) return Grade.B_PLUS;
    if (percentage >= 80) return Grade.B;
    if (percentage >= 75) return Grade.C_PLUS;
    if (percentage >= 70) return Grade.C;
    if (percentage >= 60) return Grade.D;
    return Grade.F;
  }

  private async generateQuestionResults(
    attempt: ExamAttempt,
    gradedAnswers: Answer[],
  ): Promise<any[]> {
    const questionResults = [];

    for (const answer of gradedAnswers) {
      if (answer.question) {
        const questionResult = {
          questionId: answer.questionId,
          questionText: answer.question.questionText,
          studentAnswer: this.formatStudentAnswer(answer),
          correctAnswer: this.formatCorrectAnswer(answer.question),
          isCorrect: answer.isCorrect,
          marksObtained: answer.score || 0,
          totalMarks: answer.maxScore || answer.question.marks,
          explanation: answer.question.explanation || answer.feedback,
        };
        questionResults.push(questionResult);
      }
    }

    return questionResults;
  }

  private formatStudentAnswer(answer: Answer): string {
    if (answer.answerText) {
      return answer.answerText;
    }

    if (answer.selectedOptions && Array.isArray(answer.selectedOptions)) {
      return answer.selectedOptions.join(", ");
    }

    return "No answer provided";
  }

  private formatCorrectAnswer(question: any): string {
    if (question.correctAnswer) {
      if (typeof question.correctAnswer === "string") {
        return question.correctAnswer;
      }

      if (Array.isArray(question.correctAnswer)) {
        return question.correctAnswer.join(", ");
      }
    }

    return "No correct answer available";
  }

  private async calculateRank(examId: string, score: number): Promise<number> {
    // Count results with higher scores for this exam
    const betterResults = await this.resultRepository.count({
      where: { examId, score: MoreThan(score) },
    });
    return betterResults + 1;
  }

  private async getTotalStudentsForExam(examId: string): Promise<number> {
    // Count unique students who have submitted attempts for this exam
    const uniqueStudents = await this.attemptRepository
      .createQueryBuilder('attempt')
      .select('COUNT(DISTINCT attempt.studentId)', 'count')
      .where('attempt.examId = :examId', { examId })
      .andWhere('attempt.status = :status', { status: AttemptStatus.SUBMITTED })
      .getRawOne();
    
    return parseInt(uniqueStudents.count) || 0;
  }

  private calculateGradeDistribution(
    results: Result[],
  ): Record<string, number> {
    const distribution: Record<string, number> = {};

    Object.values(Grade).forEach((grade) => {
      distribution[grade] = results.filter((r) => r.grade === grade).length;
    });

    return distribution;
  }

  private getBestGrade(results: Result[]): Grade | null {
    if (results.length === 0) return null;

    const gradeOrder = [
      Grade.A_PLUS,
      Grade.A,
      Grade.B_PLUS,
      Grade.B,
      Grade.C_PLUS,
      Grade.C,
      Grade.D,
      Grade.F,
    ];

    for (const grade of gradeOrder) {
      if (results.some((r) => r.grade === grade)) {
        return grade;
      }
    }

    return null;
  }
}
