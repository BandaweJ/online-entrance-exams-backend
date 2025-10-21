import { MigrationInterface, QueryRunner } from "typeorm";

export class AddInstructionsFields1734787200000 implements MigrationInterface {
    name = "AddInstructionsFields1734787200000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "exams" ADD "instructions" text`);
        await queryRunner.query(`ALTER TABLE "sections" ADD "instructions" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "sections" DROP COLUMN "instructions"`);
        await queryRunner.query(`ALTER TABLE "exams" DROP COLUMN "instructions"`);
    }
}
