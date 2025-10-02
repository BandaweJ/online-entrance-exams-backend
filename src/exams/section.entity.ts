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
import { Exam } from './exam.entity';
import { Question } from '../questions/question.entity';

@Entity('sections')
export class Section {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'int' })
  order: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  totalMarks: number;

  @Column({ type: 'int', default: 0 })
  questionCount: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Exam, (exam) => exam.sections, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'examId' })
  exam: Exam;

  @Column()
  examId: string;

  @OneToMany(() => Question, (question) => question.section, { cascade: true })
  questions: Question[];

  // Virtual field for section number
  get sectionNumber(): number {
    return this.order;
  }
}
