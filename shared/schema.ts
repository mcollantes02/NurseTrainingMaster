import { z } from "zod";

// Input validation schemas (for API requests)
export const insertMockExamSchema = z.object({
  title: z.string().min(1),
  createdBy: z.string(), // Firebase UID
});

export const insertSubjectSchema = z.object({
  name: z.string().min(1),
  createdBy: z.string(), // Firebase UID
});

export const insertTopicSchema = z.object({
  name: z.string().min(1),
  createdBy: z.string(), // Firebase UID
});

export const insertQuestionSchema = z.object({
  mockExamId: z.number(),
  subjectId: z.number(),
  topicId: z.number(),
  type: z.string(),
  theory: z.string(),
  isLearned: z.boolean().default(false),
  failureCount: z.number().default(0),
  createdBy: z.string(), // Firebase UID
});

// Firestore types
export type FirestoreTimestamp = {
  seconds: number;
  nanoseconds: number;
};

// Base types (matching Firestore documents)
export type User = {
  uid: string;
  email: string;
  name?: string;
  picture?: string;
};

export type MockExam = {
  id: number;
  title: string;
  createdBy: string; // Firebase UID
  createdAt: Date;
};

export type Subject = {
  id: number;
  name: string;
  createdBy: string; // Firebase UID
  createdAt: Date;
};

export type Topic = {
  id: number;
  name: string;
  createdBy: string; // Firebase UID
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
  createdBy: string; // Firebase UID
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
  createdBy: string; // Firebase UID
  createdAt: Date;
  deletedAt: Date;
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