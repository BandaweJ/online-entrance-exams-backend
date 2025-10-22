import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from "typeorm";
import { Student } from "../students/student.entity";
import { Exam } from "../exams/exam.entity";
import { Answer } from "../answers/answer.entity";
import { Result } from "../results/result.entity";

export enum AttemptStatus {
  IN_PROGRESS = "in_progress",
  PAUSED = "paused",
  SUBMITTED = "submitted",
  TIMED_OUT = "timed_out",
  DISQUALIFIED = "disqualified",
}

@Entity("exam_attempts")
export class ExamAttempt {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({
    type: "enum",
    enum: AttemptStatus,
    default: AttemptStatus.IN_PROGRESS,
  })
  status: AttemptStatus;

  @Column({ type: "timestamp", nullable: true })
  startedAt: Date;

  @Column({ type: "timestamp", nullable: true })
  submittedAt: Date;

  @Column({ type: "timestamp", nullable: true })
  pausedAt: Date;

  @Column({ type: "timestamp", nullable: true })
  resumedAt: Date;

  @Column({ type: "int", default: 0 })
  timeSpent: number; // in seconds

  @Column({ type: "int", default: 0 })
  questionsAnswered: number;

  @Column({ type: "int", default: 0 })
  totalQuestions: number;

  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 })
  score: number;

  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 })
  totalMarks: number;

  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 })
  percentage: number;

  @Column({ default: false })
  isGraded: boolean;

  @Column({ type: "int", default: 0 })
  cheatingWarnings: number;

  @Column({ type: "int", default: 3 })
  maxCheatingWarnings: number;

  @Column({ type: "json", nullable: true })
  cheatingViolations: any[]; // Store details of each violation

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Student, (student) => student.examAttempts, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "studentId" })
  student: Student;

  @Column()
  studentId: string;

  @ManyToOne(() => Exam, (exam) => exam.attempts, { onDelete: "CASCADE" })
  @JoinColumn({ name: "examId" })
  exam: Exam;

  @Column()
  examId: string;

  @OneToMany(() => Answer, (answer) => answer.attempt)
  answers: Answer[];

  @OneToMany(() => Result, (result) => result.attempt)
  results: Result[];

  // Virtual field for time remaining
  get timeRemaining(): number {
    if (!this.startedAt || this.status === AttemptStatus.SUBMITTED) {
      return 0;
    }
    const examDuration = this.exam.durationMinutes * 60; // Convert to seconds
    const elapsed = Math.floor((Date.now() - this.startedAt.getTime()) / 1000);
    return Math.max(0, examDuration - elapsed - this.timeSpent);
  }

  // Virtual field for progress percentage
  get progressPercentage(): number {
    if (this.totalQuestions === 0) return 0;
    return Math.round((this.questionsAnswered / this.totalQuestions) * 100);
  }

  // Virtual field for formatted time spent
  get formattedTimeSpent(): string {
    const hours = Math.floor(this.timeSpent / 3600);
    const minutes = Math.floor((this.timeSpent % 3600) / 60);
    const seconds = this.timeSpent % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }

  // Virtual field for remaining cheating warnings
  get remainingCheatingWarnings(): number {
    return Math.max(0, this.maxCheatingWarnings - this.cheatingWarnings);
  }

  // Virtual field to check if exam should be auto-submitted
  get shouldAutoSubmit(): boolean {
    return this.cheatingWarnings >= this.maxCheatingWarnings;
  }
}
