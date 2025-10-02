import { Injectable } from '@nestjs/common';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';
import { Student } from '../students/student.entity';

@Injectable()
export class NotificationsService {
  constructor(
    private emailService: EmailService,
    private smsService: SmsService,
  ) {}

  async sendCredentialsEmail(student: Student, credentials: { username: string; password: string }): Promise<void> {
    const subject = 'Your Exam Portal Login Credentials';
    const template = 'credentials';
    const data = {
      studentName: student.fullName,
      studentId: student.studentId,
      username: credentials.username,
      password: credentials.password,
      loginUrl: process.env.FRONTEND_URL || 'http://localhost:4200',
    };

    await this.emailService.sendEmail(student.email, subject, template, data);
  }

  async sendCredentialsSMS(student: Student, credentials: { username: string; password: string }): Promise<void> {
    const message = `Hello ${student.firstName}, your exam portal credentials are: Username: ${credentials.username}, Password: ${credentials.password}. Login at: ${process.env.FRONTEND_URL || 'http://localhost:4200'}`;
    
    await this.smsService.sendSMS(student.phone, message);
  }

  async sendExamReminder(student: Student, exam: any): Promise<void> {
    const subject = 'Exam Reminder';
    const template = 'exam-reminder';
    const data = {
      studentName: student.fullName,
      examTitle: exam.title,
      examDate: exam.formattedDate,
      examTime: exam.examDate.toLocaleTimeString(),
      duration: exam.durationFormatted,
    };

    await this.emailService.sendEmail(student.email, subject, template, data);
  }

  async sendExamResults(student: Student, result: any): Promise<void> {
    const subject = 'Your Exam Results';
    const template = 'exam-results';
    const data = {
      studentName: student.fullName,
      examTitle: result.exam.title,
      score: result.score,
      totalMarks: result.totalMarks,
      percentage: result.formattedPercentage,
      grade: result.grade,
      rank: result.rank,
      totalStudents: result.totalStudents,
    };

    await this.emailService.sendEmail(student.email, subject, template, data);
  }
}
