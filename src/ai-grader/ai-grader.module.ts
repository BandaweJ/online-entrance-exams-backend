import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiGraderService } from './ai-grader.service';
import { AiGraderController } from './ai-grader.controller';

@Module({
  imports: [ConfigModule],
  controllers: [AiGraderController],
  providers: [AiGraderService],
  exports: [AiGraderService],
})
export class AiGraderModule {}
