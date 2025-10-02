import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private configService: NestConfigService) {}

  get database() {
    return {
      host: this.configService.get('DB_HOST', 'localhost'),
      port: this.configService.get('DB_PORT', 5432),
      username: this.configService.get('DB_USERNAME', 'postgres'),
      password: this.configService.get('DB_PASSWORD', 'password'),
      database: this.configService.get('DB_NAME', 'entrance_exam_db'),
    };
  }

  get jwt() {
    return {
      secret: this.configService.get('JWT_SECRET', 'your-secret-key'),
      expiresIn: this.configService.get('JWT_EXPIRES_IN', '24h'),
    };
  }

  get email() {
    return {
      host: this.configService.get('EMAIL_HOST', 'smtp.gmail.com'),
      port: this.configService.get('EMAIL_PORT', 587),
      user: this.configService.get('EMAIL_USER', ''),
      password: this.configService.get('EMAIL_PASSWORD', ''),
    };
  }

  get sms() {
    return {
      accountSid: this.configService.get('TWILIO_ACCOUNT_SID', ''),
      authToken: this.configService.get('TWILIO_AUTH_TOKEN', ''),
      fromNumber: this.configService.get('TWILIO_FROM_NUMBER', ''),
    };
  }

  get aiGrader() {
    return {
      apiUrl: this.configService.get('AI_GRADER_API_URL', ''),
      apiKey: this.configService.get('AI_GRADER_API_KEY', ''),
    };
  }
}
