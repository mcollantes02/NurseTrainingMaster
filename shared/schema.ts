import { pgTable, text, serial, integer, boolean, timestamp, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: text("role").notNull().default("student"), // student, admin
  createdAt: timestamp("created_at").defaultNow(),
});

// Mock exams table
export const mockExams = pgTable("mock_exams", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Subjects table
export const subjects = pgTable("subjects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Topics table
export const topics = pgTable("topics", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Questions table
export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  mockExamId: integer("mock_exam_id").notNull().references(() => mockExams.id),
  subjectId: integer("subject_id").notNull().references(() => subjects.id),
  topicId: integer("topic_id").notNull().references(() => topics.id),
  type: text("type").notNull(), // error, doubt
  theory: text("theory").notNull(),
  isLearned: boolean("is_learned").default(false),
  failureCount: integer("failure_count").default(0),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Trash table for deleted questions
export const trashedQuestions = pgTable("trashed_questions", {
  id: serial("id").primaryKey(),
  originalId: integer("original_id").notNull(),
  mockExamId: integer("mock_exam_id").notNull(),
  mockExamTitle: text("mock_exam_title").notNull(),
  subjectId: integer("subject_id").notNull(),
  subjectName: text("subject_name").notNull(),
  topicId: integer("topic_id").notNull(),
  topicName: text("topic_name").notNull(),
  type: text("type").notNull(),
  theory: text("theory").notNull(),
  isLearned: boolean("is_learned").default(false),
  failureCount: integer("failure_count").default(0),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull(),
  deletedAt: timestamp("deleted_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  mockExams: many(mockExams),
  questions: many(questions),
}));

export const mockExamsRelations = relations(mockExams, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [mockExams.createdBy],
    references: [users.id],
  }),
  questions: many(questions),
}));

export const questionsRelations = relations(questions, ({ one }) => ({
  mockExam: one(mockExams, {
    fields: [questions.mockExamId],
    references: [mockExams.id],
  }),
  subject: one(subjects, {
    fields: [questions.subjectId],
    references: [subjects.id],
  }),
  topic: one(topics, {
    fields: [questions.topicId],
    references: [topics.id],
  }),
  createdBy: one(users, {
    fields: [questions.createdBy],
    references: [users.id],
  }),
}));

export const subjectsRelations = relations(subjects, ({ many }) => ({
  questions: many(questions),
}));

export const trashedQuestionsRelations = relations(trashedQuestions, ({ one }) => ({
  createdBy: one(users, {
    fields: [trashedQuestions.createdBy],
    references: [users.id],
  }),
}));

export const topicsRelations = relations(topics, ({ many }) => ({
  questions: many(questions),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertMockExamSchema = createInsertSchema(mockExams).omit({
  id: true,
  createdAt: true,
});

export const insertSubjectSchema = createInsertSchema(subjects).omit({
  id: true,
  createdAt: true,
});

export const insertTopicSchema = createInsertSchema(topics).omit({
  id: true,
  createdAt: true,
});

export const insertQuestionSchema = createInsertSchema(questions).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type MockExam = typeof mockExams.$inferSelect;
export type InsertMockExam = z.infer<typeof insertMockExamSchema>;

export type Subject = typeof subjects.$inferSelect;
export type InsertSubject = z.infer<typeof insertSubjectSchema>;

export type Topic = typeof topics.$inferSelect;
export type InsertTopic = z.infer<typeof insertTopicSchema>;

export type Question = typeof questions.$inferSelect;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;

// Extended types with relations
export type QuestionWithRelations = Question & {
  mockExam: MockExam;
  subject: Subject;
  topic: Topic;
  createdBy: User;
};

export type TrashedQuestion = typeof trashedQuestions.$inferSelect;
export type InsertTrashedQuestion = typeof trashedQuestions.$inferInsert;

export type TrashedQuestionWithUser = TrashedQuestion & {
  createdBy: User;
};

export type MockExamWithQuestionCount = MockExam & {
  questionCount: number;
};

// Firestore types
export type FirestoreTimestamp = {
  seconds: number;
  nanoseconds: number;
};

export type FirestoreUser = Omit<User, 'createdAt'> & {
  createdAt: FirestoreTimestamp;
};

export type FirestoreMockExam = Omit<MockExam, 'createdAt'> & {
  createdAt: FirestoreTimestamp;
};

export type FirestoreSubject = Omit<Subject, 'createdAt'> & {
  createdAt: FirestoreTimestamp;
};

export type FirestoreTopic = Omit<Topic, 'createdAt'> & {
  createdAt: FirestoreTimestamp;
};

export type FirestoreQuestion = Omit<Question, 'createdAt'> & {
  createdAt: FirestoreTimestamp;
};

export type FirestoreTrashedQuestion = Omit<TrashedQuestion, 'createdAt' | 'deletedAt'> & {
  createdAt: FirestoreTimestamp;
  deletedAt: FirestoreTimestamp;
};
