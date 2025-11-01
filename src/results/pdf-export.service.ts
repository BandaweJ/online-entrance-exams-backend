import { Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer-core';
import * as handlebars from 'handlebars';
import { Result } from './result.entity';

@Injectable()
export class PdfExportService {
  private getChromeExecutablePath(): string | undefined {
    // Check environment variable first (commonly set by deployment platforms)
    if (process.env.CHROME_PATH || process.env.PUPPETEER_EXECUTABLE_PATH) {
      return process.env.CHROME_PATH || process.env.PUPPETEER_EXECUTABLE_PATH;
    }
    
    // For Alpine Linux (Docker deployments), Chromium is typically at:
    if (process.platform === 'linux') {
      return '/usr/bin/chromium-browser';
    }
    
    // Common system paths for Chrome/Chromium (fallback)
    const commonPaths = [
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/snap/bin/chromium',
      '/usr/local/bin/chrome',
      '/usr/local/bin/chromium',
    ];
    
    // Try to find Chrome in common paths
    // Note: Puppeteer will use its default if Chrome is not found
    return undefined;
  }

  private readonly template = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Exam Result Report</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f8f9fa;
            color: #333;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: bold;
        }
        .header p {
            margin: 10px 0 0 0;
            font-size: 16px;
            opacity: 0.9;
        }
        .student-info {
            padding: 30px;
            border-bottom: 1px solid #eee;
        }
        .student-info h2 {
            color: #667eea;
            margin: 0 0 20px 0;
            font-size: 22px;
        }
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }
        .info-item {
            display: flex;
            flex-direction: column;
        }
        .info-label {
            font-weight: bold;
            color: #666;
            font-size: 14px;
            margin-bottom: 5px;
        }
        .info-value {
            font-size: 16px;
            color: #333;
        }
        .results-section {
            padding: 30px;
            border-bottom: 1px solid #eee;
        }
        .results-section h2 {
            color: #667eea;
            margin: 0 0 20px 0;
            font-size: 22px;
        }
        .score-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .score-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            border-left: 4px solid #667eea;
        }
        .score-label {
            font-size: 14px;
            color: #666;
            margin-bottom: 8px;
        }
        .score-value {
            font-size: 24px;
            font-weight: bold;
            color: #333;
        }
        .grade-badge {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 18px;
            margin-top: 10px;
        }
        .grade-a-plus { background: #d4edda; color: #155724; }
        .grade-a { background: #d1ecf1; color: #0c5460; }
        .grade-b-plus { background: #d4edda; color: #155724; }
        .grade-b { background: #d1ecf1; color: #0c5460; }
        .grade-c-plus { background: #fff3cd; color: #856404; }
        .grade-c { background: #fff3cd; color: #856404; }
        .grade-d { background: #f8d7da; color: #721c24; }
        .grade-f { background: #f8d7da; color: #721c24; }
        .questions-section {
            padding: 30px;
        }
        .questions-section h2 {
            color: #667eea;
            margin: 0 0 20px 0;
            font-size: 22px;
        }
        .question-item {
            background: #f8f9fa;
            margin-bottom: 15px;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #667eea;
        }
        .question-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        .question-number {
            font-weight: bold;
            color: #667eea;
        }
        .question-marks {
            background: #667eea;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
        }
        .question-text {
            margin-bottom: 15px;
            line-height: 1.5;
        }
        .answer-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
        }
        .answer-item {
            padding: 10px;
            border-radius: 4px;
        }
        .student-answer {
            background: #e3f2fd;
            border: 1px solid #2196f3;
        }
        .correct-answer {
            background: #e8f5e8;
            border: 1px solid #4caf50;
        }
        .answer-label {
            font-weight: bold;
            margin-bottom: 5px;
            font-size: 12px;
        }
        .answer-text {
            font-size: 14px;
        }
        .correct {
            color: #4caf50;
        }
        .incorrect {
            color: #f44336;
        }
        .footer {
            background: #f8f9fa;
            padding: 20px 30px;
            text-align: center;
            color: #666;
            font-size: 14px;
        }
        .status-badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 15px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
        }
        .status-passed {
            background: #d4edda;
            color: #155724;
        }
        .status-failed {
            background: #f8d7da;
            color: #721c24;
        }
        @media print {
            body { background-color: white; }
            .container { box-shadow: none; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Exam Result Report</h1>
            <p>{{exam.title}} - {{exam.subject}}</p>
        </div>
        
        <div class="student-info">
            <h2>Student Information</h2>
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">Student Name</div>
                    <div class="info-value">{{student.firstName}} {{student.lastName}}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Student ID</div>
                    <div class="info-value">{{student.studentId}}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Email</div>
                    <div class="info-value">{{student.email}}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Exam Date</div>
                    <div class="info-value">{{formatDate createdAt}}</div>
                </div>
            </div>
        </div>
        
        <div class="results-section">
            <h2>Exam Results</h2>
            <div class="score-grid">
                <div class="score-card">
                    <div class="score-label">Score</div>
                    <div class="score-value">{{score}}/{{totalMarks}}</div>
                </div>
                <div class="score-card">
                    <div class="score-label">Percentage</div>
                    <div class="score-value">{{percentage}}%</div>
                </div>
                <div class="score-card">
                    <div class="score-label">Grade</div>
                    <div class="score-value">
                        <span class="grade-badge grade-{{grade.toLowerCase}}">{{grade}}</span>
                    </div>
                </div>
                <div class="score-card">
                    <div class="score-label">Status</div>
                    <div class="score-value">
                        <span class="status-badge status-{{#if isPassed}}passed{{else}}failed{{/if}}">
                            {{#if isPassed}}Passed{{else}}Failed{{/if}}
                        </span>
                    </div>
                </div>
            </div>
            
            <div class="score-grid">
                <div class="score-card">
                    <div class="score-label">Rank</div>
                    <div class="score-value">{{rank}}/{{totalStudents}}</div>
                </div>
                <div class="score-card">
                    <div class="score-label">Questions Answered</div>
                    <div class="score-value">{{questionsAnswered}}/{{totalQuestions}}</div>
                </div>
                <div class="score-card">
                    <div class="score-label">Correct Answers</div>
                    <div class="score-value">{{correctAnswers}}</div>
                </div>
                <div class="score-card">
                    <div class="score-label">Time Spent</div>
                    <div class="score-value">{{formattedTimeSpent}}</div>
                </div>
            </div>
        </div>
        
        {{#if questionResults}}
        <div class="questions-section">
            <h2>Question-by-Question Review</h2>
            {{#each questionResults}}
            <div class="question-item">
                <div class="question-header">
                    <div class="question-number">Question {{@index}}</div>
                    <div class="question-marks">{{marksObtained}}/{{totalMarks}} marks</div>
                </div>
                <div class="question-text">{{questionText}}</div>
                <div class="answer-section">
                    <div class="answer-item student-answer">
                        <div class="answer-label">Your Answer</div>
                        <div class="answer-text {{#if isCorrect}}correct{{else}}incorrect{{/if}}">{{studentAnswer}}</div>
                    </div>
                    <div class="answer-item correct-answer">
                        <div class="answer-label">Correct Answer</div>
                        <div class="answer-text">{{correctAnswer}}</div>
                    </div>
                </div>
                {{#if explanation}}
                <div style="margin-top: 10px; padding: 10px; background: #fff3cd; border-radius: 4px; font-size: 14px;">
                    <strong>Explanation:</strong> {{explanation}}
                </div>
                {{/if}}
            </div>
            {{/each}}
        </div>
        {{/if}}
        
        <div class="footer">
            <p>Generated on {{formatDate new Date}} | Entrance Exam System</p>
        </div>
    </div>
</body>
</html>
  `;

  async generateResultPdf(result: Result): Promise<Buffer> {
    const chromePath = this.getChromeExecutablePath();
    const launchOptions: any = {
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    };
    
    if (chromePath) {
      launchOptions.executablePath = chromePath;
    }
    
    const browser = await puppeteer.launch(launchOptions);

    try {
      const page = await browser.newPage();
      
      // Register Handlebars helpers
      const template = handlebars.compile(this.template);
      
      // Prepare data for template
      const templateData = {
        ...result,
        student: result.student,
        exam: result.exam,
        questionResults: result.questionResults || []
      };

      // Add helper functions
      handlebars.registerHelper('formatDate', (date: Date) => {
        return new Date(date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      });

      const html = template(templateData);
      
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '0.5in',
          right: '0.5in',
          bottom: '0.5in',
          left: '0.5in'
        }
      });

      return pdf;
    } finally {
      await browser.close();
    }
  }

  async generateBulkResultsPdf(results: Result[]): Promise<Buffer> {
    const chromePath = this.getChromeExecutablePath();
    const launchOptions: any = {
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    };
    
    if (chromePath) {
      launchOptions.executablePath = chromePath;
    }
    
    const browser = await puppeteer.launch(launchOptions);

    try {
      const page = await browser.newPage();
      
      // Create a summary template for bulk results
      const bulkTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bulk Results Report</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f8f9fa;
            color: #333;
        }
        .container {
            max-width: 1000px;
            margin: 0 auto;
            background: white;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: bold;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            padding: 30px;
            background: #f8f9fa;
        }
        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: #667eea;
        }
        .stat-label {
            color: #666;
            margin-top: 5px;
        }
        .results-table {
            padding: 30px;
        }
        .results-table h2 {
            color: #667eea;
            margin-bottom: 20px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #eee;
        }
        th {
            background: #f8f9fa;
            font-weight: bold;
            color: #333;
        }
        .grade-badge {
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
        }
        .grade-a-plus, .grade-a { background: #d4edda; color: #155724; }
        .grade-b-plus, .grade-b { background: #d1ecf1; color: #0c5460; }
        .grade-c-plus, .grade-c { background: #fff3cd; color: #856404; }
        .grade-d, .grade-f { background: #f8d7da; color: #721c24; }
        .status-passed { color: #4caf50; font-weight: bold; }
        .status-failed { color: #f44336; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Bulk Results Report</h1>
            <p>{{examTitle}} - {{totalResults}} Results</p>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">{{totalResults}}</div>
                <div class="stat-label">Total Students</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{{averageScore}}%</div>
                <div class="stat-label">Average Score</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{{passRate}}%</div>
                <div class="stat-label">Pass Rate</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{{highestScore}}%</div>
                <div class="stat-label">Highest Score</div>
            </div>
        </div>
        
        <div class="results-table">
            <h2>Individual Results</h2>
            <table>
                <thead>
                    <tr>
                        <th>Student Name</th>
                        <th>Student ID</th>
                        <th>Score</th>
                        <th>Percentage</th>
                        <th>Grade</th>
                        <th>Status</th>
                        <th>Rank</th>
                    </tr>
                </thead>
                <tbody>
                    {{#each results}}
                    <tr>
                        <td>{{student.firstName}} {{student.lastName}}</td>
                        <td>{{student.studentId}}</td>
                        <td>{{score}}/{{totalMarks}}</td>
                        <td>{{percentage}}%</td>
                        <td><span class="grade-badge grade-{{grade.toLowerCase}}">{{grade}}</span></td>
                        <td class="status-{{#if isPassed}}passed{{else}}failed{{/if}}">
                            {{#if isPassed}}Passed{{else}}Failed{{/if}}
                        </td>
                        <td>{{rank}}</td>
                    </tr>
                    {{/each}}
                </tbody>
            </table>
        </div>
    </div>
</body>
</html>
      `;

      const template = handlebars.compile(bulkTemplate);
      
      // Calculate statistics
      const totalResults = results.length;
      const averageScore = totalResults > 0 ? 
        (results.reduce((sum, r) => sum + r.percentage, 0) / totalResults).toFixed(1) : 0;
      const passRate = totalResults > 0 ? 
        ((results.filter(r => r.isPassed).length / totalResults) * 100).toFixed(1) : 0;
      const highestScore = totalResults > 0 ? 
        Math.max(...results.map(r => r.percentage)).toFixed(1) : 0;

      const templateData = {
        examTitle: results[0]?.exam?.title || 'Exam Results',
        totalResults,
        averageScore,
        passRate,
        highestScore,
        results: results.map(r => ({
          ...r,
          student: r.student,
          exam: r.exam
        }))
      };

      const html = template(templateData);
      
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '0.5in',
          right: '0.5in',
          bottom: '0.5in',
          left: '0.5in'
        }
      });

      return pdf;
    } finally {
      await browser.close();
    }
  }
}

