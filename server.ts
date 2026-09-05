import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createExpressApp } from './server/app.js';
import { verifyDatabaseConnection } from './server/db.js';

async function startServer() {
  // Verify the production database before starting the application.
  // This prevents the server from starting if Supabase is unavailable
  // or incorrectly configured.
  await verifyDatabaseConnection();

  const app = createExpressApp();
  const PORT = Number(process.env.PORT) || 3000;

  // Vite middleware for development vs static files for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');

    app.use(express.static(distPath));

    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(
      `Cloud Media Storage server running on http://0.0.0.0:${PORT}`
    );
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});