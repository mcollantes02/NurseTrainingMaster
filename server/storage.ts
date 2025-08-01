import { firestore } from './firebase';
import { Timestamp } from 'firebase-admin/firestore';
import { 
  COLLECTIONS,
  FirestoreUser,
  FirestoreMockExam,
  FirestoreSubject,
  FirestoreTopic,
  FirestoreQuestion,
  FirestoreTrashedQuestion
} from './firestore-schema';
import bcrypt from 'bcrypt';

export class Storage {
  // User methods
  async getUserByEmail(email: string): Promise<FirestoreUser | null> {
    const snapshot = await firestore.collection(COLLECTIONS.USERS)
      .where('email', '==', email)
      .limit(1)
      .get();

    return snapshot.empty ? null : snapshot.docs[0].data() as FirestoreUser;
  }

  async getUser(id: number): Promise<FirestoreUser | null> {
    const snapshot = await firestore.collection(COLLECTIONS.USERS)
      .where('id', '==', id)
      .limit(1)
      .get();

    return snapshot.empty ? null : snapshot.docs[0].data() as FirestoreUser;
  }

  async createUser(userData: Omit<FirestoreUser, 'id' | 'createdAt'>): Promise<FirestoreUser> {
    const docRef = firestore.collection(COLLECTIONS.USERS).doc();

    // Generate numeric ID from Firestore doc ID
    const numericId = parseInt(docRef.id.slice(-9), 36) % 1000000;

    const user: FirestoreUser = {
      ...userData,
      id: numericId,
      createdAt: Timestamp.now(),
    };

    await docRef.set(user);
    return user;
  }

  async updateUserRole(id: number, role: string): Promise<FirestoreUser | null> {
    const snapshot = await firestore.collection(COLLECTIONS.USERS)
      .where('id', '==', id)
      .limit(1)
      .get();

    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    await doc.ref.update({ role });

    const updatedDoc = await doc.ref.get();
    return updatedDoc.data() as FirestoreUser;
  }

  // Subject methods
  async getSubjects(): Promise<FirestoreSubject[]> {
    const snapshot = await firestore.collection(COLLECTIONS.SUBJECTS)
      .orderBy('name')
      .get();
    return snapshot.docs.map(doc => doc.data() as FirestoreSubject);
  }

  async getSubjectByName(name: string): Promise<FirestoreSubject | null> {
    const snapshot = await firestore.collection(COLLECTIONS.SUBJECTS)
      .where('name', '==', name)
      .limit(1)
      .get();

    return snapshot.empty ? null : snapshot.docs[0].data() as FirestoreSubject;
  }

  async createSubject(subjectData: { name: string }): Promise<FirestoreSubject> {
    const docRef = firestore.collection(COLLECTIONS.SUBJECTS).doc();
    const numericId = parseInt(docRef.id.slice(-9), 36) % 1000000;

    const subject: FirestoreSubject = {
      ...subjectData,
      id: numericId,
      createdAt: Timestamp.now(),
    };

    await docRef.set(subject);
    return subject;
  }

  async updateSubject(id: number, updates: { name: string }): Promise<FirestoreSubject | null> {
    const snapshot = await firestore.collection(COLLECTIONS.SUBJECTS)
      .where('id', '==', id)
      .limit(1)
      .get();

    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    await doc.ref.update(updates);

    const updatedDoc = await doc.ref.get();
    return updatedDoc.data() as FirestoreSubject;
  }

  async deleteSubject(id: number): Promise<boolean> {
    // Check if subject has associated questions
    const questionsSnapshot = await firestore.collection(COLLECTIONS.QUESTIONS)
      .where('subjectId', '==', id)
      .limit(1)
      .get();

    if (!questionsSnapshot.empty) return false;

    const snapshot = await firestore.collection(COLLECTIONS.SUBJECTS)
      .where('id', '==', id)
      .limit(1)
      .get();

    if (snapshot.empty) return false;

    await snapshot.docs[0].ref.delete();
    return true;
  }

  // Topic methods
  async getTopics(): Promise<FirestoreTopic[]> {
    const snapshot = await firestore.collection(COLLECTIONS.TOPICS)
      .orderBy('name')
      .get();
    return snapshot.docs.map(doc => doc.data() as FirestoreTopic);
  }

  async getTopicByName(name: string): Promise<FirestoreTopic | null> {
    const snapshot = await firestore.collection(COLLECTIONS.TOPICS)
      .where('name', '==', name)
      .limit(1)
      .get();

    return snapshot.empty ? null : snapshot.docs[0].data() as FirestoreTopic;
  }

  async createTopic(topicData: { name: string }): Promise<FirestoreTopic> {
    const docRef = firestore.collection(COLLECTIONS.TOPICS).doc();
    const numericId = parseInt(docRef.id.slice(-9), 36) % 1000000;

    const topic: FirestoreTopic = {
      ...topicData,
      id: numericId,
      createdAt: Timestamp.now(),
    };

    await docRef.set(topic);
    return topic;
  }

  async updateTopic(id: number, updates: { name: string }): Promise<FirestoreTopic | null> {
    const snapshot = await firestore.collection(COLLECTIONS.TOPICS)
      .where('id', '==', id)
      .limit(1)
      .get();

    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    await doc.ref.update(updates);

    const updatedDoc = await doc.ref.get();
    return updatedDoc.data() as FirestoreTopic;
  }

  async deleteTopic(id: number): Promise<boolean> {
    // Check if topic has associated questions
    const questionsSnapshot = await firestore.collection(COLLECTIONS.QUESTIONS)
      .where('topicId', '==', id)
      .limit(1)
      .get();

    if (!questionsSnapshot.empty) return false;

    const snapshot = await firestore.collection(COLLECTIONS.TOPICS)
      .where('id', '==', id)
      .limit(1)
      .get();

    if (snapshot.empty) return false;

    await snapshot.docs[0].ref.delete();
    return true;
  }

  // Mock Exam methods
  async getMockExams(userId: number): Promise<FirestoreMockExam[]> {
    const snapshot = await firestore.collection(COLLECTIONS.MOCK_EXAMS)
      .where('createdBy', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    return snapshot.docs.map(doc => doc.data() as FirestoreMockExam);
  }

  async createMockExam(mockExamData: Omit<FirestoreMockExam, 'id' | 'createdAt'>): Promise<FirestoreMockExam> {
    const docRef = firestore.collection(COLLECTIONS.MOCK_EXAMS).doc();
    const numericId = parseInt(docRef.id.slice(-9), 36) % 1000000;

    const mockExam: FirestoreMockExam = {
      ...mockExamData,
      id: numericId,
      createdAt: Timestamp.now(),
    };

    await docRef.set(mockExam);
    return mockExam;
  }

  async updateMockExam(id: number, updates: { title: string }, userId: number): Promise<FirestoreMockExam | null> {
    const snapshot = await firestore.collection(COLLECTIONS.MOCK_EXAMS)
      .where('id', '==', id)
      .where('createdBy', '==', userId)
      .limit(1)
      .get();

    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    await doc.ref.update(updates);

    const updatedDoc = await doc.ref.get();
    return updatedDoc.data() as FirestoreMockExam;
  }

  async deleteMockExam(id: number, userId: number): Promise<boolean> {
    // Check if mock exam has associated questions
    const questionsSnapshot = await firestore.collection(COLLECTIONS.QUESTIONS)
      .where('mockExamId', '==', id)
      .limit(1)
      .get();

    if (!questionsSnapshot.empty) return false;

    const snapshot = await firestore.collection(COLLECTIONS.MOCK_EXAMS)
      .where('id', '==', id)
      .where('createdBy', '==', userId)
      .limit(1)
      .get();

    if (snapshot.empty) return false;

    await snapshot.docs[0].ref.delete();
    return true;
  }

  // Question methods
  async getQuestions(filters: {
    userId: number;
    mockExamIds?: number[];
    subjectIds?: number[];
    topicIds?: number[];
    keywords?: string;
    learningStatus?: boolean[];
    failureCountExact?: number;
    failureCountMin?: number;
    failureCountMax?: number;
  }): Promise<FirestoreQuestion[]> {
    let query = firestore.collection(COLLECTIONS.QUESTIONS)
      .where('createdBy', '==', filters.userId);

    // Apply filters
    if (filters.mockExamIds?.length) {
      query = query.where('mockExamId', 'in', filters.mockExamIds);
    }
    if (filters.subjectIds?.length) {
      query = query.where('subjectId', 'in', filters.subjectIds);
    }
    if (filters.topicIds?.length) {
      query = query.where('topicId', 'in', filters.topicIds);
    }
    if (filters.learningStatus?.length === 1) {
      query = query.where('isLearned', '==', filters.learningStatus[0]);
    }
    if (filters.failureCountExact !== undefined) {
      query = query.where('failureCount', '==', filters.failureCountExact);
    }

    const snapshot = await query.orderBy('createdAt', 'desc').get();
    let questions = snapshot.docs.map(doc => doc.data() as FirestoreQuestion);

    // Apply additional filters that can't be done in Firestore query
    if (filters.keywords) {
      const keywords = filters.keywords.toLowerCase();
      questions = questions.filter(q => 
        q.theory.toLowerCase().includes(keywords)
      );
    }

    if (filters.failureCountMin !== undefined) {
      questions = questions.filter(q => q.failureCount >= filters.failureCountMin!);
    }

    if (filters.failureCountMax !== undefined) {
      questions = questions.filter(q => q.failureCount <= filters.failureCountMax!);
    }

    return questions;
  }

  async createQuestion(questionData: Omit<FirestoreQuestion, 'id' | 'createdAt'>): Promise<FirestoreQuestion> {
    const docRef = firestore.collection(COLLECTIONS.QUESTIONS).doc();
    const numericId = parseInt(docRef.id.slice(-9), 36) % 1000000;

    const question: FirestoreQuestion = {
      ...questionData,
      id: numericId,
      createdAt: Timestamp.now(),
    };

    await docRef.set(question);
    return question;
  }

  async updateQuestion(
    id: number, 
    updates: Partial<FirestoreQuestion>, 
    userId: number
  ): Promise<FirestoreQuestion | null> {
    const snapshot = await firestore.collection(COLLECTIONS.QUESTIONS)
      .where('id', '==', id)
      .where('createdBy', '==', userId)
      .limit(1)
      .get();

    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    await doc.ref.update(updates);

    const updatedDoc = await doc.ref.get();
    return updatedDoc.data() as FirestoreQuestion;
  }

  async updateQuestionLearned(id: number, isLearned: boolean, userId: number): Promise<FirestoreQuestion | null> {
    return this.updateQuestion(id, { isLearned }, userId);
  }

  async updateQuestionFailureCount(id: number, failureCount: number, userId: number): Promise<FirestoreQuestion | null> {
    return this.updateQuestion(id, { failureCount }, userId);
  }

  async deleteQuestion(id: number, userId: number): Promise<boolean> {
    const snapshot = await firestore.collection(COLLECTIONS.QUESTIONS)
      .where('id', '==', id)
      .where('createdBy', '==', userId)
      .limit(1)
      .get();

    if (snapshot.empty) return false;

    const question = snapshot.docs[0].data() as FirestoreQuestion;

    // Move to trash first
    await this.moveQuestionToTrash(question);

    // Delete from questions collection
    await snapshot.docs[0].ref.delete();
    return true;
  }

  private async moveQuestionToTrash(question: FirestoreQuestion): Promise<void> {
    // Get related data for trash
    const [mockExamSnapshot, subjectSnapshot, topicSnapshot] = await Promise.all([
      firestore.collection(COLLECTIONS.MOCK_EXAMS).where('id', '==', question.mockExamId).limit(1).get(),
      firestore.collection(COLLECTIONS.SUBJECTS).where('id', '==', question.subjectId).limit(1).get(),
      firestore.collection(COLLECTIONS.TOPICS).where('id', '==', question.topicId).limit(1).get()
    ]);

    const mockExam = !mockExamSnapshot.empty ? mockExamSnapshot.docs[0].data() as FirestoreMockExam : null;
    const subject = !subjectSnapshot.empty ? subjectSnapshot.docs[0].data() as FirestoreSubject : null;
    const topic = !topicSnapshot.empty ? topicSnapshot.docs[0].data() as FirestoreTopic : null;

    const docRef = firestore.collection(COLLECTIONS.TRASHED_QUESTIONS).doc();
    const numericId = parseInt(docRef.id.slice(-9), 36) % 1000000;

    const trashedQuestion: FirestoreTrashedQuestion = {
      id: numericId,
      originalId: question.id,
      mockExamId: question.mockExamId,
      mockExamTitle: mockExam?.title || 'Unknown',
      subjectId: question.subjectId,
      subjectName: subject?.name || 'Unknown',
      topicId: question.topicId,
      topicName: topic?.name || 'Unknown',
      type: question.type,
      theory: question.theory,
      isLearned: question.isLearned,
      failureCount: question.failureCount,
      createdBy: question.createdBy,
      createdAt: question.createdAt,
      deletedAt: Timestamp.now(),
    };

    await docRef.set(trashedQuestion);
  }

  // Trash methods
  async getTrashedQuestions(userId: number): Promise<FirestoreTrashedQuestion[]> {
    const snapshot = await firestore.collection(COLLECTIONS.TRASHED_QUESTIONS)
      .where('createdBy', '==', userId)
      .orderBy('deletedAt', 'desc')
      .get();
    return snapshot.docs.map(doc => doc.data() as FirestoreTrashedQuestion);
  }

  async restoreQuestion(trashedId: number, userId: number): Promise<boolean> {
    const snapshot = await firestore.collection(COLLECTIONS.TRASHED_QUESTIONS)
      .where('id', '==', trashedId)
      .where('createdBy', '==', userId)
      .limit(1)
      .get();

    if (snapshot.empty) return false;

    const trashedQuestion = snapshot.docs[0].data() as FirestoreTrashedQuestion;

    // Restore to questions collection
    const questionDocRef = firestore.collection(COLLECTIONS.QUESTIONS).doc();
    const numericId = parseInt(questionDocRef.id.slice(-9), 36) % 1000000;

    const restoredQuestion: FirestoreQuestion = {
      id: numericId,
      mockExamId: trashedQuestion.mockExamId,
      subjectId: trashedQuestion.subjectId,
      topicId: trashedQuestion.topicId,
      type: trashedQuestion.type,
      theory: trashedQuestion.theory,
      isLearned: trashedQuestion.isLearned,
      failureCount: trashedQuestion.failureCount,
      createdBy: trashedQuestion.createdBy,
      createdAt: trashedQuestion.createdAt,
    };

    await questionDocRef.set(restoredQuestion);

    // Delete from trash
    await snapshot.docs[0].ref.delete();
    return true;
  }

  async permanentlyDeleteQuestion(trashedId: number, userId: number): Promise<boolean> {
    const snapshot = await firestore.collection(COLLECTIONS.TRASHED_QUESTIONS)
      .where('id', '==', trashedId)
      .where('createdBy', '==', userId)
      .limit(1)
      .get();

    if (snapshot.empty) return false;

    await snapshot.docs[0].ref.delete();
    return true;
  }

  async emptyTrash(userId: number): Promise<void> {
    const snapshot = await firestore.collection(COLLECTIONS.TRASHED_QUESTIONS)
      .where('createdBy', '==', userId)
      .get();

    const batch = firestore.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
  }

  // User stats
  async getUserStats(userId: number): Promise<{
    totalQuestions: number;
    learnedQuestions: number;
    failedQuestions: number;
    averageFailureCount: number;
  }> {
    const snapshot = await firestore.collection(COLLECTIONS.QUESTIONS)
      .where('createdBy', '==', userId)
      .get();

    const questions = snapshot.docs.map(doc => doc.data() as FirestoreQuestion);

    const totalQuestions = questions.length;
    const learnedQuestions = questions.filter(q => q.isLearned).length;
    const failedQuestions = questions.filter(q => q.failureCount > 0).length;
    const averageFailureCount = totalQuestions > 0 
      ? questions.reduce((sum, q) => sum + q.failureCount, 0) / totalQuestions 
      : 0;

    return {
      totalQuestions,
      learnedQuestions,
      failedQuestions,
      averageFailureCount,
    };
  }
}

export const storage = new Storage();