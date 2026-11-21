import type { Request, Response } from 'express';
import { createExpressApp } from '../server/app.ts';
import { connectMongoIfConfigured } from '../server/mongo.ts';

const app = createExpressApp();

export default async function handler(req: Request, res: Response): Promise<void> {
  await connectMongoIfConfigured();
  app(req, res);
}
