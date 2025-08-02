import { firestore } from './firebase';
import { Timestamp } from 'firebase-admin/firestore';

// Firestore collection names
export const COLLECTIONS = {
  MOCK_EXAMS: 'mock_exams',
  SUBJECTS: 'subjects',
  TOPICS: 'topics',
  QUESTIONS: 'questions',
  QUESTION_MOCK_EXAMS: 'question_mock_exams',
  TRASHED_QUESTIONS: 'trashed_questions',
} as const;

// MockExam document structure
export interface FirestoreMockExam {
  id: number;
  title: string;
  createdBy: string; // Firebase UID
  createdAt: Timestamp;
}

// Subject document structure
export interface FirestoreSubject {
  id: number;
  name: string;
  createdBy: string; // Firebase UID
  createdAt: Timestamp;
}

// Topic document structure
export interface FirestoreTopic {
  id: number;
  name: string;
  createdBy: string; // Firebase UID
  createdAt: Timestamp;
}

// Question document structure
export interface FirestoreQuestion {
  id: number;
  subjectId: number;
  topicId: number;
  type: string;
  theory: string;
  isLearned: boolean;
  failureCount: number;
  createdBy: string; // Firebase UID
  createdAt: Timestamp;
}

// QuestionMockExam relation document structure
export interface FirestoreQuestionMockExam {
  id: number;
  questionId: number;
  mockExamId: number;
  createdBy: string; // Firebase UID
  createdAt: Timestamp;
}

// TrashedQuestion document structure
export interface FirestoreTrashedQuestion {
  id: number;
  originalId: number;
  mockExamIds: number[];
  mockExamTitles: string[];
  subjectId: number;
  subjectName: string;
  topicId: number;
  topicName: string;
  type: string;
  theory: string;
  isLearned: boolean;
  failureCount: number;
  createdBy: string; // Firebase UID
  createdAt: Timestamp;
  deletedAt: Timestamp;
}

// Firestore query utilities (equivalent to the current storage.ts functionality)
export class FirestoreStorage {
  
  // Get subjects by user
  static async getSubjects(firebaseUid: string) {
    const snapshot = await firestore.collection(COLLECTIONS.SUBJECTS)
      .where('createdBy', '==', firebaseUid)
      .get();
    const subjects = snapshot.docs.map(doc => doc.data() as FirestoreSubject);
    // Sort in memory to avoid Firestore index requirement
    return subjects.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Get topics by user
  static async getTopics(firebaseUid: string) {
    const snapshot = await firestore.collection(COLLECTIONS.TOPICS)
      .where('createdBy', '==', firebaseUid)
      .get();
    const topics = snapshot.docs.map(doc => doc.data() as FirestoreTopic);
    // Sort in memory to avoid Firestore index requirement
    return topics.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Get mock exams by user
  static async getMockExamsByUser(firebaseUid: string) {
    const snapshot = await firestore.collection(COLLECTIONS.MOCK_EXAMS)
      .where('createdBy', '==', firebaseUid)
      .orderBy('createdAt', 'desc')
      .get();
    return snapshot.docs.map(doc => doc.data() as FirestoreMockExam);
  }

  // Get questions by user with pagination
  static async getQuestionsByUser(
    firebaseUid: string, 
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
      .where('createdBy', '==', firebaseUid);

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
  static async deleteQuestion(questionId: number, firebaseUid: string) {
    const querySnapshot = await firestore.collection(COLLECTIONS.QUESTIONS)
      .where('id', '==', questionId)
      .where('createdBy', '==', firebaseUid)
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