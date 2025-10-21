import { MigrationInterface, QueryRunner } from "typeorm";

export class AddInstructionsFields1734787200000 implements MigrationInterface {
    name = 'AddInstructionsFields1734787200000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add instructions column to exams table
        await queryRunner.query(`ALTER TABLE "exams" ADD "instructions" text`);
        
        // Add instructions column to sections table
        await queryRunner.query(`ALTER TABLE "sections" ADD "instructions" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove instructions column from sections table
        await queryRunner.query(`ALTER TABLE "sections" DROP COLUMN "instructions"`);
        
        // Remove instructions column from exams table
        await queryRunner.query(`ALTER TABLE "exams" DROP COLUMN "instructions"`);
    }
}
