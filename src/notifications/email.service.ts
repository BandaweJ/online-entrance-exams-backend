import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('EMAIL_HOST'),
      port: this.configService.get('EMAIL_PORT'),
      secure: false,
      auth: {
        user: this.configService.get('EMAIL_USER'),
        pass: this.configService.get('EMAIL_PASSWORD'),
      },
    });
  }

  async sendEmail(to: string, subject: string, template: string, data: any): Promise<void> {
    try {
      const html = await this.renderTemplate(template, data);
      
      const mailOptions = {
        from: this.configService.get('EMAIL_USER'),
        to,
        subject,
        html,
      };

      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  private async renderTemplate(templateName: string, data: any): Promise<string> {
    const templatePath = path.join(__dirname, 'templates', `${templateName}.html`);
    
    try {
      let template = fs.readFileSync(templatePath, 'utf8');
      
      // Replace placeholders with actual data
      Object.keys(data).forEach(key => {
        const placeholder = `{{${key}}}`;
        template = template.replace(new RegExp(placeholder, 'g'), data[key] || '');
      });

      return template;
    } catch (error) {
      console.error('Error rendering template:', error);
      // Return a simple fallback template
      return this.getFallbackTemplate(templateName, data);
    }
  }

  private getFallbackTemplate(templateName: string, data: any): string {
    switch (templateName) {
      case 'credentials':
        return `
          <h2>Your Exam Portal Login Credentials</h2>
          <p>Hello ${data.studentName},</p>
          <p>Your login credentials for the exam portal are:</p>
          <ul>
            <li><strong>Username:</strong> ${data.username}</li>
            <li><strong>Password:</strong> ${data.password}</li>
          </ul>
          <p>Please login at: <a href="${data.loginUrl}">${data.loginUrl}</a></p>
          <p>Please change your password after first login.</p>
        `;
      
      case 'exam-reminder':
        return `
          <h2>Exam Reminder</h2>
          <p>Hello ${data.studentName},</p>
          <p>This is a reminder that you have an exam scheduled:</p>
          <ul>
            <li><strong>Exam:</strong> ${data.examTitle}</li>
            <li><strong>Date:</strong> ${data.examDate}</li>
            <li><strong>Time:</strong> ${data.examTime}</li>
            <li><strong>Duration:</strong> ${data.duration}</li>
          </ul>
          <p>Please ensure you are ready for the exam.</p>
        `;
      
      case 'exam-results':
        return `
          <h2>Your Exam Results</h2>
          <p>Hello ${data.studentName},</p>
          <p>Your results for ${data.examTitle} are ready:</p>
          <ul>
            <li><strong>Score:</strong> ${data.score}/${data.totalMarks}</li>
            <li><strong>Percentage:</strong> ${data.percentage}</li>
            <li><strong>Grade:</strong> ${data.grade}</li>
            <li><strong>Rank:</strong> ${data.rank}/${data.totalStudents}</li>
          </ul>
        `;
      
      default:
        return `<p>Hello, ${data.studentName || 'User'}</p><p>You have a notification from the exam portal.</p>`;
    }
  }
}
