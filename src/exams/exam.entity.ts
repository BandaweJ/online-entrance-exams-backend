import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Section } from './section.entity';
import { ExamAttempt } from '../attempts/exam-attempt.entity';

export enum ExamStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  CLOSED = 'closed',
}

@Entity('exams')
export class Exam {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column()
  year: number;

  @Column()
  examDate: Date;

  @Column({ type: 'int' })
  durationMinutes: number;

  @Column({
    type: 'enum',
    enum: ExamStatus,
    default: ExamStatus.DRAFT,
  })
  status: ExamStatus;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  totalMarks: number;

  @Column({ type: 'int', default: 0 })
  totalQuestions: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.id)
  @JoinColumn({ name: 'createdBy' })
  createdBy: User;

  @OneToMany(() => Section, (section) => section.exam, { cascade: true })
  sections: Section[];

  @OneToMany(() => ExamAttempt, (attempt) => attempt.exam)
  attempts: ExamAttempt[];

  // Virtual field for formatted exam date
  get formattedDate(): string {
    return this.examDate.toLocaleDateString();
  }

  // Virtual field for duration in hours and minutes
  get durationFormatted(): string {
    const hours = Math.floor(this.durationMinutes / 60);
    const minutes = this.durationMinutes % 60;
    return `${hours}h ${minutes}m`;
  }
}
