
import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import { registerRoutes } from '../server/routes';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Register all routes
registerRoutes(app);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Convert Vercel request to Express request
  const expressReq = req as any;
  const expressRes = res as any;
  
  // Handle the request with Express
  app(expressReq, expressRes);
}
