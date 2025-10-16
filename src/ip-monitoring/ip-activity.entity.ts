import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

@Entity("ip_activities")
@Index(["ipAddress", "createdAt"])
@Index(["ipAddress", "action"])
@Index(["isBlocked"])
export class IpActivity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 45 })
  ipAddress: string;

  @Column({ type: "varchar", length: 100 })
  userAgent: string;

  @Column({ type: "varchar", length: 50 })
  action: string; // login, exam_start, exam_submit, etc.

  @Column({ type: "varchar", length: 500, nullable: true })
  endpoint: string;

  @Column({ type: "varchar", length: 10, nullable: true })
  method: string;

  @Column({ type: "int", default: 200 })
  statusCode: number;

  @Column({ type: "varchar", length: 100, nullable: true })
  userId: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  examId: string;

  @Column({ type: "json", nullable: true })
  metadata: any;

  @Column({ type: "boolean", default: false })
  isSuspicious: boolean;

  @Column({ type: "boolean", default: false })
  isBlocked: boolean;

  @Column({ type: "varchar", length: 500, nullable: true })
  blockReason: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  country: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  city: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  region: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
