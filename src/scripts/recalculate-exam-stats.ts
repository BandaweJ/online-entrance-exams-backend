import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ExamsService } from '../exams/exams.service';

async function recalculateAllExamStats() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const examsService = app.get(ExamsService);

  try {
    
    // Get all exams
    const exams = await examsService.findAll();

    // Recalculate stats for each exam
    for (const exam of exams) {
      await examsService.recalculateExamStats(exam.id);
    }

  } catch (error) {
    console.error('Error recalculating exam statistics:', error);
  } finally {
    await app.close();
  }
}

recalculateAllExamStats();
