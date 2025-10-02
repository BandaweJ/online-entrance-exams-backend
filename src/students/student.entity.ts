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
import { ExamAttempt } from '../attempts/exam-attempt.entity';

@Entity('students')
export class Student {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  studentId: string; // School-assigned student ID

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  dateOfBirth: Date;

  @Column({ nullable: true })
  school: string;

  @Column({ nullable: true })
  grade: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  credentialsSent: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.students)
  @JoinColumn({ name: 'createdBy' })
  user: User;

  @Column()
  createdBy: string;

  @OneToMany(() => ExamAttempt, (attempt) => attempt.student)
  examAttempts: ExamAttempt[];

  // Virtual field for full name
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}
