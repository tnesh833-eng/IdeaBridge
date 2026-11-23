import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { createExpressApp } from './server/app.ts';
import { connectMongoIfConfigured } from './server/mongo.ts';

const PORT = 3000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

async function startServer(): Promise<void> {
  await connectMongoIfConfigured();
  const app = createExpressApp();

  if (!IS_PRODUCTION) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    const assetsDir = path.join(distDir, 'assets');
    if (fs.existsSync(assetsDir)) {
      app.use(
        '/assets',
        express.static(assetsDir, {
          maxAge: '1y',
          immutable: true,
        })
      );
    }
    app.use(express.static(distDir, { index: false }));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.setHeader('Cache-Control', 'no-cache');
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`IdeaBridge worker ${process.pid} listening on http://0.0.0.0:${PORT}`);
  });

  // Match/exceed typical upstream load balancer (Nginx / AWS ALB / GCP LB) idle timeout (60s)
  // to prevent intermittent 502 Bad Gateway errors during connection reuse
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;

  let shuttingDown = false;
  const gracefulShutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`Worker ${process.pid} received ${signal}; draining HTTP connections...`);
    server.close(() => {
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 10_000).unref();
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

startServer().catch((err) => {
  console.error('Failed to start IdeaBridge server:', err);
  process.exit(1);
});
