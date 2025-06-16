import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertMockExamSchema, insertQuestionSchema } from "@shared/schema";
import bcrypt from "bcrypt";
import session from "express-session";
import connectPg from "connect-pg-simple";

declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Session setup
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "user_sessions",
  });

  app.use(
    session({
      secret: process.env.SESSION_SECRET || "your-session-secret-key",
      store: sessionStore,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: false, // Set to true in production with HTTPS
        maxAge: sessionTtl,
      },
    })
  );

  // Middleware to check authentication
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  };

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });

      // Set session
      req.session.userId = user.id;

      res.json({ user: { ...user, password: undefined } });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(400).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Set session
      req.session.userId = user.id;

      res.json({ user: { ...user, password: undefined } });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/user", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ ...user, password: undefined });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  // Mock exam routes
  app.get("/api/mock-exams", requireAuth, async (req, res) => {
    try {
      const mockExams = await storage.getMockExams(req.session.userId!);
      res.json(mockExams);
    } catch (error) {
      console.error("Get mock exams error:", error);
      res.status(500).json({ message: "Failed to get mock exams" });
    }
  });

  app.post("/api/mock-exams", requireAuth, async (req, res) => {
    try {
      const mockExamData = insertMockExamSchema.parse({
        ...req.body,
        createdBy: req.session.userId!,
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

      const mockExam = await storage.updateMockExam(id, { title }, req.session.userId!);
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

      const success = await storage.deleteMockExam(id, req.session.userId!);
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
      res.json(subjects);
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
      res.json(topics);
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
      const {
        mockExamIds,
        subjectIds,
        topicIds,
        keywords,
        learningStatus,
      } = req.query;

      const filters = {
        userId: req.session.userId!,
        mockExamIds: mockExamIds ? (Array.isArray(mockExamIds) ? mockExamIds.map(Number) : [Number(mockExamIds)]) : undefined,
        subjectIds: subjectIds ? (Array.isArray(subjectIds) ? subjectIds.map(Number) : [Number(subjectIds)]) : undefined,
        topicIds: topicIds ? (Array.isArray(topicIds) ? topicIds.map(Number) : [Number(topicIds)]) : undefined,
        keywords: keywords as string,
        learningStatus: learningStatus ? (Array.isArray(learningStatus) ? learningStatus.map(s => s === 'true') : [learningStatus === 'true']) : undefined,
      };

      const questions = await storage.getQuestions(filters);
      res.json(questions);
    } catch (error) {
      console.error("Get questions error:", error);
      res.status(500).json({ message: "Failed to get questions" });
    }
  });

  app.post("/api/questions", requireAuth, async (req, res) => {
    try {
      const questionData = insertQuestionSchema.parse({
        ...req.body,
        createdBy: req.session.userId!,
      });

      const question = await storage.createQuestion(questionData);
      res.json(question);
    } catch (error) {
      console.error("Create question error:", error);
      res.status(400).json({ message: "Failed to create question" });
    }
  });

  app.put("/api/questions/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { mockExamId, subjectId, topicId, type, theory, isLearned } = req.body;

      const question = await storage.updateQuestion(id, {
        mockExamId,
        subjectId,
        topicId,
        type,
        theory,
        isLearned,
      }, req.session.userId!);

      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }

      res.json(question);
    } catch (error) {
      console.error("Update question error:", error);
      res.status(500).json({ message: "Failed to update question" });
    }
  });

  app.patch("/api/questions/:id/learned", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { isLearned } = req.body;

      const question = await storage.updateQuestionLearned(id, isLearned, req.session.userId!);
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
      const { failureCount } = req.body;

      const question = await storage.updateQuestionFailureCount(id, failureCount, req.session.userId!);
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

      const success = await storage.deleteQuestion(id, req.session.userId!);
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
      const stats = await storage.getUserStats(req.session.userId!);
      res.json(stats);
    } catch (error) {
      console.error("Get user stats error:", error);
      res.status(500).json({ message: "Failed to get user stats" });
    }
  });

  // Admin route to promote user to admin (temporary for setup)
  app.post("/api/admin/promote", requireAuth, async (req, res) => {
    try {
      const user = await storage.updateUserRole(req.session.userId!, 'admin');
      res.json({ ...user, password: undefined });
    } catch (error) {
      console.error("Promote user error:", error);
      res.status(500).json({ message: "Failed to promote user" });
    }
  });

  // Trash routes
  app.get("/api/trash", requireAuth, async (req, res) => {
    try {
      const trashedQuestions = await storage.getTrashedQuestions(req.session.userId!);
      res.json(trashedQuestions);
    } catch (error) {
      console.error("Get trashed questions error:", error);
      res.status(500).json({ message: "Failed to get trashed questions" });
    }
  });

  app.post("/api/trash/:id/restore", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.restoreQuestion(id, req.session.userId!);
      
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
      const success = await storage.permanentlyDeleteQuestion(id, req.session.userId!);
      
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
      await storage.emptyTrash(req.session.userId!);
      res.json({ message: "Trash emptied successfully" });
    } catch (error) {
      console.error("Empty trash error:", error);
      res.status(500).json({ message: "Failed to empty trash" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
