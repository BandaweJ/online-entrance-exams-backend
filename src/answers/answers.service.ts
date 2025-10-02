import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Answer } from './answer.entity';
import { Question } from '../questions/question.entity';
import { ExamAttempt, AttemptStatus } from '../attempts/exam-attempt.entity';
import { Student } from '../students/student.entity';
import { CreateAnswerDto } from './dto/create-answer.dto';
import { UpdateAnswerDto } from './dto/update-answer.dto';

@Injectable()
export class AnswersService {
  constructor(
    @InjectRepository(Answer)
    private answerRepository: Repository<Answer>,
    @InjectRepository(Question)
    private questionRepository: Repository<Question>,
    @InjectRepository(ExamAttempt)
    private attemptRepository: Repository<ExamAttempt>,
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
  ) {}

  async create(createAnswerDto: CreateAnswerDto, studentId: string): Promise<Answer> {
    const { questionId, attemptId, answerText, selectedOptions } = createAnswerDto;

    // Verify student exists
    const student = await this.studentRepository.findOne({ where: { id: studentId } });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Verify question exists
    const question = await this.questionRepository.findOne({
      where: { id: questionId },
      relations: ['section', 'section.exam'],
    });
    if (!question) {
      throw new NotFoundException('Question not found');
    }

    // Verify attempt exists and belongs to student
    const attempt = await this.attemptRepository.findOne({
      where: { id: attemptId, studentId },
      relations: ['exam'],
    });
    if (!attempt) {
      throw new NotFoundException('Attempt not found');
    }

    // Check if attempt is still active
    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new BadRequestException('Cannot submit answers to inactive attempt');
    }

    // Check if question belongs to the same exam as the attempt
    if (question.section.exam.id !== attempt.examId) {
      throw new BadRequestException('Question does not belong to the same exam');
    }

    // Check if answer already exists
    const existingAnswer = await this.answerRepository.findOne({
      where: { questionId, attemptId, studentId },
    });

    if (existingAnswer) {
      // Update existing answer
      return this.update(existingAnswer.id, createAnswerDto, studentId);
    }

    // Create new answer
    const answer = this.answerRepository.create({
      ...createAnswerDto,
      studentId,
      maxScore: question.marks,
    });

    const savedAnswer = await this.answerRepository.save(answer);

    // Update attempt's questions answered count
    await this.updateAttemptProgress(attemptId);

    return savedAnswer;
  }

  async findAll(attemptId: string, studentId: string): Promise<Answer[]> {
    return this.answerRepository.find({
      where: { attemptId, studentId },
      relations: ['question', 'question.section'],
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(id: string, studentId: string): Promise<Answer> {
    const answer = await this.answerRepository.findOne({
      where: { id, studentId },
      relations: ['question', 'question.section', 'attempt'],
    });

    if (!answer) {
      throw new NotFoundException('Answer not found');
    }

    return answer;
  }

  async update(id: string, updateAnswerDto: UpdateAnswerDto, studentId: string): Promise<Answer> {
    const answer = await this.findOne(id, studentId);

    // Check if attempt is still active
    if (answer.attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new BadRequestException('Cannot update answers for inactive attempt');
    }

    Object.assign(answer, updateAnswerDto);
    return this.answerRepository.save(answer);
  }

  async remove(id: string, studentId: string): Promise<void> {
    const answer = await this.findOne(id, studentId);

    // Check if attempt is still active
    if (answer.attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new BadRequestException('Cannot delete answers for inactive attempt');
    }

    await this.answerRepository.remove(answer);
    
    // Update attempt's questions answered count
    await this.updateAttemptProgress(answer.attemptId);
  }

  async getAnswerStats(attemptId: string, studentId: string) {
    const answers = await this.answerRepository.find({
      where: { attemptId, studentId },
      relations: ['question'],
    });

    const stats = {
      totalAnswers: answers.length,
      answeredQuestions: answers.length,
      correctAnswers: answers.filter(a => a.isCorrect).length,
      totalScore: answers.reduce((sum, a) => sum + parseFloat(a.score.toString()), 0),
      totalMarks: answers.reduce((sum, a) => sum + parseFloat(a.maxScore.toString()), 0),
      byQuestionType: {
        multipleChoice: answers.filter(a => a.question.type === 'multiple_choice').length,
        trueFalse: answers.filter(a => a.question.type === 'true_false').length,
        shortAnswer: answers.filter(a => a.question.type === 'short_answer').length,
        essay: answers.filter(a => a.question.type === 'essay').length,
      },
    };

    return stats;
  }

  async getQuestionAnswer(questionId: string, attemptId: string, studentId: string): Promise<Answer | null> {
    return this.answerRepository.findOne({
      where: { questionId, attemptId, studentId },
      relations: ['question'],
    });
  }

  async markAnswer(id: string, score: number, feedback?: string): Promise<Answer> {
    const answer = await this.answerRepository.findOne({ where: { id } });
    if (!answer) {
      throw new NotFoundException('Answer not found');
    }

    answer.score = score;
    answer.isGraded = true;
    answer.feedback = feedback;
    answer.isCorrect = score > 0;

    return this.answerRepository.save(answer);
  }

  private async updateAttemptProgress(attemptId: string): Promise<void> {
    const answerCount = await this.answerRepository.count({
      where: { attemptId },
    });

    await this.attemptRepository.update(attemptId, {
      questionsAnswered: answerCount,
    });
  }

  async getUnansweredQuestions(attemptId: string, studentId: string) {
    // Get all questions for the exam
    const attempt = await this.attemptRepository.findOne({
      where: { id: attemptId, studentId },
      relations: ['exam', 'exam.sections', 'exam.sections.questions'],
    });

    if (!attempt) {
      throw new NotFoundException('Attempt not found');
    }

    // Get all answered question IDs
    const answeredQuestions = await this.answerRepository.find({
      where: { attemptId, studentId },
      select: ['questionId'],
    });

    const answeredQuestionIds = answeredQuestions.map(a => a.questionId);

    // Find unanswered questions
    const allQuestions = attempt.exam.sections.flatMap(section => section.questions);
    const unansweredQuestions = allQuestions.filter(
      question => !answeredQuestionIds.includes(question.id)
    );

    return unansweredQuestions.map(question => ({
      id: question.id,
      questionText: question.questionText,
      type: question.type,
      marks: question.marks,
      order: question.order,
      sectionTitle: question.section.title,
    }));
  }
}
