# Online Entrance Exams - Backend API

A NestJS-based backend API for managing school entrance examinations.

## Features

- **Authentication & Authorization**: JWT-based authentication with role-based access control
- **Exam Management**: Create, manage, and publish exams with sections and questions
- **Student Management**: Register and manage student accounts
- **Exam Attempts**: Handle exam taking with time tracking and pause/resume functionality
- **AI-Powered Grading**: Automatic grading with AI fallback to basic scoring
- **Results Management**: Generate and publish exam results with statistics
- **Notifications**: Email and SMS notifications for students
- **Real-time Statistics**: Comprehensive exam and student statistics

## Tech Stack

- **Framework**: NestJS
- **Database**: PostgreSQL with TypeORM
- **Authentication**: JWT with Passport
- **Validation**: Class-validator
- **Email**: Nodemailer
- **SMS**: Twilio
- **AI Integration**: OpenAI API (optional)

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=your_username
DB_PASSWORD=your_password
DB_NAME=entrance_exams

# JWT Configuration
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=24h

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Twilio Configuration (Optional)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_FROM_NUMBER=your_twilio_phone_number

# OpenAI Configuration (Required for AI scoring)
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=text-embedding-ada-002

# AI Grader Configuration (Legacy - Optional)
AI_GRADER_API_URL=https://api.example.com/grade
AI_GRADER_API_KEY=your_ai_grader_api_key

# CORS Configuration
CORS_ORIGIN=http://localhost:4200
```

## Installation

1. Install dependencies:
```bash
npm install
```

2. Set up your database and update the environment variables

3. Run database migrations:
```bash
npm run migration:run
```

4. Seed the database with an admin user:
```bash
npm run seed
```

## Development

```bash
# Start development server
npm run start:dev

# Build the application
npm run build

# Start production server
npm run start:prod
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/change-password` - Change password
- `GET /api/auth/profile` - Get user profile
- `PATCH /api/auth/profile` - Update user profile

### Exams
- `GET /api/exams` - Get all exams
- `POST /api/exams` - Create new exam
- `GET /api/exams/:id` - Get exam by ID
- `PATCH /api/exams/:id` - Update exam
- `DELETE /api/exams/:id` - Delete exam
- `PATCH /api/exams/:id/publish` - Publish exam
- `PATCH /api/exams/:id/close` - Close exam

### Students
- `GET /api/students` - Get all students
- `POST /api/students` - Create new student
- `GET /api/students/:id` - Get student by ID
- `PATCH /api/students/:id` - Update student
- `DELETE /api/students/:id` - Delete student

### Results
- `GET /api/results` - Get all results
- `GET /api/results/student` - Get student results
- `GET /api/results/exam/:examId` - Get exam results
- `GET /api/results/exam/:examId/stats` - Get exam statistics
- `POST /api/results/generate/:attemptId` - Generate result

## Deployment

This application is configured for deployment on Render.com:

1. **Build Command**: `npm run render:build`
2. **Start Command**: `npm run render:start`
3. **Node Version**: 18.x or higher

### Render Environment Variables

Set the following environment variables in your Render dashboard:

- `NODE_ENV=production`
- `PORT=3000` (automatically set by Render)
- Database connection variables
- JWT secret
- CORS origin (your frontend URL)
- Email/SMS configuration (optional)

## License

MIT
