import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Like } from "typeorm";
import { Student } from "./student.entity";
import { User } from "../users/user.entity";
import { CreateStudentDto } from "./dto/create-student.dto";
import { UpdateStudentDto } from "./dto/update-student.dto";
import { NotificationsService } from "../notifications/notifications.service";
import * as bcrypt from "bcrypt";

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private notificationsService: NotificationsService,
  ) {}

  async create(
    createStudentDto: CreateStudentDto,
    createdBy: string,
  ): Promise<Student> {
    // Check if student with email already exists
    const existingStudent = await this.studentRepository.findOne({
      where: { email: createStudentDto.email },
    });

    if (existingStudent) {
      throw new ConflictException("Student with this email already exists");
    }

    // Generate unique student ID
    const studentId = await this.generateStudentId();

    // Create student record
    const student = this.studentRepository.create({
      ...createStudentDto,
      studentId,
      createdBy,
    });

    const savedStudent = await this.studentRepository.save(student);

    // Generate login credentials
    const credentials = await this.generateCredentials(savedStudent);

    // Send credentials via email and SMS
    await this.sendCredentials(savedStudent, credentials);

    return savedStudent;
  }

  async findAll(): Promise<Student[]> {
    return this.studentRepository.find({
      relations: ["user"],
      order: { createdAt: "DESC" },
    });
  }

  async findOne(id: string): Promise<Student> {
    const student = await this.studentRepository.findOne({
      where: { id },
      relations: ["user"],
    });

    if (!student) {
      throw new NotFoundException("Student not found");
    }

    return student;
  }

  async findByEmail(email: string): Promise<Student> {
    return this.studentRepository.findOne({
      where: { email },
      relations: ["user"],
    });
  }

  async findByStudentId(studentId: string): Promise<Student> {
    return this.studentRepository.findOne({
      where: { studentId },
      relations: ["user"],
    });
  }

  async update(
    id: string,
    updateStudentDto: UpdateStudentDto,
  ): Promise<Student> {
    const student = await this.findOne(id);

    Object.assign(student, updateStudentDto);
    return this.studentRepository.save(student);
  }

  async remove(id: string): Promise<void> {
    const student = await this.findOne(id);
    await this.studentRepository.remove(student);
  }

  async resendCredentials(id: string): Promise<Student> {
    const student = await this.findOne(id);

    // Generate new credentials
    const credentials = await this.generateCredentials(student);

    // Send credentials
    await this.sendCredentials(student, credentials);

    return student;
  }

  async getStats() {
    const totalStudents = await this.studentRepository.count();
    const activeStudents = await this.studentRepository.count({
      where: { isActive: true },
    });
    const credentialsSent = await this.studentRepository.count({
      where: { credentialsSent: true },
    });

    return {
      totalStudents,
      activeStudents,
      inactiveStudents: totalStudents - activeStudents,
      credentialsSent,
      credentialsPending: totalStudents - credentialsSent,
    };
  }

  private async generateStudentId(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `STU${year}`;

    // Find the last student ID for this year
    const lastStudent = await this.studentRepository.findOne({
      where: { studentId: Like(`${prefix}%`) },
      order: { studentId: "DESC" },
    });

    let nextNumber = 1;
    if (lastStudent) {
      const lastNumber = parseInt(lastStudent.studentId.replace(prefix, ""));
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(4, "0")}`;
  }

  private async generateCredentials(
    student: Student,
  ): Promise<{ username: string; password: string }> {
    const username = student.email;
    const password = this.generateRandomPassword();

    // Create or update user account
    const existingUser = await this.userRepository.findOne({
      where: { email: student.email },
    });

    if (existingUser) {
      // Update existing user
      const hashedPassword = await bcrypt.hash(password, 12);
      await this.userRepository.update(existingUser.id, {
        password: hashedPassword,
        role: "student" as any,
        firstName: student.firstName,
        lastName: student.lastName,
      });
    } else {
      // Create new user
      const hashedPassword = await bcrypt.hash(password, 12);
      const user = this.userRepository.create({
        email: student.email,
        password: hashedPassword,
        firstName: student.firstName,
        lastName: student.lastName,
        role: "student" as any,
        isActive: true,
      });
      await this.userRepository.save(user);
    }

    // Update student record
    await this.studentRepository.update(student.id, {
      credentialsSent: true,
    });

    return { username, password };
  }

  private generateRandomPassword(): string {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let password = "";
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  private async sendCredentials(
    student: Student,
    credentials: { username: string; password: string },
  ): Promise<void> {
    try {
      // Send email
      await this.notificationsService.sendCredentialsEmail(
        student,
        credentials,
      );

      // Send SMS if phone number is available
      if (student.phone) {
        await this.notificationsService.sendCredentialsSMS(
          student,
          credentials,
        );
      }
    } catch (error) {
      // Don't throw error to prevent student creation failure
    }
  }
}
