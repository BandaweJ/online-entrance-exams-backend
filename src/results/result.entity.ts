import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Student } from '../students/student.entity';
import { Exam } from '../exams/exam.entity';
import { ExamAttempt } from '../attempts/exam-attempt.entity';

export enum Grade {
  A_PLUS = 'A+',
  A = 'A',
  B_PLUS = 'B+',
  B = 'B',
  C_PLUS = 'C+',
  C = 'C',
  D = 'D',
  F = 'F',
}

@Entity('results')
export class Result {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  score: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  totalMarks: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  percentage: number;

  @Column({
    type: 'enum',
    enum: Grade,
    nullable: true,
  })
  grade: Grade;

  @Column({ type: 'int' })
  rank: number;

  @Column({ type: 'int' })
  totalStudents: number;

  @Column({ type: 'int' })
  questionsAnswered: number;

  @Column({ type: 'int' })
  totalQuestions: number;

  @Column({ type: 'int' })
  correctAnswers: number;

  @Column({ type: 'int' })
  wrongAnswers: number;

  @Column({ type: 'int' })
  timeSpent: number; // in seconds

  @Column({ default: false })
  isPassed: boolean;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  passPercentage: number;

  @Column({ default: false })
  isPublished: boolean;

  @Column({ type: 'timestamp', nullable: true })
  publishedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Student, (student) => student.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: Student;

  @Column()
  studentId: string;

  @ManyToOne(() => Exam, (exam) => exam.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'examId' })
  exam: Exam;

  @Column()
  examId: string;

  @ManyToOne(() => ExamAttempt, (attempt) => attempt.results, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'attemptId' })
  attempt: ExamAttempt;

  @Column()
  attemptId: string;

  // Virtual field for formatted percentage
  get formattedPercentage(): string {
    return `${this.percentage.toFixed(2)}%`;
  }

  // Virtual field for formatted time spent
  get formattedTimeSpent(): string {
    const hours = Math.floor(this.timeSpent / 3600);
    const minutes = Math.floor((this.timeSpent % 3600) / 60);
    const seconds = this.timeSpent % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  // Virtual field for accuracy percentage
  get accuracyPercentage(): number {
    if (this.questionsAnswered === 0) return 0;
    return Math.round((this.correctAnswers / this.questionsAnswered) * 100);
  }

  // Virtual field for question results (not stored in database)
  questionResults?: any[];
}
