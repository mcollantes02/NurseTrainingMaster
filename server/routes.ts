import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import { insertMockExamSchema, insertQuestionSchema } from "../shared/schema.js";
import { auth } from "./firebase.js";
import { Timestamp } from "firebase-admin/firestore";
import { cache } from "./cache.js";
import "./types.js";

// Helper function to convert Firestore timestamp to Date
function convertFirestoreToDate(firestoreData: any): any {
  if (!firestoreData) return firestoreData;

  const converted = { ...firestoreData };

  if (converted.createdAt && typeof converted.createdAt === 'object' && 'seconds' in converted.createdAt) {
    converted.createdAt = new Date(converted.createdAt.seconds * 1000);
  }

  if (converted.deletedAt && typeof converted.deletedAt === 'object' && 'seconds' in converted.deletedAt) {
    converted.deletedAt = new Date(converted.deletedAt.seconds * 1000);
  }

  return converted;
}

// Helper function to convert arrays of Firestore data
function convertFirestoreArrayToDate(firestoreArray: any[]): any[] {
  return firestoreArray.map(item => convertFirestoreToDate(item));
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Middleware to verify Firebase token and get user
  const requireAuth = async (req: any, res: any, next: any) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const idToken = authHeader.split('Bearer ')[1];
      const decodedToken = await auth.verifyIdToken(idToken);

      req.firebaseUid = decodedToken.uid;
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name,
        picture: decodedToken.picture
      };
      next();
    } catch (error) {
      console.error("Auth verification error:", error);
      return res.status(401).json({ message: "Invalid token" });
    }
  };

  // Firebase auth route
  app.post("/api/auth/firebase", async (req, res) => {
    try {
      const { idToken } = req.body;

      // Verify the Firebase ID token
      const decodedToken = await auth.verifyIdToken(idToken);

      res.json({ 
        user: {
          uid: decodedToken.uid,
          email: decodedToken.email,
          name: decodedToken.name,
          picture: decodedToken.picture
        } 
      });
    } catch (error) {
      console.error("Firebase auth error:", error);
      res.status(500).json({ message: "Authentication failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    // With Firebase, logout is handled on the client side
    res.json({ message: "Logged out successfully" });
  });

  // Mock exam routes
  app.get("/api/mock-exams", requireAuth, async (req, res) => {
    try {
      // Type assertion: firebaseUid is guaranteed to exist after requireAuth middleware
      const firebaseUid = req.firebaseUid!;
      console.log("Getting mock exams for user:", firebaseUid);
      const mockExams = await storage.getMockExams(firebaseUid);

      // Count questions for each mock exam by checking question-mockexam relations
      const mockExamsWithCounts = await Promise.all(mockExams.map(async exam => {
        const questionIds = await storage.getQuestionsForMockExam(exam.id, firebaseUid);
        return {
          ...convertFirestoreToDate(exam),
          questionCount: questionIds.length
        };
      }));

      console.log("Mock exams with counts:", mockExamsWithCounts.map(e => ({ id: e.id, title: e.title, questionCount: e.questionCount })));

      res.json(mockExamsWithCounts);
    } catch (error) {
      console.error("Get mock exams error:", error);
      res.status(500).json({ message: "Failed to get mock exams" });
    }
  });

  app.post("/api/mock-exams", requireAuth, async (req, res) => {
    try {
      const firebaseUid = req.firebaseUid!;
      const mockExamData = insertMockExamSchema.parse({
        ...req.body,
        createdBy: firebaseUid,
      });

      const mockExam = await storage.createMockExam(mockExamData);
      res.json(mockExam);
    } catch (error) {
      console.error("Create mock exam error:", error);
      res.status(400).json({ message: "Failed to create mock exam" });
    }
  });

  app.put("/api/mock-exams/:id", requireAuth, async (req, res) => {
    try {
      const firebaseUid = req.firebaseUid!;
      const id = parseInt(req.params.id);
      const { title } = req.body;

      const mockExam = await storage.updateMockExam(id, { title }, firebaseUid);
      if (!mockExam) {
        return res.status(404).json({ message: "Mock exam not found" });
      }

      res.json(mockExam);
    } catch (error) {
      console.error("Update mock exam error:", error);
      res.status(500).json({ message: "Failed to update mock exam" });
    }
  });

  app.delete("/api/mock-exams/:id", requireAuth, async (req, res) => {
    try {
      const firebaseUid = req.firebaseUid!;
      const id = parseInt(req.params.id);

      const success = await storage.deleteMockExam(id, firebaseUid);
      if (!success) {
        return res.status(404).json({ message: "Mock exam not found or has associated questions" });
      }

      res.json({ message: "Mock exam deleted successfully" });
    } catch (error) {
      console.error("Delete mock exam error:", error);
      res.status(500).json({ message: "Failed to delete mock exam" });
    }
  });

  // Subject routes
  app.get("/api/subjects", requireAuth, async (req, res) => {
    try {
      const firebaseUid = req.firebaseUid!;
      const subjects = await storage.getSubjects(firebaseUid);
      res.json(convertFirestoreArrayToDate(subjects));
    } catch (error) {
      console.error("Get subjects error:", error);
      res.status(500).json({ message: "Failed to get subjects" });
    }
  });

  app.post("/api/subjects", requireAuth, async (req, res) => {
    try {
      const firebaseUid = req.firebaseUid!;
      const { name } = req.body;

      // Check if subject already exists for this user
      const existing = await storage.getSubjectByName(name, firebaseUid);
      if (existing) {
        return res.json(convertFirestoreToDate(existing));
      }

      const subject = await storage.createSubject({ name, createdBy: firebaseUid });
      res.json(convertFirestoreToDate(subject));
    } catch (error) {
      console.error("Create subject error:", error);
      res.status(400).json({ message: "Failed to create subject" });
    }
  });

  app.put("/api/subjects/:id", requireAuth, async (req, res) => {
    try {
      const firebaseUid = req.firebaseUid!;
      const id = parseInt(req.params.id);
      const { name } = req.body;

      const subject = await storage.updateSubject(id, { name }, firebaseUid);
      if (!subject) {
        return res.status(404).json({ message: "Subject not found" });
      }

      res.json(convertFirestoreToDate(subject));
    } catch (error) {
      console.error("Update subject error:", error);
      res.status(500).json({ message: "Failed to update subject" });
    }
  });

  app.delete("/api/subjects/:id", requireAuth, async (req, res) => {
    try {
      const firebaseUid = req.firebaseUid!;
      const id = parseInt(req.params.id);

      const success = await storage.deleteSubject(id, firebaseUid);
      if (!success) {
        return res.status(404).json({ message: "Subject not found or has associated questions" });
      }

      res.json({ message: "Subject deleted successfully" });
    } catch (error) {
      console.error("Delete subject error:", error);
      res.status(500).json({ message: "Failed to delete subject" });
    }
  });

  // Topic routes
  app.get("/api/topics", requireAuth, async (req, res) => {
    try {
      const firebaseUid = req.firebaseUid!;
      const topics = await storage.getTopics(firebaseUid);
      res.json(convertFirestoreArrayToDate(topics));
    } catch (error) {
      console.error("Get topics error:", error);
      res.status(500).json({ message: "Failed to get topics" });
    }
  });

  app.post("/api/topics", requireAuth, async (req, res) => {
    try {
      const firebaseUid = req.firebaseUid!;
      const { name } = req.body;

      // Check if topic already exists for this user
      const existing = await storage.getTopicByName(name, firebaseUid);
      if (existing) {
        return res.json(convertFirestoreToDate(existing));
      }

      const topic = await storage.createTopic({ name, createdBy: firebaseUid });
      res.json(convertFirestoreToDate(topic));
    } catch (error) {
      console.error("Create topic error:", error);
      res.status(400).json({ message: "Failed to create topic" });
    }
  });

  app.put("/api/topics/:id", requireAuth, async (req, res) => {
    try {
      const firebaseUid = req.firebaseUid!;
      const id = parseInt(req.params.id);
      const { name } = req.body;

      const topic = await storage.updateTopic(id, { name }, firebaseUid);
      if (!topic) {
        return res.status(404).json({ message: "Topic not found" });
      }

      res.json(convertFirestoreToDate(topic));
    } catch (error) {
      console.error("Update topic error:", error);
      res.status(500).json({ message: "Failed to update topic" });
    }
  });

  app.delete("/api/topics/:id", requireAuth, async (req, res) => {
    try {
      const firebaseUid = req.firebaseUid!;
      const id = parseInt(req.params.id);

      const success = await storage.deleteTopic(id, firebaseUid);
      if (!success) {
        return res.status(404).json({ message: "Topic not found or has associated questions" });
      }

      res.json({ message: "Topic deleted successfully" });
    } catch (error) {
      console.error("Delete topic error:", error);
      res.status(500).json({ message: "Failed to delete topic" });
    }
  });

  // Question routes
  app.get("/api/questions", requireAuth, async (req, res) => {
    try {
      const firebaseUid = req.firebaseUid!;
      console.log("Getting questions for user:", firebaseUid); // Added debugging
      console.log("Query params:", req.query); // Added debugging
      const filters = {
        firebaseUid: firebaseUid,
        mockExamIds: req.query.mockExamIds ? (Array.isArray(req.query.mockExamIds) ? req.query.mockExamIds.map(id => parseInt(id as string)) : [parseInt(req.query.mockExamIds as string)]) : undefined,
        subjectIds: req.query.subjectIds ? (Array.isArray(req.query.subjectIds) ? req.query.subjectIds.map(id => parseInt(id as string)) : [parseInt(req.query.subjectIds as string)]) : undefined,
        topicIds: req.query.topicIds ? (Array.isArray(req.query.topicIds) ? req.query.topicIds.map(id => parseInt(id as string)) : [parseInt(req.query.topicIds as string)]) : undefined,
        keywords: req.query.keywords as string | undefined,
        learningStatus: req.query.learningStatus ? (Array.isArray(req.query.learningStatus) ? req.query.learningStatus.map(status => status === 'true') : [req.query.learningStatus === 'true']) : undefined,
        failureCountExact: req.query.failureCountExact ? parseInt(req.query.failureCountExact as string) : undefined,
        failureCountMin: req.query.failureCountMin ? parseInt(req.query.failureCountMin as string) : undefined,
        failureCountMax: req.query.failureCountMax ? parseInt(req.query.failureCountMax as string) : undefined,
      };

      const questions = await storage.getQuestions(filters);

      // Get all related data for this user
      const [mockExams, subjects, topics] = await Promise.all([
        storage.getMockExams(firebaseUid),
        storage.getSubjects(firebaseUid),
        storage.getTopics(firebaseUid)
      ]);

      // Create lookup maps for better performance
      const mockExamMap = new Map(mockExams.map(exam => [exam.id, exam]));
      const subjectMap = new Map(subjects.map(subject => [subject.id, subject]));
      const topicMap = new Map(topics.map(topic => [topic.id, topic]));

      // Use the optimized method that gets all relations at once
      const questionMockExamMap = await storage.getAllQuestionRelations(firebaseUid);

      // Add relations to questions (now much faster)
      const questionsWithRelations = questions.map(question => {
        const questionMockExamIds = questionMockExamMap.get(question.id) || [];
        const questionMockExams = questionMockExamIds
          .map(id => mockExamMap.get(id))
          .filter(Boolean)
          .map(exam => convertFirestoreToDate(exam));

        // For backward compatibility, include mockExam (first one) and mockExams (all)
        const firstMockExam = questionMockExams[0] || null;

        return {
          ...convertFirestoreToDate(question),
          mockExam: firstMockExam, // For backward compatibility
          mockExams: questionMockExams,
          subject: convertFirestoreToDate(subjectMap.get(question.subjectId)) || { id: question.subjectId, name: 'Unknown', createdAt: new Date() },
          topic: convertFirestoreToDate(topicMap.get(question.topicId)) || { id: question.topicId, name: 'Unknown', createdAt: new Date() },
          createdBy: req.user
        };
      });
      res.json(questionsWithRelations);
    } catch (error) {
      console.error("Get questions error:", error);
      res.status(500).json({ message: "Failed to get questions" });
    }
  });

  app.post("/api/questions", requireAuth, async (req, res) => {
    try {
      const firebaseUid = req.firebaseUid!;
      const { mockExamIds, ...questionBody } = req.body;
      const questionData = insertQuestionSchema.parse({
        mockExamIds,
        ...questionBody,
        createdBy: firebaseUid,
      });

      const { mockExamIds: parsedMockExamIds, ...questionWithoutMockExams } = questionData;
      const question = await storage.createQuestion(questionWithoutMockExams, parsedMockExamIds);
      res.json(convertFirestoreToDate(question));
    } catch (error) {
      console.error("Create question error:", error);
      res.status(400).json({ message: "Failed to create question" });
    }
  });

  app.put("/api/questions/:id", requireAuth, async (req, res) => {
    try {
      const firebaseUid = req.firebaseUid!;
      const id = parseInt(req.params.id);
      const { mockExamIds, subjectId, topicId, type, theory, failureCount, isLearned } = req.body;

      const question = await storage.updateQuestion(id, {
        subjectId,
        topicId,
        type,
        theory,
        failureCount,
        isLearned,
      }, firebaseUid, mockExamIds);

      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }

      res.json(convertFirestoreToDate(question));
    } catch (error) {
      console.error("Update question error:", error);
      res.status(500).json({ message: "Failed to update question" });
    }
  });

  app.patch("/api/questions/:id/learned", requireAuth, async (req, res) => {
    try {
      const questionId = parseInt(req.params.id);
      const { isLearned } = req.body;
      const firebaseUid = req.user!.uid;

      const updatedQuestion = await storage.updateQuestionLearned(questionId, isLearned, firebaseUid);
      if (!updatedQuestion) {
        return res.status(404).json({ error: "Question not found" });
      }

      res.json(updatedQuestion);
    } catch (error) {
      console.error("Error updating question learned status:", error);
      res.status(500).json({ error: "Failed to update question" });
    }
  });

  // Duplicate question
  app.post("/api/questions/:id/duplicate", requireAuth, async (req, res) => {
    try {
      const questionId = parseInt(req.params.id);
      const firebaseUid = req.user!.uid;

      const duplicatedQuestion = await storage.duplicateQuestion(questionId, firebaseUid);
      if (!duplicatedQuestion) {
        return res.status(404).json({ error: "Question not found" });
      }

      res.json(duplicatedQuestion);
    } catch (error) {
      console.error("Error duplicating question:", error);
      res.status(500).json({ error: "Failed to duplicate question" });
    }
  });

  app.patch("/api/questions/:id/failure-count", requireAuth, async (req, res) => {
    try {
      const firebaseUid = req.firebaseUid!;
      const id = parseInt(req.params.id);
      const { failureCount, change } = req.body;

      let newFailureCount: number;

      if (change !== undefined) {
        // Handle incremental change
        const questions = await storage.getQuestions({ firebaseUid: firebaseUid });
        const currentQuestion = questions.find(q => q.id === id);
        if (!currentQuestion) {
          return res.status(404).json({ message: "Question not found" });
        }
        newFailureCount = Math.max(0, (currentQuestion.failureCount || 0) + change);
      } else if (failureCount !== undefined) {
        // Handle direct value setting
        newFailureCount = Math.max(0, failureCount);
      } else {
        return res.status(400).json({ message: "Either failureCount or change must be provided" });
      }

      const question = await storage.updateQuestionFailureCount(id, newFailureCount, firebaseUid);
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }

      res.json(question);
    } catch (error) {
      console.error("Update question failure count error:", error);
      res.status(500).json({ message: "Failed to update question failure count" });
    }
  });

  app.delete("/api/questions/:id", requireAuth, async (req, res) => {
    try {
      const firebaseUid = req.firebaseUid!;
      const id = parseInt(req.params.id);

      const success = await storage.deleteQuestion(id, firebaseUid);
      if (!success) {
        return res.status(404).json({ message: "Question not found" });
      }

      // Invalidate trash cache so new trashed questions appear immediately
      cache.invalidate('TRASHED_QUESTIONS', firebaseUid);

      res.json({ message: "Question deleted successfully" });
    } catch (error) {
      console.error("Delete question error:", error);
      res.status(500).json({ message: "Failed to delete question" });
    }
  });

  // User stats route
  app.get("/api/user/stats", requireAuth, async (req, res) => {
    try {
      const firebaseUid = req.firebaseUid!;
      const stats = await storage.getUserStats(firebaseUid);
      res.json(stats);
    } catch (error) {
      console.error("Get user stats error:", error);
      res.status(500).json({ message: "Failed to get user stats" });
    }
  });

  // Trash routes
  app.get("/api/trash", requireAuth, async (req, res) => {
    try {
      const firebaseUid = req.firebaseUid!;
      const trashedQuestions = await storage.getTrashedQuestions(firebaseUid);
      res.json(convertFirestoreArrayToDate(trashedQuestions));
    } catch (error) {
      console.error("Get trashed questions error:", error);
      res.status(500).json({ message: "Failed to get trashed questions" });
    }
  });

  app.post("/api/trash/:id/restore", requireAuth, async (req, res) => {
    try {
      const firebaseUid = req.firebaseUid!;
      const trashedQuestionId = parseInt(req.params.id);
      console.log("Attempting to restore trashed question ID:", trashedQuestionId); // Debug log
      
      const success = await storage.restoreQuestion(trashedQuestionId, firebaseUid);

      if (!success) {
        console.log("Failed to restore question ID:", trashedQuestionId); // Debug log
        return res.status(404).json({ message: "Question not found or cannot be restored" });
      }

      // Invalidate relevant caches after successful restoration
      cache.invalidate('QUESTIONS', firebaseUid);
      cache.invalidate('QUESTION_COUNTS', firebaseUid);
      cache.invalidate('ALL_USER_QUESTIONS', firebaseUid);
      cache.invalidate('ALL_QUESTION_RELATIONS', firebaseUid);
      cache.invalidate('TRASHED_QUESTIONS', firebaseUid);

      res.json({ message: "Question restored successfully" });
    } catch (error) {
      console.error("Restore question error:", error);
      res.status(500).json({ message: "Failed to restore question" });
    }
  });

  app.delete("/api/trash/:id", requireAuth, async (req, res) => {
    try {
      const firebaseUid = req.firebaseUid!;
      const id = parseInt(req.params.id);
      const success = await storage.permanentlyDeleteQuestion(id, firebaseUid);

      if (!success) {
        return res.status(404).json({ message: "Question not found" });
      }

      res.json({ message: "Question permanently deleted" });
    } catch (error) {
      console.error("Permanently delete question error:", error);
      res.status(500).json({ message: "Failed to permanently delete question" });
    }
  });

  app.delete("/api/trash", requireAuth, async (req, res) => {
    try {
      const firebaseUid = req.firebaseUid!;
      await storage.emptyTrash(firebaseUid);
      res.json({ message: "Trash emptied successfully" });
    } catch (error) {
      console.error("Empty trash error:", error);
      res.status(500).json({ message: "Failed to empty trash" });
    }
  });

  // Get user statistics
  app.get("/api/user/stats", async (req, res) => {
    try {
      const userId = (req as any).user?.uid;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      console.log("Getting user stats for:", userId);

      // Get all questions for the user
      // Assuming 'db' is your Firestore instance
      const questionsSnapshot = await storage.db
        .collection("questions")
        .where("createdBy", "==", userId)
        .get();

      const questions = questionsSnapshot.docs.map((doc) => doc.data());

      // Calculate statistics
      const totalQuestions = questions.length;
      const learnedQuestions = questions.filter((q) => q.isLearned).length;
      const progressPercentage =
        totalQuestions > 0 ? Math.round((learnedQuestions / totalQuestions) * 100) : 0;

      // Get completed exams (exams with at least one question)
      const mockExamsSnapshot = await storage.db
        .collection("mockExams")
        .where("createdBy", "==", userId)
        .get();

      const completedExams = mockExamsSnapshot.docs.length;

      res.json({
        totalQuestions,
        learnedQuestions,
        progressPercentage,
        completedExams,
      });
    } catch (error) {
      console.error("Error getting user stats:", error);
      res.status(500).json({ error: "Failed to get user stats" });
    }
  });

  // Get detailed user statistics
  app.get("/api/user/detailed-stats", requireAuth, async (req, res) => {
    try {
      const userId = req.firebaseUid!;

      // OPTIMIZACIÓN: Hacer todas las consultas en paralelo (solo 4 consultas a BD)
      const [questions, subjects, topics, mockExams] = await Promise.all([
        storage.getQuestions({ firebaseUid: userId }),
        storage.getSubjects(userId),
        storage.getTopics(userId),
        storage.getMockExams(userId)
      ]);

      // Crear mapas para búsquedas O(1) en lugar de filtros O(n)
      const subjectMap = new Map(subjects.map(s => [s.id, s.name]));
      const topicMap = new Map(topics.map(t => [t.id, t.name]));

      // Calcular todas las estadísticas de una sola pasada por las preguntas
      const stats = {
        totalQuestions: 0,
        learnedQuestions: 0,
        doubtQuestions: 0,
        errorQuestions: 0,
        totalFailures: 0,
        typeGroups: {} as Record<string, number>,
        theoryGroups: {} as Record<string, number>,
        subjectGroups: {} as Record<number, { learned: number; doubt: number; error: number; total: number }>,
        topicGroups: {} as Record<number, { learned: number; doubt: number; error: number; total: number }>,
        failureRanges: { '0': 0, '1-2': 0, '3-5': 0, '6+': 0 },
        weeklyActivityMap: { 'Lun': 0, 'Mar': 0, 'Mié': 0, 'Jue': 0, 'Vie': 0, 'Sáb': 0, 'Dom': 0 } as Record<string, number>
      };

      // UNA SOLA ITERACIÓN por todas las preguntas para calcular todo
      questions.forEach(question => {
        const failureCount = question.failureCount || 0;
        const isLearned = question.isLearned;
        const isDoubt = !isLearned && failureCount === 0;
        const isError = !isLearned && failureCount > 0;

        // Estadísticas básicas
        stats.totalQuestions++;
        stats.totalFailures += failureCount;
        if (isLearned) stats.learnedQuestions++;
        if (isDoubt) stats.doubtQuestions++;
        if (isError) stats.errorQuestions++;

        // Agrupaciones por tipo
        const type = question.type || 'unknown';
        stats.typeGroups[type] = (stats.typeGroups[type] || 0) + 1;

        // Agrupaciones por teoría
        const theory = question.theory || 'Unknown';
        stats.theoryGroups[theory] = (stats.theoryGroups[theory] || 0) + 1;

        // Agrupaciones por asignatura
        if (!stats.subjectGroups[question.subjectId]) {
          stats.subjectGroups[question.subjectId] = { learned: 0, doubt: 0, error: 0, total: 0 };
        }
        stats.subjectGroups[question.subjectId].total++;
        if (isLearned) stats.subjectGroups[question.subjectId].learned++;
        if (isDoubt) stats.subjectGroups[question.subjectId].doubt++;
        if (isError) stats.subjectGroups[question.subjectId].error++;

        // Agrupaciones por tema
        if (!stats.topicGroups[question.topicId]) {
          stats.topicGroups[question.topicId] = { learned: 0, doubt: 0, error: 0, total: 0 };
        }
        stats.topicGroups[question.topicId].total++;
        if (isLearned) stats.topicGroups[question.topicId].learned++;
        if (isDoubt) stats.topicGroups[question.topicId].doubt++;
        if (isError) stats.topicGroups[question.topicId].error++;

        // Distribución de fallos
        if (failureCount === 0) stats.failureRanges['0']++;
        else if (failureCount <= 2) stats.failureRanges['1-2']++;
        else if (failureCount <= 5) stats.failureRanges['3-5']++;
        else stats.failureRanges['6+']++;

        // Actividad semanal
        if (question.createdAt) {
          const createdAt = question.createdAt as Timestamp;
          const date = createdAt.toDate();
          const dayName = date.toLocaleDateString('es-ES', { weekday: 'short' });
          if (stats.weeklyActivityMap[dayName] !== undefined) {
            stats.weeklyActivityMap[dayName]++;
          }
        }
      });

      // Convertir agrupaciones a arrays usando los mapas
      const questionsByType = Object.entries(stats.typeGroups).map(([type, count]) => ({ type, count }));
      const theoryDistribution = Object.entries(stats.theoryGroups).map(([theory, count]) => ({ theory, count }));
      
      const questionsBySubject = Object.entries(stats.subjectGroups)
        .map(([subjectId, data]) => ({
          subject: subjectMap.get(parseInt(subjectId)) || 'Unknown',
          ...data
        }))
        .filter(s => s.total > 0);

      const questionsByTopic = Object.entries(stats.topicGroups)
        .map(([topicId, data]) => ({
          topic: topicMap.get(parseInt(topicId)) || 'Unknown',
          ...data
        }))
        .filter(t => t.total > 0);

      // Calcular estadísticas derivadas
      const progressPercentage = stats.totalQuestions > 0 ? Math.round((stats.learnedQuestions / stats.totalQuestions) * 100) : 0;
      const averageFailureRate = stats.totalQuestions > 0 ? (stats.totalFailures / stats.totalQuestions) : 0;
      const completedExams = mockExams.length;

      // Progreso de aprendizaje (datos simulados)
      const learningProgress = [
        { date: '2024-01-01', learned: Math.floor(stats.learnedQuestions * 0.2), total: Math.floor(stats.totalQuestions * 0.3) },
        { date: '2024-02-01', learned: Math.floor(stats.learnedQuestions * 0.4), total: Math.floor(stats.totalQuestions * 0.5) },
        { date: '2024-03-01', learned: Math.floor(stats.learnedQuestions * 0.6), total: Math.floor(stats.totalQuestions * 0.7) },
        { date: '2024-04-01', learned: Math.floor(stats.learnedQuestions * 0.8), total: Math.floor(stats.totalQuestions * 0.9) },
        { date: '2024-05-01', learned: stats.learnedQuestions, total: stats.totalQuestions },
      ];

      const failureDistribution = Object.entries(stats.failureRanges).map(([range, count]) => ({ range, count }));
      
      const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
      const weeklyActivity = weekDays.map(day => ({
        day: day,
        questions: stats.weeklyActivityMap[day] || 0
      }));

      res.json({
        totalQuestions: stats.totalQuestions,
        learnedQuestions: stats.learnedQuestions,
        doubtQuestions: stats.doubtQuestions,
        errorQuestions: stats.errorQuestions,
        progressPercentage,
        completedExams,
        totalSubjects: subjects.length,
        totalTopics: topics.length,
        averageFailureRate,
        questionsByType,
        questionsBySubject,
        questionsByTopic,
        learningProgress,
        failureDistribution,
        weeklyActivity,
        theoryDistribution
      });
    } catch (error) {
      console.error("Error getting detailed user stats:", error);
      res.status(500).json({ error: "Failed to get detailed user stats" });
    }
  });

  // Cache statistics endpoint (solo para desarrollo)
  if (process.env.NODE_ENV === 'development') {
    app.get("/api/cache/stats", (req, res) => {
      const { cache } = require('./cache.js');
      res.json(cache.getStats());
    });

    app.delete("/api/cache", (req, res) => {
      const { cache } = require('./cache.js');
      cache.clear();
      res.json({ message: "Cache cleared" });
    });
  }

  const httpServer = createServer(app);
  return httpServer;
}