
import { firestore } from './firebase';
import { 
  users, 
  mockExams, 
  subjects, 
  topics, 
  questions, 
  trashedQuestions 
} from '@shared/schema';
import { db } from './db';

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
  createdAt: FirebaseFirestore.Timestamp;
}

// MockExam document structure
export interface FirestoreMockExam {
  id: number;
  title: string;
  createdBy: number;
  createdAt: FirebaseFirestore.Timestamp;
}

// Subject document structure
export interface FirestoreSubject {
  id: number;
  name: string;
  createdAt: FirebaseFirestore.Timestamp;
}

// Topic document structure
export interface FirestoreTopic {
  id: number;
  name: string;
  createdAt: FirebaseFirestore.Timestamp;
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
  createdAt: FirebaseFirestore.Timestamp;
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
  createdAt: FirebaseFirestore.Timestamp;
  deletedAt: FirebaseFirestore.Timestamp;
}

// Migration utilities
export class FirestoreMigration {
  
  // Create Firestore collections with indexes
  static async createCollectionsAndIndexes() {
    const batch = firestore.batch();
    
    // Create collections by adding a dummy document (will be deleted after)
    const collections = Object.values(COLLECTIONS);
    
    for (const collectionName of collections) {
      const dummyRef = firestore.collection(collectionName).doc('_dummy');
      batch.set(dummyRef, { _temp: true });
    }
    
    await batch.commit();
    
    // Delete dummy documents
    const deleteBatch = firestore.batch();
    for (const collectionName of collections) {
      const dummyRef = firestore.collection(collectionName).doc('_dummy');
      deleteBatch.delete(dummyRef);
    }
    
    await deleteBatch.commit();
    
    console.log('Firestore collections created successfully');
  }

  // Migrate users table
  static async migrateUsers() {
    const pgUsers = await db.select().from(users);
    const batch = firestore.batch();
    
    for (const user of pgUsers) {
      const docRef = firestore.collection(COLLECTIONS.USERS).doc(user.id.toString());
      const firestoreUser: FirestoreUser = {
        id: user.id,
        email: user.email,
        password: user.password,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        createdAt: FirebaseFirestore.Timestamp.fromDate(user.createdAt || new Date()),
      };
      batch.set(docRef, firestoreUser);
    }
    
    await batch.commit();
    console.log(`Migrated ${pgUsers.length} users to Firestore`);
  }

  // Migrate subjects table
  static async migrateSubjects() {
    const pgSubjects = await db.select().from(subjects);
    const batch = firestore.batch();
    
    for (const subject of pgSubjects) {
      const docRef = firestore.collection(COLLECTIONS.SUBJECTS).doc(subject.id.toString());
      const firestoreSubject: FirestoreSubject = {
        id: subject.id,
        name: subject.name,
        createdAt: FirebaseFirestore.Timestamp.fromDate(subject.createdAt || new Date()),
      };
      batch.set(docRef, firestoreSubject);
    }
    
    await batch.commit();
    console.log(`Migrated ${pgSubjects.length} subjects to Firestore`);
  }

  // Migrate topics table
  static async migrateTopics() {
    const pgTopics = await db.select().from(topics);
    const batch = firestore.batch();
    
    for (const topic of pgTopics) {
      const docRef = firestore.collection(COLLECTIONS.TOPICS).doc(topic.id.toString());
      const firestoreTopic: FirestoreTopic = {
        id: topic.id,
        name: topic.name,
        createdAt: FirebaseFirestore.Timestamp.fromDate(topic.createdAt || new Date()),
      };
      batch.set(docRef, firestoreTopic);
    }
    
    await batch.commit();
    console.log(`Migrated ${pgTopics.length} topics to Firestore`);
  }

  // Migrate mock_exams table
  static async migrateMockExams() {
    const pgMockExams = await db.select().from(mockExams);
    const batch = firestore.batch();
    
    for (const mockExam of pgMockExams) {
      const docRef = firestore.collection(COLLECTIONS.MOCK_EXAMS).doc(mockExam.id.toString());
      const firestoreMockExam: FirestoreMockExam = {
        id: mockExam.id,
        title: mockExam.title,
        createdBy: mockExam.createdBy,
        createdAt: FirebaseFirestore.Timestamp.fromDate(mockExam.createdAt || new Date()),
      };
      batch.set(docRef, firestoreMockExam);
    }
    
    await batch.commit();
    console.log(`Migrated ${pgMockExams.length} mock exams to Firestore`);
  }

  // Migrate questions table
  static async migrateQuestions() {
    const pgQuestions = await db.select().from(questions);
    
    // Process in batches of 500 (Firestore batch limit)
    const batchSize = 500;
    for (let i = 0; i < pgQuestions.length; i += batchSize) {
      const batch = firestore.batch();
      const questionsChunk = pgQuestions.slice(i, i + batchSize);
      
      for (const question of questionsChunk) {
        const docRef = firestore.collection(COLLECTIONS.QUESTIONS).doc(question.id.toString());
        const firestoreQuestion: FirestoreQuestion = {
          id: question.id,
          mockExamId: question.mockExamId,
          subjectId: question.subjectId,
          topicId: question.topicId,
          type: question.type,
          theory: question.theory,
          isLearned: question.isLearned || false,
          failureCount: question.failureCount || 0,
          createdBy: question.createdBy,
          createdAt: FirebaseFirestore.Timestamp.fromDate(question.createdAt || new Date()),
        };
        batch.set(docRef, firestoreQuestion);
      }
      
      await batch.commit();
      console.log(`Migrated questions batch ${i / batchSize + 1} to Firestore`);
    }
    
    console.log(`Migrated ${pgQuestions.length} questions to Firestore`);
  }

  // Migrate trashed_questions table
  static async migrateTrashedQuestions() {
    const pgTrashedQuestions = await db.select().from(trashedQuestions);
    const batch = firestore.batch();
    
    for (const trashedQuestion of pgTrashedQuestions) {
      const docRef = firestore.collection(COLLECTIONS.TRASHED_QUESTIONS).doc(trashedQuestion.id.toString());
      const firestoreTrashedQuestion: FirestoreTrashedQuestion = {
        id: trashedQuestion.id,
        originalId: trashedQuestion.originalId,
        mockExamId: trashedQuestion.mockExamId,
        mockExamTitle: trashedQuestion.mockExamTitle,
        subjectId: trashedQuestion.subjectId,
        subjectName: trashedQuestion.subjectName,
        topicId: trashedQuestion.topicId,
        topicName: trashedQuestion.topicName,
        type: trashedQuestion.type,
        theory: trashedQuestion.theory,
        isLearned: trashedQuestion.isLearned || false,
        failureCount: trashedQuestion.failureCount || 0,
        createdBy: trashedQuestion.createdBy,
        createdAt: FirebaseFirestore.Timestamp.fromDate(trashedQuestion.createdAt),
        deletedAt: FirebaseFirestore.Timestamp.fromDate(trashedQuestion.deletedAt || new Date()),
      };
      batch.set(docRef, firestoreTrashedQuestion);
    }
    
    await batch.commit();
    console.log(`Migrated ${pgTrashedQuestions.length} trashed questions to Firestore`);
  }

  // Run complete migration
  static async runFullMigration() {
    try {
      console.log('Starting Firestore migration...');
      
      await this.createCollectionsAndIndexes();
      await this.migrateUsers();
      await this.migrateSubjects();
      await this.migrateTopics();
      await this.migrateMockExams();
      await this.migrateQuestions();
      await this.migrateTrashedQuestions();
      
      console.log('Firestore migration completed successfully!');
    } catch (error) {
      console.error('Error during migration:', error);
      throw error;
    }
  }
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
      createdAt: FirebaseFirestore.Timestamp.now(),
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
      deletedAt: FirebaseFirestore.Timestamp.now(),
    };
    
    // Batch operation: create trashed question and delete original
    const batch = firestore.batch();
    batch.set(trashedQuestionRef, trashedQuestion);
    batch.delete(doc.ref);
    
    await batch.commit();
    return true;
  }
}
