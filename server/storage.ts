import { firestore } from './firebase';
import { Timestamp } from 'firebase-admin/firestore';
import { 
  COLLECTIONS,
  FirestoreMockExam,
  FirestoreSubject,
  FirestoreTopic,
  FirestoreQuestion,
  FirestoreTrashedQuestion
} from './firestore-schema';

export class Storage {
  // Subject methods
  async getSubjects(firebaseUid: string): Promise<FirestoreSubject[]> {
    const snapshot = await firestore.collection(COLLECTIONS.SUBJECTS)
      .where('createdBy', '==', firebaseUid)
      .get();
    const subjects = snapshot.docs.map(doc => doc.data() as FirestoreSubject);
    // Sort in memory to avoid Firestore index requirement
    return subjects.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getSubjectByName(name: string, firebaseUid: string): Promise<FirestoreSubject | null> {
    const snapshot = await firestore.collection(COLLECTIONS.SUBJECTS)
      .where('name', '==', name)
      .where('createdBy', '==', firebaseUid)
      .limit(1)
      .get();

    return snapshot.empty ? null : snapshot.docs[0].data() as FirestoreSubject;
  }

  async createSubject(subjectData: { name: string; createdBy: string }): Promise<FirestoreSubject> {
    const docRef = firestore.collection(COLLECTIONS.SUBJECTS).doc();
    const numericId = Math.abs(docRef.id.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0)) % 1000000;

    const subject: FirestoreSubject = {
      ...subjectData,
      id: numericId,
      createdAt: Timestamp.now(),
    };

    await docRef.set(subject);
    return subject;
  }

  async updateSubject(id: number, updates: { name: string }, firebaseUid: string): Promise<FirestoreSubject | null> {
    const snapshot = await firestore.collection(COLLECTIONS.SUBJECTS)
      .where('id', '==', id)
      .where('createdBy', '==', firebaseUid)
      .limit(1)
      .get();

    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    await doc.ref.update(updates);

    const updatedDoc = await doc.ref.get();
    return updatedDoc.data() as FirestoreSubject;
  }

  async deleteSubject(id: number, firebaseUid: string): Promise<boolean> {
    // Check if subject has associated questions
    const questionsSnapshot = await firestore.collection(COLLECTIONS.QUESTIONS)
      .where('subjectId', '==', id)
      .where('createdBy', '==', firebaseUid)
      .limit(1)
      .get();

    if (!questionsSnapshot.empty) {
      return false; // Cannot delete subject with associated questions
    }

    const snapshot = await firestore.collection(COLLECTIONS.SUBJECTS)
      .where('id', '==', id)
      .where('createdBy', '==', firebaseUid)
      .limit(1)
      .get();

    if (snapshot.empty) return false;

    await snapshot.docs[0].ref.delete();
    return true;
  }

  // Topic methods
  async getTopics(firebaseUid: string): Promise<FirestoreTopic[]> {
    const snapshot = await firestore.collection(COLLECTIONS.TOPICS)
      .where('createdBy', '==', firebaseUid)
      .get();
    const topics = snapshot.docs.map(doc => doc.data() as FirestoreTopic);
    // Sort in memory to avoid Firestore index requirement
    return topics.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getTopicByName(name: string, firebaseUid: string): Promise<FirestoreTopic | null> {
    const snapshot = await firestore.collection(COLLECTIONS.TOPICS)
      .where('name', '==', name)
      .where('createdBy', '==', firebaseUid)
      .limit(1)
      .get();

    return snapshot.empty ? null : snapshot.docs[0].data() as FirestoreTopic;
  }

  async createTopic(topicData: { name: string; createdBy: string }): Promise<FirestoreTopic> {
    const docRef = firestore.collection(COLLECTIONS.TOPICS).doc();
    const numericId = Math.abs(docRef.id.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0)) % 1000000;

    const topic: FirestoreTopic = {
      ...topicData,
      id: numericId,
      createdAt: Timestamp.now(),
    };

    await docRef.set(topic);
    return topic;
  }

  async updateTopic(id: number, updates: { name: string }, firebaseUid: string): Promise<FirestoreTopic | null> {
    const snapshot = await firestore.collection(COLLECTIONS.TOPICS)
      .where('id', '==', id)
      .where('createdBy', '==', firebaseUid)
      .limit(1)
      .get();

    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    await doc.ref.update(updates);

    const updatedDoc = await doc.ref.get();
    return updatedDoc.data() as FirestoreTopic;
  }

  async deleteTopic(id: number, firebaseUid: string): Promise<boolean> {
    // Check if topic has associated questions
    const questionsSnapshot = await firestore.collection(COLLECTIONS.QUESTIONS)
      .where('topicId', '==', id)
      .where('createdBy', '==', firebaseUid)
      .limit(1)
      .get();

    if (!questionsSnapshot.empty) {
      return false; // Cannot delete topic with associated questions
    }

    const snapshot = await firestore.collection(COLLECTIONS.TOPICS)
      .where('id', '==', id)
      .where('createdBy', '==', firebaseUid)
      .limit(1)
      .get();

    if (snapshot.empty) return false;

    await snapshot.docs[0].ref.delete();
    return true;
  }

  // Mock Exam methods
  async getMockExams(firebaseUid: string): Promise<FirestoreMockExam[]> {
    const snapshot = await firestore.collection(COLLECTIONS.MOCK_EXAMS)
      .where('createdBy', '==', firebaseUid)
      .get();
    const mockExams = snapshot.docs.map(doc => doc.data() as FirestoreMockExam);
    // Sort in memory to avoid Firestore composite index requirement
    return mockExams.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
  }

  async createMockExam(mockExamData: Omit<FirestoreMockExam, 'id' | 'createdAt'>): Promise<FirestoreMockExam> {
    const docRef = firestore.collection(COLLECTIONS.MOCK_EXAMS).doc();
    const numericId = Math.abs(docRef.id.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0)) % 1000000;

    const mockExam: FirestoreMockExam = {
      ...mockExamData,
      id: numericId,
      createdAt: Timestamp.now(),
    };

    await docRef.set(mockExam);
    return mockExam;
  }

  async updateMockExam(id: number, updates: { title: string }, firebaseUid: string): Promise<FirestoreMockExam | null> {
    const snapshot = await firestore.collection(COLLECTIONS.MOCK_EXAMS)
      .where('id', '==', id)
      .where('createdBy', '==', firebaseUid)
      .limit(1)
      .get();

    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    await doc.ref.update(updates);

    const updatedDoc = await doc.ref.get();
    return updatedDoc.data() as FirestoreMockExam;
  }

  async deleteMockExam(id: number, firebaseUid: string): Promise<boolean> {
    // Check if mock exam has associated questions
    const questionsSnapshot = await firestore.collection(COLLECTIONS.QUESTIONS)
      .where('mockExamId', '==', id)
      .where('createdBy', '==', firebaseUid)
      .limit(1)
      .get();

    if (!questionsSnapshot.empty) return false;

    const snapshot = await firestore.collection(COLLECTIONS.MOCK_EXAMS)
      .where('id', '==', id)
      .where('createdBy', '==', firebaseUid)
      .limit(1)
      .get();

    if (snapshot.empty) return false;

    await snapshot.docs[0].ref.delete();
    return true;
  }

  // Question methods
  async getQuestions(filters: {
    firebaseUid: string;
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
      .where('createdBy', '==', filters.firebaseUid);

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

    const snapshot = await query.get();
    let questions = snapshot.docs.map(doc => doc.data() as FirestoreQuestion);

    // Sort in memory to avoid Firestore composite index requirement
    questions = questions.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);

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
    const numericId = Math.abs(docRef.id.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0)) % 1000000;

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
    firebaseUid: string
  ): Promise<FirestoreQuestion | null> {
    const snapshot = await firestore.collection(COLLECTIONS.QUESTIONS)
      .where('id', '==', id)
      .where('createdBy', '==', firebaseUid)
      .limit(1)
      .get();

    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    await doc.ref.update(updates);

    const updatedDoc = await doc.ref.get();
    return updatedDoc.data() as FirestoreQuestion;
  }

  async updateQuestionLearned(id: number, isLearned: boolean, firebaseUid: string): Promise<FirestoreQuestion | null> {
    return this.updateQuestion(id, { isLearned }, firebaseUid);
  }

  async updateQuestionFailureCount(id: number, failureCount: number, firebaseUid: string): Promise<FirestoreQuestion | null> {
    return this.updateQuestion(id, { failureCount }, firebaseUid);
  }

  async deleteQuestion(id: number, firebaseUid: string): Promise<boolean> {
    const snapshot = await firestore.collection(COLLECTIONS.QUESTIONS)
      .where('id', '==', id)
      .where('createdBy', '==', firebaseUid)
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
      firestore.collection(COLLECTIONS.MOCK_EXAMS)
        .where('id', '==', question.mockExamId)
        .where('createdBy', '==', question.createdBy)
        .limit(1).get(),
      firestore.collection(COLLECTIONS.SUBJECTS)
        .where('id', '==', question.subjectId)
        .where('createdBy', '==', question.createdBy)
        .limit(1).get(),
      firestore.collection(COLLECTIONS.TOPICS)
        .where('id', '==', question.topicId)
        .where('createdBy', '==', question.createdBy)
        .limit(1).get()
    ]);

    const mockExam = !mockExamSnapshot.empty ? mockExamSnapshot.docs[0].data() as FirestoreMockExam : null;
    const subject = !subjectSnapshot.empty ? subjectSnapshot.docs[0].data() as FirestoreSubject : null;
    const topic = !topicSnapshot.empty ? topicSnapshot.docs[0].data() as FirestoreTopic : null;

    const docRef = firestore.collection(COLLECTIONS.TRASHED_QUESTIONS).doc();
    const numericId = Math.abs(docRef.id.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0)) % 1000000;

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
  async getTrashedQuestions(firebaseUid: string): Promise<FirestoreTrashedQuestion[]> {
    const snapshot = await firestore.collection(COLLECTIONS.TRASHED_QUESTIONS)
      .where('createdBy', '==', firebaseUid)
      .get();
    const trashedQuestions = snapshot.docs.map(doc => doc.data() as FirestoreTrashedQuestion);
    // Sort in memory to avoid Firestore composite index requirement
    return trashedQuestions.sort((a, b) => b.deletedAt.seconds - a.deletedAt.seconds);
  }

  async restoreQuestion(trashedId: number, firebaseUid: string): Promise<boolean> {
    const snapshot = await firestore.collection(COLLECTIONS.TRASHED_QUESTIONS)
      .where('id', '==', trashedId)
      .where('createdBy', '==', firebaseUid)
      .limit(1)
      .get();

    if (snapshot.empty) return false;

    const trashedQuestion = snapshot.docs[0].data() as FirestoreTrashedQuestion;

    // Restore to questions collection
    const questionDocRef = firestore.collection(COLLECTIONS.QUESTIONS).doc();
    const numericId = Math.abs(questionDocRef.id.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0)) % 1000000;

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

  async permanentlyDeleteQuestion(trashedId: number, firebaseUid: string): Promise<boolean> {
    const snapshot = await firestore.collection(COLLECTIONS.TRASHED_QUESTIONS)
      .where('id', '==', trashedId)
      .where('createdBy', '==', firebaseUid)
      .limit(1)
      .get();

    if (snapshot.empty) return false;

    await snapshot.docs[0].ref.delete();
    return true;
  }

  async emptyTrash(firebaseUid: string): Promise<void> {
    const snapshot = await firestore.collection(COLLECTIONS.TRASHED_QUESTIONS)
      .where('createdBy', '==', firebaseUid)
      .get();

    const batch = firestore.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
  }

  // User stats
  async getUserStats(firebaseUid: string): Promise<{
    totalQuestions: number;
    learnedQuestions: number;
    failedQuestions: number;
    averageFailureCount: number;
  }> {
    const snapshot = await firestore.collection(COLLECTIONS.QUESTIONS)
      .where('createdBy', '==', firebaseUid)
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