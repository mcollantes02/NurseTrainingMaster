
import { Request } from 'express';
import { User } from '@shared/schema';

// Extend Express Request interface to include Firebase auth properties
declare global {
  namespace Express {
    interface Request {
      firebaseUid?: string;
      user?: User;
    }
  }
}

export {};
