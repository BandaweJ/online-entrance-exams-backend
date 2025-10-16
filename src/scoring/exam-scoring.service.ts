import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ExamAttempt, AttemptStatus } from "../attempts/exam-attempt.entity";
import { Answer } from "../answers/answer.entity";
import { Question } from "../questions/question.entity";
import { AiGraderService } from "../ai-grader/ai-grader.service";
import { ScoringService } from "./scoring.service";
import { ScoreRequestDto } from "./dto/score-request.dto";

@Injectable()
export class ExamScoringService {
  constructor(
    @InjectRepository(ExamAttempt)
    private attemptRepository: Repository<ExamAttempt>,
    @InjectRepository(Answer)
    private answerRepository: Repository<Answer>,
    @InjectRepository(Question)
    private questionRepository: Repository<Question>,
    private aiGraderService: AiGraderService,
    private scoringService: ScoringService,
  ) {}

  async scoreExam(attemptId: string): Promise<{
    totalScore: number;
    totalMarks: number;
    percentage: number;
    gradedAnswers: Answer[];
  }> {
    // Get the attempt with all related data
    const attempt = await this.attemptRepository.findOne({
      where: { id: attemptId },
      relations: ["answers", "answers.question", "exam"],
    });

    if (!attempt) {
      throw new NotFoundException("Exam attempt not found");
    }

    if (attempt.status !== AttemptStatus.SUBMITTED) {
      throw new BadRequestException("Cannot score non-submitted attempt");
    }

    if (attempt.isGraded) {
      throw new BadRequestException("Exam has already been graded");
    }

    const answers = attempt.answers || [];
    const gradedAnswers: Answer[] = [];

    // Process each answer
    for (const answer of answers) {
      const gradedAnswer = await this.scoreAnswer(answer);
      gradedAnswers.push(gradedAnswer);
    }

    // Calculate totals
    const totalScore = gradedAnswers.reduce(
      (sum, answer) => sum + parseFloat(answer.score.toString()),
      0,
    );
    const totalMarks = gradedAnswers.reduce(
      (sum, answer) => sum + parseFloat(answer.maxScore.toString()),
      0,
    );
    const percentage = totalMarks > 0 ? (totalScore / totalMarks) * 100 : 0;

    // Update attempt with scores
    await this.attemptRepository.update(attemptId, {
      score: totalScore,
      totalMarks: totalMarks,
      percentage: percentage,
      isGraded: true,
    });

    return {
      totalScore,
      totalMarks,
      percentage,
      gradedAnswers,
    };
  }

  private async scoreAnswer(answer: Answer): Promise<Answer> {
    const question = answer.question;

    if (!question) {
      throw new NotFoundException("Question not found for answer");
    }

    let score = 0;
    let feedback = "";
    let isCorrect = false;

    // Handle different question types
    switch (question.type) {
      case "multiple_choice":
      case "true_false":
        const result = this.scoreObjectiveQuestion(answer, question);
        score = result.score;
        feedback = result.feedback;
        isCorrect = result.isCorrect;
        break;

      case "short_answer":
      case "essay":
        const aiResult = await this.scoreSubjectiveQuestion(answer, question);
        score = aiResult.score;
        feedback = aiResult.feedback;
        isCorrect = score > 0;
        break;

      default:
        console.warn(`Unknown question type: ${question.type}`);
        score = 0;
        feedback = "Unknown question type - not scored";
        isCorrect = false;
    }

    // Update answer with scoring results
    answer.score = score;
    answer.isCorrect = isCorrect;
    answer.isGraded = true;
    answer.feedback = feedback;

    const savedAnswer = await this.answerRepository.save(answer);

    return savedAnswer;
  }

  private scoreObjectiveQuestion(
    answer: Answer,
    question: Question,
  ): {
    score: number;
    feedback: string;
    isCorrect: boolean;
  } {
    const correctAnswer = question.correctAnswer;
    const studentAnswer =
      answer.answerText || answer.selectedOptions?.join(", ") || "";

    // Normalize answers for comparison
    const normalizedCorrect = this.normalizeAnswer(correctAnswer);
    const normalizedStudent = this.normalizeAnswer(studentAnswer);

    const isCorrect = normalizedCorrect === normalizedStudent;
    const score = isCorrect ? parseFloat(question.marks.toString()) : 0;
    const feedback = isCorrect ? "Correct answer!" : "Incorrect answer.";

    return { score, feedback, isCorrect };
  }

  private async scoreSubjectiveQuestion(
    answer: Answer,
    question: Question,
  ): Promise<{
    score: number;
    feedback: string;
  }> {
    const correctAnswer = question.correctAnswer;
    const studentAnswer = answer.answerText || "";

    if (!studentAnswer.trim()) {
      return {
        score: 0,
        feedback: "No answer provided.",
      };
    }

    // Use internal OpenAI-based scoring service
    const scoreRequest: ScoreRequestDto = {
      question: question.questionText,
      correctAnswerText: correctAnswer,
      studentAnswerText: studentAnswer,
      totalMarks: parseFloat(question.marks.toString()),
      questionType: question.type,
      rubric: question.explanation, // Use explanation as rubric if available
    };

    try {
      const scoreResponse =
        await this.scoringService.calculateSimilarityScore(scoreRequest);

      return {
        score: scoreResponse.score,
        feedback: scoreResponse.feedback || "Graded using OpenAI embeddings",
      };
    } catch (error) {
      console.error(
        `OpenAI scoring failed for question ${question.id}:`,
        error,
      );

      // Fallback to basic keyword matching
      return this.fallbackSubjectiveGrading(
        correctAnswer,
        studentAnswer,
        parseFloat(question.marks.toString()),
      );
    }
  }

  private fallbackSubjectiveGrading(
    correctAnswer: string,
    studentAnswer: string,
    totalMarks: number,
  ): {
    score: number;
    feedback: string;
  } {
    // Simple keyword-based grading as fallback
    const correctKeywords = correctAnswer
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 2);
    const studentKeywords = studentAnswer
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 2);

    const matchingKeywords = correctKeywords.filter((keyword) =>
      studentKeywords.some(
        (studentKeyword) =>
          studentKeyword.includes(keyword) || keyword.includes(studentKeyword),
      ),
    );

    const keywordMatchRatio =
      correctKeywords.length > 0
        ? matchingKeywords.length / correctKeywords.length
        : 0;

    const score = Math.round(totalMarks * keywordMatchRatio);

    let feedback = "";
    if (keywordMatchRatio >= 0.8) {
      feedback = "Good answer with most key points covered.";
    } else if (keywordMatchRatio >= 0.5) {
      feedback = "Partial answer with some key points covered.";
    } else if (keywordMatchRatio > 0) {
      feedback = "Answer partially correct but missing key points.";
    } else {
      feedback = "Answer does not match the expected response.";
    }

    return { score, feedback };
  }

  private normalizeAnswer(answer: string): string {
    return answer.toLowerCase().trim().replace(/\s+/g, " ");
  }

  async getScoringProgress(attemptId: string): Promise<{
    totalAnswers: number;
    gradedAnswers: number;
    progressPercentage: number;
  }> {
    const attempt = await this.attemptRepository.findOne({
      where: { id: attemptId },
      relations: ["answers"],
    });

    if (!attempt) {
      throw new NotFoundException("Exam attempt not found");
    }

    const answers = attempt.answers || [];
    const gradedAnswers = answers.filter((answer) => answer.isGraded).length;
    const progressPercentage =
      answers.length > 0 ? (gradedAnswers / answers.length) * 100 : 0;

    return {
      totalAnswers: answers.length,
      gradedAnswers,
      progressPercentage,
    };
  }

  async regradeAnswer(answerId: string): Promise<Answer> {
    const answer = await this.answerRepository.findOne({
      where: { id: answerId },
      relations: ["question"],
    });

    if (!answer) {
      throw new NotFoundException("Answer not found");
    }

    // Reset grading status
    answer.isGraded = false;
    answer.score = 0;
    answer.feedback = "";

    // Re-score the answer
    const gradedAnswer = await this.scoreAnswer(answer);

    return gradedAnswer;
  }
}
