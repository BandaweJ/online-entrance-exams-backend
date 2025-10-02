export interface AiGraderRequest {
  correctAnswerText: string;
  studentAnswerText: string;
  totalMarks: number;
  questionType?: string;
  rubric?: string;
  questionText?: string; // Added question context
  questionId?: string; // Added question ID for tracking
}

export interface AiGraderResponse {
  score: number;
  totalMarks: number;
  feedback?: string;
  confidence?: number;
  reasoning?: string;
}

export interface AiGraderError {
  error: string;
  message: string;
  code?: string;
}
