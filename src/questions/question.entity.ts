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
import { Section } from '../exams/section.entity';
import { Answer } from '../answers/answer.entity';

export enum QuestionType {
  MULTIPLE_CHOICE = 'multiple_choice',
  TRUE_FALSE = 'true_false',
  SHORT_ANSWER = 'short_answer',
  ESSAY = 'essay',
}

@Entity('questions')
export class Question {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  questionText: string;

  @Column({
    type: 'enum',
    enum: QuestionType,
    default: QuestionType.MULTIPLE_CHOICE,
  })
  type: QuestionType;

  @Column({ type: 'json', nullable: true })
  options: string[]; // For multiple choice questions

  @Column({ type: 'text', nullable: true })
  correctAnswer: string;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  marks: number;

  @Column({ type: 'int' })
  order: number;

  @Column({ type: 'text', nullable: true })
  explanation: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Section, (section) => section.questions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sectionId' })
  section: Section;

  @Column()
  sectionId: string;

  @OneToMany(() => Answer, (answer) => answer.question)
  answers: Answer[];

  // Virtual field for question number within section
  get questionNumber(): number {
    return this.order;
  }

  // Virtual field for formatted options (for display)
  get formattedOptions(): { value: string; label: string }[] {
    if (!this.options || this.type !== QuestionType.MULTIPLE_CHOICE) {
      return [];
    }
    return this.options.map((option, index) => ({
      value: option,
      label: `${String.fromCharCode(65 + index)}. ${option}`,
    }));
  }
}
