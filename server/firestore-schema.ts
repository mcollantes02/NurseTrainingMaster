
import { firestore } from './firebase';
import { Timestamp } from 'firebase-admin/firestore';

// Firestore collection names (same as PostgreSQL table names)
export const COLLECTIONS = {
  USERS: 'users',
  MOCK_EXAMS: 'mock_exams',
  SUBJECTS: 'subjects',
  TOPICS: 'topics',
  QUESTIONS: 'questions',
  TRASHED_QUESTIONS: 'trashed_questions',
} as const;

// User document structure
export interface FirestoreUser {
  id: number;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
  firebaseUid?: string;
  createdAt: Timestamp;
}

// MockExam document structure
export interface FirestoreMockExam {
  id: number;
  title: string;
  createdBy: number;
  createdAt: Timestamp;
}

// Subject document structure
export interface FirestoreSubject {
  id: number;
  name: string;
  createdAt: Timestamp;
}

// Topic document structure
export interface FirestoreTopic {
  id: number;
  name: string;
  createdAt: Timestamp;
}

// Question document structure
export interface FirestoreQuestion {
  id: number;
  mockExamId: number;
  subjectId: number;
  topicId: number;
  type: string;
  theory: string;
  isLearned: boolean;
  failureCount: number;
  createdBy: number;
  createdAt: Timestamp;
}

// TrashedQuestion document structure
export interface FirestoreTrashedQuestion {
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
  createdAt: Timestamp;
  deletedAt: Timestamp;
}



// Firestore query utilities (equivalent to the current storage.ts functionality)
export class FirestoreStorage {
  
  // Get all users
  static async getUsers() {
    const snapshot = await firestore.collection(COLLECTIONS.USERS).get();
    return snapshot.docs.map(doc => doc.data() as FirestoreUser);
  }

  // Get user by email
  static async getUserByEmail(email: string) {
    const snapshot = await firestore.collection(COLLECTIONS.USERS)
      .where('email', '==', email)
      .limit(1)
      .get();
    
    return snapshot.empty ? null : snapshot.docs[0].data() as FirestoreUser;
  }

  // Get subjects
  static async getSubjects() {
    const snapshot = await firestore.collection(COLLECTIONS.SUBJECTS)
      .orderBy('name')
      .get();
    return snapshot.docs.map(doc => doc.data() as FirestoreSubject);
  }

  // Get topics
  static async getTopics() {
    const snapshot = await firestore.collection(COLLECTIONS.TOPICS)
      .orderBy('name')
      .get();
    return snapshot.docs.map(doc => doc.data() as FirestoreTopic);
  }

  // Get mock exams by user
  static async getMockExamsByUser(userId: number) {
    const snapshot = await firestore.collection(COLLECTIONS.MOCK_EXAMS)
      .where('createdBy', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    return snapshot.docs.map(doc => doc.data() as FirestoreMockExam);
  }

  // Get questions by user with pagination
  static async getQuestionsByUser(
    userId: number, 
    limit: number = 20, 
    offset: number = 0,
    filters?: {
      mockExamIds?: number[];
      subjectIds?: number[];
      topicIds?: number[];
      learningStatus?: boolean[];
      types?: string[];
    }
  ) {
    let query = firestore.collection(COLLECTIONS.QUESTIONS)
      .where('createdBy', '==', userId);

    // Apply filters
    if (filters?.mockExamIds?.length) {
      query = query.where('mockExamId', 'in', filters.mockExamIds);
    }
    if (filters?.subjectIds?.length) {
      query = query.where('subjectId', 'in', filters.subjectIds);
    }
    if (filters?.topicIds?.length) {
      query = query.where('topicId', 'in', filters.topicIds);
    }
    if (filters?.types?.length) {
      query = query.where('type', 'in', filters.types);
    }
    if (filters?.learningStatus?.length === 1) {
      query = query.where('isLearned', '==', filters.learningStatus[0]);
    }

    const snapshot = await query
      .orderBy('createdAt', 'desc')
      .offset(offset)
      .limit(limit)
      .get();
    
    return snapshot.docs.map(doc => doc.data() as FirestoreQuestion);
  }

  // Create question
  static async createQuestion(question: Omit<FirestoreQuestion, 'id' | 'createdAt'>) {
    const docRef = firestore.collection(COLLECTIONS.QUESTIONS).doc();
    const questionData: FirestoreQuestion = {
      ...question,
      id: parseInt(docRef.id.slice(0, 9), 36), // Generate numeric ID from Firestore ID
      createdAt: Timestamp.now(),
    };
    
    await docRef.set(questionData);
    return questionData;
  }

  // Update question
  static async updateQuestion(questionId: number, updates: Partial<FirestoreQuestion>) {
    const querySnapshot = await firestore.collection(COLLECTIONS.QUESTIONS)
      .where('id', '==', questionId)
      .limit(1)
      .get();
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const doc = querySnapshot.docs[0];
    await doc.ref.update(updates);
    
    const updatedDoc = await doc.ref.get();
    return updatedDoc.data() as FirestoreQuestion;
  }

  // Delete question (move to trash)
  static async deleteQuestion(questionId: number, userId: number) {
    const querySnapshot = await firestore.collection(COLLECTIONS.QUESTIONS)
      .where('id', '==', questionId)
      .where('createdBy', '==', userId)
      .limit(1)
      .get();
    
    if (querySnapshot.empty) {
      return false;
    }
    
    const doc = querySnapshot.docs[0];
    const questionData = doc.data() as FirestoreQuestion;
    
    // Get related data for trashed question
    const [mockExamDoc, subjectDoc, topicDoc] = await Promise.all([
      firestore.collection(COLLECTIONS.MOCK_EXAMS).doc(questionData.mockExamId.toString()).get(),
      firestore.collection(COLLECTIONS.SUBJECTS).doc(questionData.subjectId.toString()).get(),
      firestore.collection(COLLECTIONS.TOPICS).doc(questionData.topicId.toString()).get(),
    ]);
    
    // Create trashed question
    const trashedQuestionRef = firestore.collection(COLLECTIONS.TRASHED_QUESTIONS).doc();
    const trashedQuestion: FirestoreTrashedQuestion = {
      id: parseInt(trashedQuestionRef.id.slice(0, 9), 36),
      originalId: questionData.id,
      mockExamId: questionData.mockExamId,
      mockExamTitle: mockExamDoc.data()?.title || '',
      subjectId: questionData.subjectId,
      subjectName: subjectDoc.data()?.name || '',
      topicId: questionData.topicId,
      topicName: topicDoc.data()?.name || '',
      type: questionData.type,
      theory: questionData.theory,
      isLearned: questionData.isLearned,
      failureCount: questionData.failureCount,
      createdBy: questionData.createdBy,
      createdAt: questionData.createdAt,
      deletedAt: Timestamp.now(),
    };
    
    // Batch operation: create trashed question and delete original
    const batch = firestore.batch();
    batch.set(trashedQuestionRef, trashedQuestion);
    batch.delete(doc.ref);
    
    await batch.commit();
    return true;
  }
}
