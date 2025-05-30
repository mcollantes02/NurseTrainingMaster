import {
  users,
  mockExams,
  subjects,
  topics,
  questions,
  type User,
  type InsertUser,
  type MockExam,
  type InsertMockExam,
  type MockExamWithQuestionCount,
  type Subject,
  type InsertSubject,
  type Topic,
  type InsertTopic,
  type Question,
  type InsertQuestion,
  type QuestionWithRelations,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, like, inArray, count, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Mock exam operations
  getMockExams(userId: number): Promise<MockExamWithQuestionCount[]>;
  createMockExam(mockExam: InsertMockExam): Promise<MockExam>;

  // Subject operations
  getSubjects(): Promise<Subject[]>;
  createSubject(subject: InsertSubject): Promise<Subject>;
  getSubjectByName(name: string): Promise<Subject | undefined>;

  // Topic operations
  getTopics(): Promise<Topic[]>;
  createTopic(topic: InsertTopic): Promise<Topic>;
  getTopicByName(name: string): Promise<Topic | undefined>;

  // Question operations
  getQuestions(filters: {
    mockExamIds?: number[];
    subjectIds?: number[];
    topicIds?: number[];
    keywords?: string;
    learningStatus?: boolean[];
    userId: number;
  }): Promise<QuestionWithRelations[]>;
  createQuestion(question: InsertQuestion): Promise<Question>;
  updateQuestionLearned(id: number, isLearned: boolean, userId: number): Promise<Question | undefined>;

  // Stats
  getUserStats(userId: number): Promise<{
    completedExams: number;
    learnedQuestions: number;
    totalQuestions: number;
    progressPercentage: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getMockExams(userId: number): Promise<MockExamWithQuestionCount[]> {
    const result = await db
      .select({
        id: mockExams.id,
        title: mockExams.title,
        createdBy: mockExams.createdBy,
        createdAt: mockExams.createdAt,
        questionCount: count(questions.id),
      })
      .from(mockExams)
      .leftJoin(questions, eq(questions.mockExamId, mockExams.id))
      .where(eq(mockExams.createdBy, userId))
      .groupBy(mockExams.id, mockExams.title, mockExams.createdBy, mockExams.createdAt)
      .orderBy(mockExams.createdAt);

    return result;
  }

  async createMockExam(mockExam: InsertMockExam): Promise<MockExam> {
    const [exam] = await db.insert(mockExams).values(mockExam).returning();
    return exam;
  }

  async getSubjects(): Promise<Subject[]> {
    return await db.select().from(subjects).orderBy(subjects.name);
  }

  async createSubject(subject: InsertSubject): Promise<Subject> {
    const [newSubject] = await db.insert(subjects).values(subject).returning();
    return newSubject;
  }

  async getSubjectByName(name: string): Promise<Subject | undefined> {
    const [subject] = await db.select().from(subjects).where(eq(subjects.name, name));
    return subject;
  }

  async getTopics(): Promise<Topic[]> {
    return await db.select().from(topics).orderBy(topics.name);
  }

  async createTopic(topic: InsertTopic): Promise<Topic> {
    const [newTopic] = await db.insert(topics).values(topic).returning();
    return newTopic;
  }

  async getTopicByName(name: string): Promise<Topic | undefined> {
    const [topic] = await db.select().from(topics).where(eq(topics.name, name));
    return topic;
  }

  async getQuestions(filters: {
    mockExamIds?: number[];
    subjectIds?: number[];
    topicIds?: number[];
    keywords?: string;
    learningStatus?: boolean[];
    userId: number;
  }): Promise<QuestionWithRelations[]> {
    const conditions = [eq(mockExams.createdBy, filters.userId)];

    if (filters.mockExamIds && filters.mockExamIds.length > 0) {
      conditions.push(inArray(questions.mockExamId, filters.mockExamIds));
    }

    if (filters.subjectIds && filters.subjectIds.length > 0) {
      conditions.push(inArray(questions.subjectId, filters.subjectIds));
    }

    if (filters.topicIds && filters.topicIds.length > 0) {
      conditions.push(inArray(questions.topicId, filters.topicIds));
    }

    if (filters.keywords) {
      conditions.push(like(questions.theory, `%${filters.keywords}%`));
    }

    if (filters.learningStatus && filters.learningStatus.length > 0) {
      conditions.push(inArray(questions.isLearned, filters.learningStatus));
    }

    const result = await db
      .select({
        id: questions.id,
        mockExamId: questions.mockExamId,
        subjectId: questions.subjectId,
        topicId: questions.topicId,
        type: questions.type,
        theory: questions.theory,
        isLearned: questions.isLearned,
        createdBy: questions.createdBy,
        createdAt: questions.createdAt,
        mockExam: {
          id: mockExams.id,
          title: mockExams.title,
          createdBy: mockExams.createdBy,
          createdAt: mockExams.createdAt,
        },
        subject: {
          id: subjects.id,
          name: subjects.name,
          createdAt: subjects.createdAt,
        },
        topic: {
          id: topics.id,
          name: topics.name,
          createdAt: topics.createdAt,
        },
        createdByUser: {
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          createdAt: users.createdAt,
          password: users.password,
        },
      })
      .from(questions)
      .innerJoin(mockExams, eq(questions.mockExamId, mockExams.id))
      .innerJoin(subjects, eq(questions.subjectId, subjects.id))
      .innerJoin(topics, eq(questions.topicId, topics.id))
      .innerJoin(users, eq(questions.createdBy, users.id))
      .where(and(...conditions))
      .orderBy(questions.createdAt);

    return result.map((row) => ({
      id: row.id,
      mockExamId: row.mockExamId,
      subjectId: row.subjectId,
      topicId: row.topicId,
      type: row.type,
      theory: row.theory,
      isLearned: row.isLearned,
      createdBy: row.createdByUser,
      createdAt: row.createdAt,
      mockExam: row.mockExam,
      subject: row.subject,
      topic: row.topic,
    }));
  }

  async createQuestion(question: InsertQuestion): Promise<Question> {
    const [newQuestion] = await db.insert(questions).values(question).returning();
    return newQuestion;
  }

  async updateQuestionLearned(
    id: number,
    isLearned: boolean,
    userId: number
  ): Promise<Question | undefined> {
    const [updatedQuestion] = await db
      .update(questions)
      .set({ isLearned })
      .where(and(eq(questions.id, id), eq(questions.createdBy, userId)))
      .returning();
    return updatedQuestion;
  }

  async getUserStats(userId: number): Promise<{
    completedExams: number;
    learnedQuestions: number;
    totalQuestions: number;
    progressPercentage: number;
  }> {
    const [examCount] = await db
      .select({ count: count() })
      .from(mockExams)
      .where(eq(mockExams.createdBy, userId));

    const [learnedCount] = await db
      .select({ count: count() })
      .from(questions)
      .innerJoin(mockExams, eq(questions.mockExamId, mockExams.id))
      .where(and(eq(mockExams.createdBy, userId), eq(questions.isLearned, true)));

    const [totalCount] = await db
      .select({ count: count() })
      .from(questions)
      .innerJoin(mockExams, eq(questions.mockExamId, mockExams.id))
      .where(eq(mockExams.createdBy, userId));

    const completedExams = examCount.count;
    const learnedQuestions = learnedCount.count;
    const totalQuestions = totalCount.count;
    const progressPercentage = totalQuestions > 0 ? Math.round((learnedQuestions / totalQuestions) * 100) : 0;

    return {
      completedExams,
      learnedQuestions,
      totalQuestions,
      progressPercentage,
    };
  }
}

export const storage = new DatabaseStorage();
