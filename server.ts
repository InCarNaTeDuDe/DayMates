/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import 'reflect-metadata';
import express from 'express';
import path from 'path';
import { createServer as createHttpServer } from 'http';
import { createServer as createViteServer } from 'vite';
import apiRouter from './src/backend/routes/api';
import { initSocketIO } from './src/backend/sockets';
import { db } from './src/backend/services/db';

async function startServer() {
  const app = express();
  const server = createHttpServer(app);
  const PORT = 3000;

  // Initialize TypeORM database
  await db.initializeTypeORM();

  // JSON and URL-encoded body parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Basic CORS headers
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  // API router
  app.use('/api', apiRouter);

  // Initialize Socket.IO with server
  initSocketIO(server);

  // Setup Vite development middleware OR serve built static assets
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Server] Initializing Vite middleware for development...');
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        watch: process.env.DISABLE_HMR === 'true' ? null : {}
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    console.log('[Server] Serving built production assets...');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Bind to host 0.0.0.0 and port 3000 exclusively
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[DayMates Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('[Server] Critical failure during startup:', err);
});
