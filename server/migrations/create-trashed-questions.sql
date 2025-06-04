
CREATE TABLE IF NOT EXISTS "trashed_questions" (
  "id" SERIAL PRIMARY KEY,
  "original_id" INTEGER NOT NULL,
  "mock_exam_id" INTEGER NOT NULL,
  "mock_exam_title" TEXT NOT NULL,
  "subject_id" INTEGER NOT NULL,
  "subject_name" TEXT NOT NULL,
  "topic_id" INTEGER NOT NULL,
  "topic_name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "theory" TEXT NOT NULL,
  "is_learned" BOOLEAN DEFAULT false,
  "created_by" INTEGER NOT NULL REFERENCES "users"("id"),
  "created_at" TIMESTAMP NOT NULL,
  "deleted_at" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_trashed_questions_created_by" ON "trashed_questions"("created_by");
CREATE INDEX IF NOT EXISTS "idx_trashed_questions_deleted_at" ON "trashed_questions"("deleted_at");
