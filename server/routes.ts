import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertMockExamSchema, insertQuestionSchema } from "@shared/schema";
import { auth } from "./firebase";
import { Timestamp } from 'firebase-admin/firestore';

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
      
      // Get user from database using Firebase UID
      const user = await storage.getUserByFirebaseUid(decodedToken.uid);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      req.user = user;
      req.userId = user.id;
      next();
    } catch (error) {
      console.error("Auth verification error:", error);
      return res.status(401).json({ message: "Invalid token" });
    }
  };

  // Firebase auth route
  app.post("/api/auth/firebase", async (req, res) => {
    try {
      const { idToken, email, displayName, uid } = req.body;

      // Verify the Firebase ID token
      const decodedToken = await auth.verifyIdToken(idToken);
      
      if (decodedToken.uid !== uid) {
        return res.status(401).json({ message: "Invalid token" });
      }

      // Check if user exists by Firebase UID
      let user = await storage.getUserByFirebaseUid(uid);
      
      if (!user) {
        // Check if user exists by email (for migration purposes)
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser) {
          // Update existing user with Firebase UID
          user = await storage.updateUserFirebaseUid(existingUser.id, uid);
        } else {
          // Create new user
          const names = displayName ? displayName.split(' ') : ['', ''];
          const firstName = names[0] || email.split('@')[0];
          const lastName = names.slice(1).join(' ') || '';
          
          user = await storage.createUserFromFirebase({
            email,
            firstName,
            lastName,
            firebaseUid: uid,
            role: 'student'
          });
        }
      }

      res.json({ user: { ...user, password: undefined } });
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
      const [mockExams, questions] = await Promise.all([
        storage.getMockExams(req.userId),
        storage.getQuestions({ userId: req.userId })
      ]);

      // Count questions for each mock exam
      const questionCounts = questions.reduce((counts, question) => {
        counts[question.mockExamId] = (counts[question.mockExamId] || 0) + 1;
        return counts;
      }, {} as Record<number, number>);

      // Add question count to each mock exam
      const mockExamsWithCounts = mockExams.map(exam => ({
        ...convertFirestoreToDate(exam),
        questionCount: questionCounts[exam.id] || 0
      }));

      res.json(mockExamsWithCounts);
    } catch (error) {
      console.error("Get mock exams error:", error);
      res.status(500).json({ message: "Failed to get mock exams" });
    }
  });

  app.post("/api/mock-exams", requireAuth, async (req, res) => {
    try {
      const mockExamData = insertMockExamSchema.parse({
        ...req.body,
        createdBy: req.userId,
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
      const id = parseInt(req.params.id);
      const { title } = req.body;

      const mockExam = await storage.updateMockExam(id, { title }, req.userId);
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
      const id = parseInt(req.params.id);

      const success = await storage.deleteMockExam(id, req.userId);
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
      const subjects = await storage.getSubjects();
      res.json(convertFirestoreArrayToDate(subjects));
    } catch (error) {
      console.error("Get subjects error:", error);
      res.status(500).json({ message: "Failed to get subjects" });
    }
  });

  app.post("/api/subjects", requireAuth, async (req, res) => {
    try {
      const { name } = req.body;

      // Check if subject already exists
      const existing = await storage.getSubjectByName(name);
      if (existing) {
        return res.json(existing);
      }

      const subject = await storage.createSubject({ name });
      res.json(subject);
    } catch (error) {
      console.error("Create subject error:", error);
      res.status(400).json({ message: "Failed to create subject" });
    }
  });

  app.put("/api/subjects/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { name } = req.body;

      const subject = await storage.updateSubject(id, { name });
      if (!subject) {
        return res.status(404).json({ message: "Subject not found" });
      }

      res.json(subject);
    } catch (error) {
      console.error("Update subject error:", error);
      res.status(500).json({ message: "Failed to update subject" });
    }
  });

  app.delete("/api/subjects/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      const success = await storage.deleteSubject(id);
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
      const topics = await storage.getTopics();
      res.json(convertFirestoreArrayToDate(topics));
    } catch (error) {
      console.error("Get topics error:", error);
      res.status(500).json({ message: "Failed to get topics" });
    }
  });

  app.post("/api/topics", requireAuth, async (req, res) => {
    try {
      const { name } = req.body;

      // Check if topic already exists
      const existing = await storage.getTopicByName(name);
      if (existing) {
        return res.json(existing);
      }

      const topic = await storage.createTopic({ name });
      res.json(topic);
    } catch (error) {
      console.error("Create topic error:", error);
      res.status(400).json({ message: "Failed to create topic" });
    }
  });

  app.put("/api/topics/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { name } = req.body;

      const topic = await storage.updateTopic(id, { name });
      if (!topic) {
        return res.status(404).json({ message: "Topic not found" });
      }

      res.json(topic);
    } catch (error) {
      console.error("Update topic error:", error);
      res.status(500).json({ message: "Failed to update topic" });
    }
  });

  app.delete("/api/topics/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      const success = await storage.deleteTopic(id);
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
      const filters = {
        userId: req.userId,
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

      // Get all related data
      const [mockExams, subjects, topics, user] = await Promise.all([
        storage.getMockExams(req.userId),
        storage.getSubjects(),
        storage.getTopics(),
        storage.getUser(req.userId)
      ]);

      // Create lookup maps for better performance
      const mockExamMap = new Map(mockExams.map(exam => [exam.id, exam]));
      const subjectMap = new Map(subjects.map(subject => [subject.id, subject]));
      const topicMap = new Map(topics.map(topic => [topic.id, topic]));

      // Add relations to questions
      const questionsWithRelations = questions.map(question => ({
        ...convertFirestoreToDate(question),
        mockExam: convertFirestoreToDate(mockExamMap.get(question.mockExamId)) || { id: question.mockExamId, title: 'Unknown', createdBy: req.userId, createdAt: new Date() },
        subject: convertFirestoreToDate(subjectMap.get(question.subjectId)) || { id: question.subjectId, name: 'Unknown', createdAt: new Date() },
        topic: convertFirestoreToDate(topicMap.get(question.topicId)) || { id: question.topicId, name: 'Unknown', createdAt: new Date() },
        createdBy: convertFirestoreToDate(user) || { id: req.userId, email: 'unknown', name: 'Unknown', role: 'user', createdAt: new Date() }
      }));

      res.json(questionsWithRelations);
    } catch (error) {
      console.error("Get questions error:", error);
      res.status(500).json({ message: "Failed to get questions" });
    }
  });

  app.post("/api/questions", requireAuth, async (req, res) => {
    try {
      const questionData = insertQuestionSchema.parse({
        ...req.body,
        createdBy: req.userId,
      });

      const question = await storage.createQuestion(questionData);
      res.json(convertFirestoreToDate(question));
    } catch (error) {
      console.error("Create question error:", error);
      res.status(400).json({ message: "Failed to create question" });
    }
  });

  app.put("/api/questions/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { mockExamId, subjectId, topicId, type, theory, failureCount, isLearned } = req.body;

      const question = await storage.updateQuestion(id, {
        mockExamId,
        subjectId,
        topicId,
        type,
        theory,
        failureCount,
        isLearned,
      }, req.userId);

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
      const id = parseInt(req.params.id);
      const { isLearned } = req.body;

      const question = await storage.updateQuestionLearned(id, isLearned, req.userId);
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }

      res.json(question);
    } catch (error) {
      console.error("Update question learned error:", error);
      res.status(500).json({ message: "Failed to update question" });
    }
  });

  app.patch("/api/questions/:id/failure-count", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { failureCount, change } = req.body;

      let newFailureCount: number;
      
      if (change !== undefined) {
        // Handle incremental change
        const questions = await storage.getQuestions({ userId: req.userId });
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

      const question = await storage.updateQuestionFailureCount(id, newFailureCount, req.userId);
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
      const id = parseInt(req.params.id);

      const success = await storage.deleteQuestion(id, req.userId);
      if (!success) {
        return res.status(404).json({ message: "Question not found" });
      }

      res.json({ message: "Question deleted successfully" });
    } catch (error) {
      console.error("Delete question error:", error);
      res.status(500).json({ message: "Failed to delete question" });
    }
  });

  // User stats route
  app.get("/api/user/stats", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getUserStats(req.userId);
      res.json(stats);
    } catch (error) {
      console.error("Get user stats error:", error);
      res.status(500).json({ message: "Failed to get user stats" });
    }
  });

  // Admin route to promote user to admin (temporary for setup)
  app.post("/api/admin/promote", requireAuth, async (req, res) => {
    try {
      const user = await storage.updateUserRole(req.userId, 'admin');
      res.json({ ...user, password: undefined });
    } catch (error) {
      console.error("Promote user error:", error);
      res.status(500).json({ message: "Failed to promote user" });
    }
  });

  // Trash routes
  app.get("/api/trash", requireAuth, async (req, res) => {
    try {
      const trashedQuestions = await storage.getTrashedQuestions(req.userId);
      res.json(convertFirestoreArrayToDate(trashedQuestions));
    } catch (error) {
      console.error("Get trashed questions error:", error);
      res.status(500).json({ message: "Failed to get trashed questions" });
    }
  });

  app.post("/api/trash/:id/restore", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.restoreQuestion(id, req.userId);

      if (!success) {
        return res.status(404).json({ message: "Question not found or cannot be restored" });
      }

      res.json({ message: "Question restored successfully" });
    } catch (error) {
      console.error("Restore question error:", error);
      res.status(500).json({ message: "Failed to restore question" });
    }
  });

  app.delete("/api/trash/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.permanentlyDeleteQuestion(id, req.userId);

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
      await storage.emptyTrash(req.userId);
      res.json({ message: "Trash emptied successfully" });
    } catch (error) {
      console.error("Empty trash error:", error);
      res.status(500).json({ message: "Failed to empty trash" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}