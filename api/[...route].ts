
import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import { registerRoutes } from '../server/routes.js';

// Create Express app
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Register routes once
registerRoutes(app);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Convert Vercel request to Express format
  const expressReq = Object.assign(req, {
    app,
    route: undefined,
    baseUrl: '',
    originalUrl: req.url,
    path: req.url?.split('?')[0] || '/',
  });

  const expressRes = Object.assign(res, {
    app,
    locals: {},
    charset: 'utf-8',
  });

  // Handle the request with Express
  return new Promise((resolve) => {
    // Add a custom end function to resolve the promise
    const originalEnd = expressRes.end;
    expressRes.end = function(...args: any[]) {
      originalEnd.apply(this, args);
      resolve(undefined);
    };

    // Add a custom send function
    const originalSend = expressRes.send;
    expressRes.send = function(body: any) {
      originalSend.call(this, body);
      resolve(undefined);
      return this;
    };

    // Add a custom json function
    const originalJson = expressRes.json;
    expressRes.json = function(body: any) {
      originalJson.call(this, body);
      resolve(undefined);
      return this;
    };

    // Handle the request
    app(expressReq as any, expressRes as any, (err?: any) => {
      if (err) {
        console.error('Express error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
        resolve(undefined);
      }
    });
  });
}
