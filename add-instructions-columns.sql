-- Add instructions columns to exams and sections tables
-- Run this script manually on your database

-- Add instructions column to exams table
ALTER TABLE "exams" ADD COLUMN IF NOT EXISTS "instructions" text;

-- Add instructions column to sections table  
ALTER TABLE "sections" ADD COLUMN IF NOT EXISTS "instructions" text;

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('exams', 'sections') 
AND column_name = 'instructions';
