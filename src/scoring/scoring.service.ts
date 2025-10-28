import { Injectable, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI from "openai";
import { ScoreRequestDto } from "./dto/score-request.dto";
import { ScoreResponseDto } from "./dto/score-response.dto";

@Injectable()
export class ScoringService {
  private openai: OpenAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>("OPENAI_API_KEY");
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is required");
    }

    this.openai = new OpenAI({
      apiKey: apiKey,
    });
  }

  async calculateSimilarityScore(
    request: ScoreRequestDto,
  ): Promise<ScoreResponseDto> {
    try {
      // Validate input
      if (
        !request.question ||
        !request.correctAnswerText ||
        !request.studentAnswerText
      ) {
        throw new BadRequestException(
          "Question, correctAnswerText, and studentAnswerText are all required",
        );
      }

      if (request.totalMarks <= 0) {
        throw new BadRequestException("totalMarks must be greater than 0");
      }

      // Create contextualized texts by appending question to both answers
      // Vector A: question + correct answer + explanation/rubric
      // Vector B: question + student answer
      const contextualizedCorrectAnswer = request.rubric 
        ? `${request.question} ${request.correctAnswerText} ${request.rubric}`
        : `${request.question} ${request.correctAnswerText}`;
      const contextualizedStudentAnswer = `${request.question} ${request.studentAnswerText}`;

      // Get embeddings for both contextualized texts
      const [correctEmbedding, studentEmbedding] = await Promise.all([
        this.getEmbedding(contextualizedCorrectAnswer),
        this.getEmbedding(contextualizedStudentAnswer),
      ]);

      // Calculate cosine similarity
      const similarity = this.calculateCosineSimilarity(
        correctEmbedding,
        studentEmbedding,
      );

      // Calculate score based on similarity and total marks
      const score = this.calculateDiscreteScore(similarity, request.totalMarks);

      // Generate feedback based on similarity
      const feedback = this.generateFeedback(similarity);

      return {
        score: Math.min(score, request.totalMarks), // Cap at total marks
        totalMarks: request.totalMarks,
        feedback,
        confidence: similarity,
        reasoning: `Similarity score: ${(similarity * 100).toFixed(1)}% (based on question + correct answer${request.rubric ? ' + rubric' : ''} vs question + student answer)`,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Error calculating similarity: ${error.message}`,
      );
    }
  }

  private async getEmbedding(text: string): Promise<number[]> {
    try {
      const model =
        this.configService.get<string>("OPENAI_MODEL") ||
        "text-embedding-ada-002";

      const response = await this.openai.embeddings.create({
        model: model,
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      throw new Error(`Failed to get embedding: ${error.message}`);
    }
  }

  private calculateCosineSimilarity(
    vectorA: number[],
    vectorB: number[],
  ): number {
    if (vectorA.length !== vectorB.length) {
      throw new Error("Vectors must have the same length");
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      normA += vectorA[i] * vectorA[i];
      normB += vectorB[i] * vectorB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  private calculateDiscreteScore(similarity: number, totalMarks: number): number {
    const percentage = similarity * 100;
    let score: number;

    if (percentage >= 90) {
      score = totalMarks; // full marks
    } else if (percentage >= 80) {
      score = 0.8 * totalMarks;
    } else if (percentage >= 65) {
      score = 0.6 * totalMarks;
    } else if (percentage >= 50) {
      score = 0.4 * totalMarks;
    } else if (percentage >= 35) {
      score = 0.2 * totalMarks;
    } else {
      score = 0; // < 35%
    }

    // Return a whole number and cap at totalMarks
    return Math.min(Math.round(score), totalMarks);
  }

  private generateFeedback(similarity: number): string {
    const percentage = similarity * 100;

    if (percentage >= 90) {
      return "Excellent! Fully correct and well explained.";
    } else if (percentage >= 80) {
      return "Very good. Minor details missing.";
    } else if (percentage >= 65) {
      return "Good effort. Covers most key points.";
    } else if (percentage >= 50) {
      return "Fair answer. Some understanding shown.";
    } else if (percentage >= 35) {
      return "Weak response. Important points missing.";
    } else {
      return "Insufficient answer. Does not address the question properly.";
    }
  }
}
