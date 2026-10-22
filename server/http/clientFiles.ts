import path from 'node:path';
import express, { type Express } from 'express';

/**
 * Serves the built interface from `clientDir`. Any other page address gets
 * `index.html`, so the browser's router shows the right screen after a reload.
 * Addresses under /api never get the page: an unknown API address stays a 404.
 */
export function serveClient(app: Express, clientDir: string): void {
  const indexFile = path.resolve(clientDir, 'index.html');
  app.use(express.static(clientDir, { index: false }));
  app.use((request, response, next) => {
    if (request.method !== 'GET' || request.path.startsWith('/api')) {
      next();
      return;
    }
    response.sendFile(indexFile);
  });
}
