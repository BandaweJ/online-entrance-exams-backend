import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";
import { UsersService } from "./users/users.service";
import { getRepositoryToken } from "@nestjs/typeorm";
import { User } from "./users/user.entity";
import { AppDataSource } from "./config/data-source";
import * as bcrypt from "bcrypt";

async function bootstrap() {
  // Run migrations before starting the application
  try {
    console.log("Running database migrations...");
    await AppDataSource.initialize();
    await AppDataSource.runMigrations();
    console.log("Database migrations completed successfully");
  } catch (error) {
    console.error("Error running migrations:", error);
    process.exit(1);
  }

  const app = await NestFactory.create(AppModule);

  // Enable CORS with production configuration
  const corsOrigin =
    process.env.NODE_ENV === "production"
      ? process.env.CORS_ORIGIN || "https://your-frontend-domain.onrender.com"
      : process.env.FRONTEND_URL || "http://localhost:4200";

  app.enableCors({
    origin: corsOrigin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global prefix
  app.setGlobalPrefix("api");

  const port = process.env.PORT || 3000;

  // Seed admin user if it doesn't exist
  await seedAdminUser(app);

  await app.listen(port);

  if (process.env.NODE_ENV !== "production") {
    console.log(`Application is running on: http://localhost:${port}`);
  }
}

async function seedAdminUser(app: any) {
  try {
    const usersService = app.get(UsersService);
    const userRepository = app.get(getRepositoryToken(User));

    const adminEmail = "admin@school.com";
    const adminPassword = "admin123";

    // Check if admin already exists
    const existingAdmin = await usersService.findByEmail(adminEmail);

    if (existingAdmin) {
      console.log("Admin user already exists");
      return;
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    const adminUser = {
      email: adminEmail,
      password: hashedPassword,
      firstName: "System",
      lastName: "Administrator",
      role: "admin" as any,
      isActive: true,
    };

    // Create the admin user in the database
    await userRepository.save(adminUser);
    console.log("Admin user seeded successfully");
  } catch (error) {
    console.error("Error seeding admin user:", error);
  }
}

bootstrap();
