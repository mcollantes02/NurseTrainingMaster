
-- Add failure_count column to questions table
ALTER TABLE questions ADD COLUMN failure_count INTEGER DEFAULT 0;

-- Add failure_count column to trashed_questions table
ALTER TABLE trashed_questions ADD COLUMN failure_count INTEGER DEFAULT 0;
