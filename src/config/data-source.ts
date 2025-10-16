import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { User } from '../users/user.entity';
import { Student } from '../students/student.entity';
import { Exam } from '../exams/exam.entity';
import { Section } from '../exams/section.entity';
import { Question } from '../questions/question.entity';
import { ExamAttempt } from '../attempts/exam-attempt.entity';
import { Answer } from '../answers/answer.entity';
import { Result } from '../results/result.entity';

// Load environment variables
config({ path: '.env' });

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'entrance_exam_db',
  entities: [
    User,
    Student,
    Exam,
    Section,
    Question,
    ExamAttempt,
    Answer,
    Result,
  ],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
});
