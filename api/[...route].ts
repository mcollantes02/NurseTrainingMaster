
import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import { registerRoutes } from '../server/routes';

// Create Express app
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Register routes
let routesRegistered = false;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!routesRegistered) {
    await registerRoutes(app);
    routesRegistered = true;
  }

  // Create a mock server object for Express
  const mockServer = {
    listen: () => {},
    close: () => {},
  };

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

  // Handle the request
  return new Promise((resolve) => {
    app(expressReq as any, expressRes as any, (err?: any) => {
      if (err) {
        res.status(500).json({ error: 'Internal Server Error' });
      }
      resolve(undefined);
    });
  });
}
