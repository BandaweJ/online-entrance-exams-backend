import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../users/users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import * as bcrypt from 'bcrypt';

async function seedAdmin() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);
  const userRepository = app.get(getRepositoryToken(User));

  const adminEmail = 'admin@anarchyhigh.edu';
  const adminPassword = 'admin123';

  try {
    // Check if admin already exists
    const existingAdmin = await usersService.findByEmail(adminEmail);
    
    if (existingAdmin) {
      return;
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    
    const adminUser = {
      email: adminEmail,
      password: hashedPassword,
      firstName: 'System',
      lastName: 'Administrator',
      role: 'admin' as any,
      isActive: true,
    };

    // Create the admin user in the database
    await userRepository.save(adminUser);
    

  } catch (error) {
    console.error('Error seeding admin user:', error);
  } finally {
    await app.close();
  }
}

seedAdmin();
