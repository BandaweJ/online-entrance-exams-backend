import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { AiGraderRequest, AiGraderResponse, AiGraderError } from './interfaces/ai-grader.interface';

@Injectable()
export class AiGraderService {
  private readonly apiUrl: string;
  private readonly apiKey: string;

  constructor(private configService: ConfigService) {
    this.apiUrl = this.configService.get<string>('AI_GRADER_API_URL');
    this.apiKey = this.configService.get<string>('AI_GRADER_API_KEY');
  }

  async gradeAnswer(request: AiGraderRequest): Promise<AiGraderResponse> {
    try {
      // Validate request
      this.validateRequest(request);

      // If no AI grader is configured, use fallback grading
      if (!this.apiUrl || !this.apiKey) {
        return this.fallbackGrading(request);
      }

      // Call external AI grading API
      const response = await axios.post(
        this.apiUrl,
        {
          correctAnswerText: request.correctAnswerText,
          studentAnswerText: request.studentAnswerText,
          totalMarks: request.totalMarks,
          questionType: request.questionType,
          rubric: request.rubric,
          questionText: request.questionText,
          questionId: request.questionId,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30 seconds timeout
        }
      );

      return this.processResponse(response.data);
    } catch (error) {
      console.error('AI Grader Error:', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 400) {
          throw new BadRequestException('Invalid grading request');
        } else if (error.response?.status === 401) {
          throw new BadRequestException('Invalid API credentials');
        } else if (error.response?.status === 429) {
          throw new BadRequestException('API rate limit exceeded');
        } else if (error.code === 'ECONNABORTED') {
          throw new InternalServerErrorException('AI grading service timeout');
        }
      }

      // Fallback to basic grading if AI service fails
      return this.fallbackGrading(request);
    }
  }

  async gradeMultipleAnswers(requests: AiGraderRequest[]): Promise<AiGraderResponse[]> {
    const results: AiGraderResponse[] = [];
    
    // Process each request individually to handle partial failures
    for (const request of requests) {
      try {
        const result = await this.gradeAnswer(request);
        results.push(result);
      } catch (error) {
        console.error('Error grading individual answer:', error);
        // Add a fallback result for failed grading
        results.push(this.fallbackGrading(request));
      }
    }

    return results;
  }

  private validateRequest(request: AiGraderRequest): void {
    if (!request.correctAnswerText || request.correctAnswerText.trim().length === 0) {
      throw new BadRequestException('Correct answer text is required');
    }

    if (!request.studentAnswerText || request.studentAnswerText.trim().length === 0) {
      throw new BadRequestException('Student answer text is required');
    }

    if (!request.totalMarks || request.totalMarks <= 0) {
      throw new BadRequestException('Total marks must be greater than 0');
    }
  }

  private processResponse(data: any): AiGraderResponse {
    // Validate response structure
    if (!data || typeof data.score !== 'number' || typeof data.totalMarks !== 'number') {
      throw new InternalServerErrorException('Invalid response from AI grading service');
    }

    // Ensure score is within valid range
    const score = Math.max(0, Math.min(data.score, data.totalMarks));

    return {
      score,
      totalMarks: data.totalMarks,
      feedback: data.feedback || '',
      confidence: data.confidence || 0,
      reasoning: data.reasoning || '',
    };
  }

  private fallbackGrading(request: AiGraderRequest): AiGraderResponse {
    // Simple keyword-based grading as fallback
    const correctAnswer = request.correctAnswerText.toLowerCase().trim();
    const studentAnswer = request.studentAnswerText.toLowerCase().trim();

    let score = 0;
    let feedback = '';

    if (request.questionType === 'true_false') {
      // For true/false questions, exact match
      if (correctAnswer === studentAnswer) {
        score = request.totalMarks;
        feedback = 'Correct answer!';
      } else {
        score = 0;
        feedback = 'Incorrect answer.';
      }
    } else if (request.questionType === 'multiple_choice') {
      // For multiple choice, exact match
      if (correctAnswer === studentAnswer) {
        score = request.totalMarks;
        feedback = 'Correct answer!';
      } else {
        score = 0;
        feedback = 'Incorrect answer.';
      }
    } else {
      // For short answer and essay questions, keyword matching
      const correctKeywords = correctAnswer.split(/\s+/).filter(word => word.length > 2);
      const studentKeywords = studentAnswer.split(/\s+/).filter(word => word.length > 2);
      
      const matchingKeywords = correctKeywords.filter(keyword => 
        studentKeywords.some(studentKeyword => 
          studentKeyword.includes(keyword) || keyword.includes(studentKeyword)
        )
      );

      const keywordMatchRatio = correctKeywords.length > 0 
        ? matchingKeywords.length / correctKeywords.length 
        : 0;

      // Calculate score based on keyword matching
      score = Math.round(request.totalMarks * keywordMatchRatio);
      
      if (keywordMatchRatio >= 0.8) {
        feedback = 'Good answer with most key points covered.';
      } else if (keywordMatchRatio >= 0.5) {
        feedback = 'Partial answer with some key points covered.';
      } else if (keywordMatchRatio > 0) {
        feedback = 'Answer partially correct but missing key points.';
      } else {
        feedback = 'Answer does not match the expected response.';
      }
    }

    return {
      score,
      totalMarks: request.totalMarks,
      feedback,
      confidence: 0.5, // Low confidence for fallback grading
      reasoning: 'Graded using fallback keyword matching algorithm',
    };
  }

  async getServiceStatus(): Promise<{ status: string; message: string }> {
    if (!this.apiUrl || !this.apiKey) {
      return {
        status: 'disabled',
        message: 'AI grading service is not configured',
      };
    }

    try {
      // Test API connectivity
      await axios.get(this.apiUrl, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        timeout: 5000,
      });

      return {
        status: 'active',
        message: 'AI grading service is operational',
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'AI grading service is not responding',
      };
    }
  }
}
