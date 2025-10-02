import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS with production configuration
  const corsOrigin = process.env.NODE_ENV === 'production' 
    ? process.env.CORS_ORIGIN || 'https://your-frontend-domain.onrender.com'
    : process.env.FRONTEND_URL || 'http://localhost:4200';
    
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  
  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  
  // Global prefix
  app.setGlobalPrefix('api');
  
  const port = process.env.PORT || 3000;
  await app.listen(port);
  
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Application is running on: http://localhost:${port}`);
  }
}
bootstrap();
