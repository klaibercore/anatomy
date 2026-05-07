// Frontend assets — serves the static SPA that hooks into the API
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FRONTEND_PATH = join(__dirname, '..', 'frontend');

export const frontendController = {
  async serveIndex(req, res) {
    try {
      const html = await readFile(join(FRONTEND_PATH, 'index.html'), 'utf-8');
      res.type('html').send(html);
    } catch {
      res.status(200).json({ message: 'Anatomy API is running. Point your frontend to /api/bones, /api/search, etc.', docs: '/api/stats' });
    }
  }
};
