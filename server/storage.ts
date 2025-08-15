import { firestore } from './firebase.js';
import { Timestamp } from 'firebase-admin/firestore';
import { 
  COLLECTIONS,
  type FirestoreMockExam,
  type FirestoreSubject, 
  type FirestoreTopic,
  type FirestoreQuestion,
  type FirestoreQuestionMockExam,
  type FirestoreTrashedQuestion
} from './firestore-schema.js';
import { cache } from './cache.js'; // Assuming a cache utility is available

// Define QuestionWithRelations type for clarity
interface QuestionWithRelations {
  question: FirestoreQuestion;
  mockExamIds: number[];
}

interface QuestionFilters {
  firebaseUid: string;
  mockExamIds?: number[];
  subjectIds?: number[];
  topicIds?: number[];
  keywords?: string;
  learningStatus?: boolean[];
  failureCountExact?: number;
  failureCountMin?: number;
  failureCountMax?: number;
}

export class Storage {
  public db = firestore;

  // Mock Exam methods
  async getMockExams(firebaseUid: string): Promise<FirestoreMockExam[]> {
    const snapshot = await firestore.collection(COLLECTIONS.MOCK_EXAMS)
      .where('createdBy', '==', firebaseUid)
      .get();
    const mockExams = snapshot.docs.map(doc => doc.data() as FirestoreMockExam);
    // Sort in memory to avoid Firestore index requirement
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
    const questionRelations = await firestore.collection(COLLECTIONS.QUESTION_MOCK_EXAMS)
      .where('mockExamId', '==', id)
      .where('createdBy', '==', firebaseUid)
      .limit(1)
      .get();

    if (!questionRelations.empty) return false;

    const snapshot = await firestore.collection(COLLECTIONS.MOCK_EXAMS)
      .where('id', '==', id)
      .where('createdBy', '==', firebaseUid)
      .limit(1)
      .get();

    if (snapshot.empty) return false;

    await snapshot.docs[0].ref.delete();
    return true;
  }

  // Subject methods
  async getSubjects(firebaseUid: string): Promise<FirestoreSubject[]> {
    // Intentar obtener del cache primero
    const cached = cache.get<FirestoreSubject[]>('SUBJECTS', firebaseUid);
    if (cached) {
      return cached;
    }

    const snapshot = await firestore.collection(COLLECTIONS.SUBJECTS)
      .where('createdBy', '==', firebaseUid)
      .get();
    const subjects = snapshot.docs.map(doc => doc.data() as FirestoreSubject);
    // Sort in memory to avoid Firestore index requirement
    const sortedSubjects = subjects.sort((a, b) => a.name.localeCompare(b.name));

    // Guardar en cache
    cache.set('SUBJECTS', firebaseUid, sortedSubjects);

    return sortedSubjects;
  }

  async getSubjectByName(name: string, firebaseUid: string): Promise<FirestoreSubject | null> {
    const snapshot = await firestore.collection(COLLECTIONS.SUBJECTS)
      .where('name', '==', name)
      .where('createdBy', '==', firebaseUid)
      .limit(1)
      .get();

    return snapshot.empty ? null : snapshot.docs[0].data() as FirestoreSubject;
  }

  async createSubject(subjectData: Omit<FirestoreSubject, 'id' | 'createdAt'>): Promise<FirestoreSubject> {
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
    // Invalidate cache for subjects
    cache.invalidate('SUBJECTS', subjectData.createdBy);
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

    // Invalidate cache for subjects
    cache.invalidate('SUBJECTS', firebaseUid);

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

    if (!questionsSnapshot.empty) return false;

    const snapshot = await firestore.collection(COLLECTIONS.SUBJECTS)
      .where('id', '==', id)
      .where('createdBy', '==', firebaseUid)
      .limit(1)
      .get();

    if (snapshot.empty) return false;

    await snapshot.docs[0].ref.delete();
    // Invalidate cache for subjects
    cache.invalidate('SUBJECTS', firebaseUid);
    return true;
  }

  // Topic methods
  async getTopics(firebaseUid: string): Promise<FirestoreTopic[]> {
    // Intentar obtener del cache primero
    const cached = cache.get<FirestoreTopic[]>('TOPICS', firebaseUid);
    if (cached) {
      return cached;
    }

    const snapshot = await firestore.collection(COLLECTIONS.TOPICS)
      .where('createdBy', '==', firebaseUid)
      .get();
    const topics = snapshot.docs.map(doc => doc.data() as FirestoreTopic);
    // Sort in memory to avoid Firestore index requirement
    const sortedTopics = topics.sort((a, b) => a.name.localeCompare(b.name));

    // Guardar en cache
    cache.set('TOPICS', firebaseUid, sortedTopics);

    return sortedTopics;
  }

  async getTopicByName(name: string, firebaseUid: string): Promise<FirestoreTopic | null> {
    const snapshot = await firestore.collection(COLLECTIONS.TOPICS)
      .where('name', '==', name)
      .where('createdBy', '==', firebaseUid)
      .limit(1)
      .get();

    return snapshot.empty ? null : snapshot.docs[0].data() as FirestoreTopic;
  }

  async createTopic(topicData: Omit<FirestoreTopic, 'id' | 'createdAt'>): Promise<FirestoreTopic> {
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
    // Invalidate cache for topics
    cache.invalidate('TOPICS', topicData.createdBy);
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

    // Invalidate cache for topics
    cache.invalidate('TOPICS', firebaseUid);

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

    if (!questionsSnapshot.empty) return false;

    const snapshot = await firestore.collection(COLLECTIONS.TOPICS)
      .where('id', '==', id)
      .where('createdBy', '==', firebaseUid)
      .limit(1)
      .get();

    if (snapshot.empty) return false;

    await snapshot.docs[0].ref.delete();
    // Invalidate cache for topics
    cache.invalidate('TOPICS', firebaseUid);
    return true;
  }

  // Question methods
  async getQuestions(filters: QuestionFilters): Promise<FirestoreQuestion[]> {
    // Crear una clave de cache basada en los filtros
    const cacheKey = JSON.stringify(filters);
    const cached = cache.get<FirestoreQuestion[]>('QUESTIONS', filters.firebaseUid, cacheKey);
    if (cached) {
      return cached;
    }

    let query = firestore.collection(COLLECTIONS.QUESTIONS)
      .where('createdBy', '==', filters.firebaseUid);

    // Apply mock exam filter if provided
    if (filters.mockExamIds && filters.mockExamIds.length > 0) {
      // Get questions through the relation table
      const questionIds = new Set<number>();

      // Process in batches of 10 (Firestore 'in' query limit)
      const batches = [];
      for (let i = 0; i < filters.mockExamIds.length; i += 10) {
        batches.push(filters.mockExamIds.slice(i, i + 10));
      }

      for (const batch of batches) {
        const relationSnapshot = await firestore.collection(COLLECTIONS.QUESTION_MOCK_EXAMS)
          .where('createdBy', '==', filters.firebaseUid)
          .where('mockExamId', 'in', batch)
          .get();

        relationSnapshot.docs.forEach(doc => {
          const relation = doc.data() as FirestoreQuestionMockExam;
          questionIds.add(relation.questionId);
        });
      }

      if (questionIds.size === 0) {
        // Cache resultado vacío también
        cache.set('QUESTIONS', filters.firebaseUid, [], cacheKey);
        return [];
      }

      // Convert Set to Array and process in batches for the main query
      const questionIdsArray = Array.from(questionIds);
      const questionBatches = [];
      for (let i = 0; i < questionIdsArray.length; i += 10) {
        questionBatches.push(questionIdsArray.slice(i, i + 10));
      }

      const results: FirestoreQuestion[] = [];
      for (const batch of questionBatches) {
        const batchQuery = firestore.collection(COLLECTIONS.QUESTIONS)
          .where('createdBy', '==', filters.firebaseUid)
          .where('id', 'in', batch);

        const snapshot = await batchQuery.get();
        results.push(...snapshot.docs.map(doc => doc.data() as FirestoreQuestion));
      }

      // Apply other filters to results
      let filteredResults = results;

      // Apply other filters
      if (filters.subjectIds && filters.subjectIds.length > 0) {
        filteredResults = filteredResults.filter(q => filters.subjectIds!.includes(q.subjectId));
      }
      if (filters.topicIds && filters.topicIds.length > 0) {
        filteredResults = filteredResults.filter(q => filters.topicIds!.includes(q.topicId));
      }
      if (filters.learningStatus && filters.learningStatus.length === 1) {
        filteredResults = filteredResults.filter(q => q.isLearned === filters.learningStatus![0]);
      }
      if (filters.keywords) {
        const keywords = filters.keywords.toLowerCase();
        filteredResults = filteredResults.filter(q => 
          q.theory.toLowerCase().includes(keywords) ||
          q.type.toLowerCase().includes(keywords)
        );
      }
      if (filters.failureCountExact !== undefined) {
        filteredResults = filteredResults.filter(q => q.failureCount === filters.failureCountExact);
      }
      if (filters.failureCountMin !== undefined) {
        filteredResults = filteredResults.filter(q => q.failureCount >= filters.failureCountMin!);
      }
      if (filters.failureCountMax !== undefined) {
        filteredResults = filteredResults.filter(q => q.failureCount <= filters.failureCountMax!);
      }

      // Sort results
      filteredResults.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);

      // Guardar en cache
      cache.set('QUESTIONS', filters.firebaseUid, filteredResults, cacheKey);

      return filteredResults;
    }

    // Apply other filters
    if (filters.subjectIds && filters.subjectIds.length > 0) {
      query = query.where('subjectId', 'in', filters.subjectIds.slice(0, 10)); // Firestore limit
    }

    if (filters.topicIds && filters.topicIds.length > 0) {
      query = query.where('topicId', 'in', filters.topicIds.slice(0, 10)); // Firestore limit
    }
    if (filters.learningStatus && filters.learningStatus.length === 1) {
      query = query.where('isLearned', '==', filters.learningStatus[0]);
    }

    const snapshot = await query.get();
    let results = snapshot.docs.map(doc => doc.data() as FirestoreQuestion);

    // Apply remaining filters in memory
    if (filters.keywords) {
      const keywords = filters.keywords.toLowerCase();
      results = results.filter(q => 
        q.theory.toLowerCase().includes(keywords) ||
        q.type.toLowerCase().includes(keywords)
      );
    }

    if (filters.learningStatus && filters.learningStatus.length > 0) {
      if (filters.learningStatus.length === 1) {
        results = results.filter(q => q.isLearned === filters.learningStatus![0]);
      }
    }

    if (filters.failureCountExact !== undefined) {
      results = results.filter(q => (q.failureCount || 0) === filters.failureCountExact!);
    }

    if (filters.failureCountMin !== undefined) {
      results = results.filter(q => (q.failureCount || 0) >= filters.failureCountMin!);
    }

    if (filters.failureCountMax !== undefined) {
      results = results.filter(q => (q.failureCount || 0) <= filters.failureCountMax!);
    }

    // Sort results
    results.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);

    // Guardar en cache
    cache.set('QUESTIONS', filters.firebaseUid, results, cacheKey);

    return results;
  }

  async createQuestion(questionData: Omit<FirestoreQuestion, 'id' | 'createdAt'>, mockExamIds: number[]): Promise<FirestoreQuestion> {
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

    const batch = firestore.batch();

    // Create question
    batch.set(docRef, question);

    // Create relations with mock exams
    for (const mockExamId of mockExamIds) {
      const relationRef = firestore.collection(COLLECTIONS.QUESTION_MOCK_EXAMS).doc();
      const relationId = Math.abs(relationRef.id.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0)) % 1000000;

      const relation: FirestoreQuestionMockExam = {
        id: relationId,
        questionId: numericId,
        mockExamId,
        createdBy: questionData.createdBy,
        createdAt: Timestamp.now(),
      };

      batch.set(relationRef, relation);
    }

    await batch.commit();

    // Invalidar cache relacionado con preguntas y conteos
    cache.invalidate('QUESTIONS', questionData.createdBy);
    cache.invalidate('QUESTION_COUNTS', questionData.createdBy);

    return question;
  }

  async updateQuestion(
    id: number, 
    updates: Partial<Omit<FirestoreQuestion, 'id' | 'createdAt' | 'createdBy'>>,
    firebaseUid: string,
    mockExamIds?: number[]
  ): Promise<FirestoreQuestion | null> {
    const snapshot = await firestore.collection(COLLECTIONS.QUESTIONS)
      .where('id', '==', id)
      .where('createdBy', '==', firebaseUid)
      .limit(1)
      .get();

    if (snapshot.empty) return null;

    const batch = firestore.batch();
    const doc = snapshot.docs[0];

    // Update question
    if (Object.keys(updates).length > 0) {
      batch.update(doc.ref, updates);
    }

    // Update mock exam relations if provided
    if (mockExamIds) {
      // Delete existing relations
      const existingRelations = await firestore.collection(COLLECTIONS.QUESTION_MOCK_EXAMS)
        .where('questionId', '==', id)
        .where('createdBy', '==', firebaseUid)
        .get();

      existingRelations.docs.forEach(relationDoc => {
        batch.delete(relationDoc.ref);
      });

      // Create new relations
      for (const mockExamId of mockExamIds) {
        const relationRef = firestore.collection(COLLECTIONS.QUESTION_MOCK_EXAMS).doc();
        const relationId = Math.abs(relationRef.id.split('').reduce((a, b) => {
          a = ((a << 5) - a) + b.charCodeAt(0);
          return a & a;
        }, 0)) % 1000000;

        const relation: FirestoreQuestionMockExam = {
          id: relationId,
          questionId: id,
          mockExamId,
          createdBy: firebaseUid,
          createdAt: Timestamp.now(),
        };

        batch.set(relationRef, relation);
      }
    }

    await batch.commit();

    // Invalidate cache
    cache.invalidate('QUESTIONS', firebaseUid);
    cache.invalidate('QUESTION_COUNTS', firebaseUid);

    const updatedDoc = await doc.ref.get();
    return updatedDoc.data() as FirestoreQuestion;
  }

  async updateQuestionLearned(questionId: number, isLearned: boolean, firebaseUid: string): Promise<QuestionWithRelations | null> {
    const snapshot = await firestore.collection(COLLECTIONS.QUESTIONS)
      .where('id', '==', questionId)
      .where('createdBy', '==', firebaseUid)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const questionDoc = snapshot.docs[0];
    await questionDoc.ref.update({ isLearned });

    // Invalidate cache
    cache.invalidate('QUESTIONS', firebaseUid);

    // Return the updated question with relations
    return this.getQuestionWithRelations(questionId, firebaseUid);
  }

  async duplicateQuestion(questionId: number, firebaseUid: string): Promise<QuestionWithRelations | null> {
    // Get the original question
    const snapshot = await firestore.collection(COLLECTIONS.QUESTIONS)
      .where('id', '==', questionId)
      .where('createdBy', '==', firebaseUid)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const originalQuestion = snapshot.docs[0].data() as FirestoreQuestion;

    // Get the mock exam relations for this question
    const relationsSnapshot = await firestore.collection(COLLECTIONS.QUESTION_MOCK_EXAMS)
      .where('questionId', '==', questionId)
      .where('createdBy', '==', firebaseUid)
      .get();

    const mockExamIds = relationsSnapshot.docs.map(doc => 
      (doc.data() as FirestoreQuestionMockExam).mockExamId
    );

    // Generate new ID for the duplicated question
    const newQuestionRef = firestore.collection(COLLECTIONS.QUESTIONS).doc();
    const newQuestionId = Math.abs(newQuestionRef.id.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0)) % 1000000;

    // Create the duplicated question with "- copiada" suffix
    const duplicatedQuestion: FirestoreQuestion = {
      ...originalQuestion,
      id: newQuestionId,
      theory: originalQuestion.theory + " - copiada",
      isLearned: false,
      failureCount: 0,
      createdAt: Timestamp.now(),
    };

    // Use batch to create question and relations atomically
    const batch = firestore.batch();
    batch.set(newQuestionRef, duplicatedQuestion);

    // Create new question-mock exam relations
    for (const mockExamId of mockExamIds) {
      const relationRef = firestore.collection(COLLECTIONS.QUESTION_MOCK_EXAMS).doc();
      const relationId = Math.abs(relationRef.id.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0)) % 1000000;

      const relation: FirestoreQuestionMockExam = {
        id: relationId,
        questionId: newQuestionId,
        mockExamId,
        createdBy: firebaseUid,
        createdAt: Timestamp.now(),
      };

      batch.set(relationRef, relation);
    }

    await batch.commit();

    // Invalidate cache
    cache.invalidate('QUESTIONS', firebaseUid);
    cache.invalidate('QUESTION_COUNTS', firebaseUid);

    // Return the duplicated question with relations
    return this.getQuestionWithRelations(newQuestionId, firebaseUid);
  }

  async updateQuestionFailureCount(id: number, failureCount: number, firebaseUid: string): Promise<FirestoreQuestion | null> {
    // Invalidate cache
    cache.invalidate('QUESTIONS', firebaseUid);
    return this.updateQuestion(id, { failureCount }, firebaseUid);
  }

  async deleteQuestion(id: number, firebaseUid: string): Promise<boolean> {
    const questionSnapshot = await firestore.collection(COLLECTIONS.QUESTIONS)
      .where('id', '==', id)
      .where('createdBy', '==', firebaseUid)
      .limit(1)
      .get();

    if (questionSnapshot.empty) return false;

    const questionData = questionSnapshot.docs[0].data() as FirestoreQuestion;

    // Get question-mockexam relations
    const relationsSnapshot = await firestore.collection(COLLECTIONS.QUESTION_MOCK_EXAMS)
      .where('questionId', '==', id)
      .where('createdBy', '==', firebaseUid)
      .get();

    // Get mock exam data for trashed question
    const mockExamIds: number[] = [];
    const mockExamTitles: string[] = [];

    for (const relationDoc of relationsSnapshot.docs) {
      const relation = relationDoc.data() as FirestoreQuestionMockExam;
      const mockExamSnapshot = await firestore.collection(COLLECTIONS.MOCK_EXAMS)
        .where('id', '==', relation.mockExamId)
        .limit(1)
        .get();

      if (!mockExamSnapshot.empty) {
        const mockExam = mockExamSnapshot.docs[0].data() as FirestoreMockExam;
        mockExamIds.push(mockExam.id);
        mockExamTitles.push(mockExam.title);
      }
    }

    // Get subject and topic data
    const [subjectSnapshot, topicSnapshot] = await Promise.all([
      firestore.collection(COLLECTIONS.SUBJECTS)
        .where('id', '==', questionData.subjectId)
        .limit(1)
        .get(),
      firestore.collection(COLLECTIONS.TOPICS)
        .where('id', '==', questionData.topicId)
        .limit(1)
        .get()
    ]);

    const subjectName = !subjectSnapshot.empty ? 
      (subjectSnapshot.docs[0].data() as FirestoreSubject).name : '';
    const topicName = !topicSnapshot.empty ? 
      (topicSnapshot.docs[0].data() as FirestoreTopic).name : '';

    // Create trashed question
    const trashedQuestionRef = firestore.collection(COLLECTIONS.TRASHED_QUESTIONS).doc();
    const trashedQuestionId = Math.abs(trashedQuestionRef.id.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0)) % 1000000;

    const trashedQuestion: FirestoreTrashedQuestion = {
      id: trashedQuestionId,
      originalId: questionData.id,
      mockExamIds,
      mockExamTitles,
      subjectId: questionData.subjectId,
      subjectName,
      topicId: questionData.topicId,
      topicName,
      type: questionData.type,
      theory: questionData.theory,
      isLearned: questionData.isLearned,
      failureCount: questionData.failureCount,
      createdBy: questionData.createdBy,
      createdAt: questionData.createdAt,
      deletedAt: Timestamp.now(),
    };

    // Batch operation: create trashed question, delete question and relations
    const batch = firestore.batch();
    batch.set(trashedQuestionRef, trashedQuestion);
    batch.delete(questionSnapshot.docs[0].ref);

    // Delete all relations
    relationsSnapshot.docs.forEach(relationDoc => {
      batch.delete(relationDoc.ref);
    });

    await batch.commit();

    // Invalidate cache
    cache.invalidate('QUESTIONS', firebaseUid);
    cache.invalidate('QUESTION_COUNTS', firebaseUid);

    return true;
  }

  async getQuestionMockExams(questionId: number, firebaseUid: string): Promise<number[]> {
    const snapshot = await firestore.collection(COLLECTIONS.QUESTION_MOCK_EXAMS)
      .where('questionId', '==', questionId)
      .where('createdBy', '==', firebaseUid)
      .get();

    return snapshot.docs.map(doc => (doc.data() as FirestoreQuestionMockExam).mockExamId);
  }

  async getQuestionsForMockExam(mockExamId: number, firebaseUid: string): Promise<number[]> {
    // Cache para conteos de preguntas por mock exam
    const cacheKey = `mockExam_${mockExamId}`;
    const cached = cache.get<number[]>('QUESTION_COUNTS', firebaseUid, cacheKey);
    if (cached) {
      return cached;
    }

    const snapshot = await firestore.collection(COLLECTIONS.QUESTION_MOCK_EXAMS)
      .where('mockExamId', '==', mockExamId)
      .where('createdBy', '==', firebaseUid)
      .get();

    const questionIds = snapshot.docs.map(doc => {
      const relation = doc.data() as FirestoreQuestionMockExam;
      return relation.questionId;
    });

    // Guardar en cache
    cache.set('QUESTION_COUNTS', firebaseUid, questionIds, cacheKey);

    return questionIds;
  }

  // Helper to get question with its mock exam relations
  async getQuestionWithRelations(questionId: number, firebaseUid: string): Promise<QuestionWithRelations | null> {
    const questionSnapshot = await firestore.collection(COLLECTIONS.QUESTIONS)
      .where('id', '==', questionId)
      .where('createdBy', '==', firebaseUid)
      .limit(1)
      .get();

    if (questionSnapshot.empty) {
      return null;
    }

    const question = questionSnapshot.docs[0].data() as FirestoreQuestion;
    const mockExamIds = await this.getQuestionMockExams(questionId, firebaseUid);

    return { question, mockExamIds };
  }

  // User stats
  async getUserStats(firebaseUid: string) {
    const [mockExams, subjects, topics, questions, trashedQuestions] = await Promise.all([
      this.getMockExams(firebaseUid),
      this.getSubjects(firebaseUid),
      this.getTopics(firebaseUid),
      this.getQuestions({ firebaseUid }),
      this.getTrashedQuestions(firebaseUid),
    ]);

    const learnedQuestions = questions.filter(q => q.isLearned);
    const unlearnedQuestions = questions.filter(q => !q.isLearned);

    return {
      totalMockExams: mockExams.length,
      totalSubjects: subjects.length,
      totalTopics: topics.length,
      totalQuestions: questions.length,
      learnedQuestions: learnedQuestions.length,
      unlearnedQuestions: unlearnedQuestions.length,
      trashedQuestions: trashedQuestions.length,
    };
  }

  // Trash methods
  async getTrashedQuestions(firebaseUid: string): Promise<FirestoreTrashedQuestion[]> {
    const snapshot = await firestore.collection(COLLECTIONS.TRASHED_QUESTIONS)
      .where('createdBy', '==', firebaseUid)
      .get();
    const trashedQuestions = snapshot.docs.map(doc => doc.data() as FirestoreTrashedQuestion);
    return trashedQuestions.sort((a, b) => b.deletedAt.seconds - a.deletedAt.seconds);
  }

  async restoreQuestion(trashedQuestionId: number, firebaseUid: string): Promise<boolean> {
    const trashedSnapshot = await firestore.collection(COLLECTIONS.TRASHED_QUESTIONS)
      .where('id', '==', trashedQuestionId)
      .where('createdBy', '==', firebaseUid)
      .limit(1)
      .get();

    if (trashedSnapshot.empty) return false;

    const trashedQuestion = trashedSnapshot.docs[0].data() as FirestoreTrashedQuestion;

    // Restore question
    const questionRef = firestore.collection(COLLECTIONS.QUESTIONS).doc();
    const questionId = Math.abs(questionRef.id.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0)) % 1000000;

    const restoredQuestion: FirestoreQuestion = {
      id: questionId,
      subjectId: trashedQuestion.subjectId,
      topicId: trashedQuestion.topicId,
      type: trashedQuestion.type,
      theory: trashedQuestion.theory,
      isLearned: trashedQuestion.isLearned,
      failureCount: trashedQuestion.failureCount,
      createdBy: trashedQuestion.createdBy,
      createdAt: trashedQuestion.createdAt,
    };

    const batch = firestore.batch();
    batch.set(questionRef, restoredQuestion);

    // Restore question-mockexam relations
    for (const mockExamId of trashedQuestion.mockExamIds) {
      const relationRef = firestore.collection(COLLECTIONS.QUESTION_MOCK_EXAMS).doc();
      const relationId = Math.abs(relationRef.id.split('').reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0)) % 1000000;

      const relation: FirestoreQuestionMockExam = {
        id: relationId,
        questionId: questionId,
        mockExamId,
        createdBy: firebaseUid,
        createdAt: Timestamp.now(),
      };

      batch.set(relationRef, relation);
    }

    // Delete trashed question
    batch.delete(trashedSnapshot.docs[0].ref);

    await batch.commit();

    // Invalidate cache
    cache.invalidate('QUESTIONS', firebaseUid);
    cache.invalidate('QUESTION_COUNTS', firebaseUid);

    return true;
  }

  async permanentlyDeleteQuestion(trashedQuestionId: number, firebaseUid: string): Promise<boolean> {
    const snapshot = await firestore.collection(COLLECTIONS.TRASHED_QUESTIONS)
      .where('id', '==', trashedQuestionId)
      .where('createdBy', '==', firebaseUid)
      .limit(1)
      .get();

    if (snapshot.empty) return false;

    await snapshot.docs[0].ref.delete();
    // Invalidate cache for trashed questions
    cache.invalidate('TRASHED_QUESTIONS', firebaseUid);
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
    // Invalidate cache for trashed questions
    cache.invalidate('TRASHED_QUESTIONS', firebaseUid);
  }
}

export const storage = new Storage();