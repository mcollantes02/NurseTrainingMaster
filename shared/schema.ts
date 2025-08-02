import { z } from "zod";

// Input validation schemas (for API requests)
export const insertUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.string().default('user'),
});

export const insertMockExamSchema = z.object({
  title: z.string().min(1),
  createdBy: z.number(),
});

export const insertSubjectSchema = z.object({
  name: z.string().min(1),
  createdBy: z.number(),
});

export const insertTopicSchema = z.object({
  name: z.string().min(1),
  createdBy: z.number(),
});

export const insertQuestionSchema = z.object({
  mockExamId: z.number(),
  subjectId: z.number(),
  topicId: z.number(),
  type: z.string(),
  theory: z.string(),
  isLearned: z.boolean().default(false),
  failureCount: z.number().default(0),
  createdBy: z.number(),
});

// Firestore types
export type FirestoreTimestamp = {
  seconds: number;
  nanoseconds: number;
};

// Base types (matching Firestore documents)
export type User = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  firebaseUid?: string;
  createdAt: Date;
};

export type MockExam = {
  id: number;
  title: string;
  createdBy: number;
  createdAt: Date;
};

export type Subject = {
  id: number;
  name: string;
  createdBy: number;
  createdAt: Date;
};

export type Topic = {
  id: number;
  name: string;
  createdBy: number;
  createdAt: Date;
};

export type Question = {
  id: number;
  mockExamId: number;
  subjectId: number;
  topicId: number;
  type: string;
  theory: string;
  isLearned: boolean;
  failureCount: number;
  createdBy: number;
  createdAt: Date;
};

export type TrashedQuestion = {
  id: number;
  originalId: number;
  mockExamId: number;
  mockExamTitle: string;
  subjectId: number;
  subjectName: string;
  topicId: number;
  topicName: string;
  type: string;
  theory: string;
  isLearned: boolean;
  failureCount: number;
  createdBy: number;
  createdAt: Date;
  deletedAt: Date;
};

// Insert types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertMockExam = z.infer<typeof insertMockExamSchema>;
export type InsertSubject = z.infer<typeof insertSubjectSchema>;
export type InsertTopic = z.infer<typeof insertTopicSchema>;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;

// Extended types with relations
export type QuestionWithRelations = Question & {
  mockExam: MockExam;
  subject: Subject;
  topic: Topic;
  createdBy: User;
};

export type TrashedQuestionWithUser = TrashedQuestion & {
  createdBy: User;
};

export type MockExamWithQuestionCount = MockExam & {
  questionCount: number;
};

// Firestore document types
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