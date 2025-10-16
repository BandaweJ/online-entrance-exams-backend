import { TypeOrmModuleOptions } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";
import { User } from "../users/user.entity";
import { Student } from "../students/student.entity";
import { Exam } from "../exams/exam.entity";
import { Section } from "../exams/section.entity";
import { Question } from "../questions/question.entity";
import { ExamAttempt } from "../attempts/exam-attempt.entity";
import { Answer } from "../answers/answer.entity";
import { Result } from "../results/result.entity";
import { IpActivity } from "../ip-monitoring/ip-activity.entity";
import { IpBlocklist } from "../ip-monitoring/ip-blocklist.entity";

export class DatabaseConfig {
  static getTypeOrmConfig(configService: ConfigService): TypeOrmModuleOptions {
    return {
      type: "postgres",
      host: configService.get("DB_HOST", "localhost"),
      port: configService.get("DB_PORT", 5432),
      username: configService.get("DB_USERNAME", "postgres"),
      password: configService.get("DB_PASSWORD", "password"),
      database: configService.get("DB_NAME", "entrance_exam_db"),
      entities: [
        User,
        Student,
        Exam,
        Section,
        Question,
        ExamAttempt,
        Answer,
        Result,
        IpActivity,
        IpBlocklist,
      ],
      synchronize: true, // Temporarily enabled for initial table creation
      logging: configService.get("NODE_ENV") === "development",
      migrations: ["dist/migrations/*.js"],
      migrationsRun: false,
    };
  }
}
