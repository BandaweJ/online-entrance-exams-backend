import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Student } from "../students/student.entity";
import { Question } from "../questions/question.entity";
import { ExamAttempt } from "../attempts/exam-attempt.entity";

@Entity("answers")
export class Answer {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "text", nullable: true })
  answerText: string;

  @Column({ type: "json", nullable: true })
  selectedOptions: string[]; // For multiple choice questions

  @Column({ type: "boolean", nullable: true })
  isCorrect: boolean;

  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 })
  score: number;

  @Column({ type: "decimal", precision: 5, scale: 2 })
  maxScore: number;

  @Column({ default: false })
  isGraded: boolean;

  @Column({ type: "text", nullable: true })
  feedback: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Student, (student) => student.id, { onDelete: "CASCADE" })
  @JoinColumn({ name: "studentId" })
  student: Student;

  @Column()
  studentId: string;

  @ManyToOne(() => Question, (question) => question.answers, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "questionId" })
  question: Question;

  @Column()
  questionId: string;

  @ManyToOne(() => ExamAttempt, (attempt) => attempt.answers, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "attemptId" })
  attempt: ExamAttempt;

  @Column()
  attemptId: string;

  // Virtual field for formatted answer
  get formattedAnswer(): string {
    if (this.selectedOptions && this.selectedOptions.length > 0) {
      return this.selectedOptions.join(", ");
    }
    return this.answerText || "";
  }

  // Virtual field for score percentage
  get scorePercentage(): number {
    if (this.maxScore === 0) return 0;
    return Math.round((this.score / this.maxScore) * 100);
  }
}
