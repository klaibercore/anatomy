import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { boneController } from './controllers/boneController.js';
import { regionController } from './controllers/regionController.js';
import { articulationController } from './controllers/articulationController.js';
import { ligamentController } from './controllers/ligamentController.js';
import { searchController } from './controllers/searchController.js';
import { statsController } from './controllers/statsController.js';
import { metaController } from './controllers/metaController.js';
import { cartilagesController } from './controllers/cartilagesController.js';
import { progressController } from './controllers/progressController.js';
import { favoritesController } from './controllers/favoritesController.js';
import { frontendController } from './controllers/frontendController.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' }
});
app.use('/api/', limiter);

// ─── API Routes ───

// Search
app.get('/api/search', searchController.search);

// Stats
app.get('/api/stats', statsController.getStats);

// Bones
app.get('/api/bones', boneController.list);
app.get('/api/bones/random', boneController.random);
app.get('/api/bones/shape/:shapeClass', boneController.byShape);
app.get('/api/bones/side/:side', boneController.bySide);
app.get('/api/bones/division/:division', boneController.byDivision);
app.get('/api/bones/:id', boneController.getById);

// Regions
app.get('/api/regions', regionController.list);
app.get('/api/regions/:id', regionController.getById);

// Articulations
app.get('/api/articulations', articulationController.list);
app.get('/api/articulations/:id', articulationController.getById);

// Ligaments
app.get('/api/ligaments', ligamentController.list);
app.get('/api/ligaments/:id', ligamentController.getById);

// Cartilages
app.get('/api/cartilages', cartilagesController.list);

// Meta (measurement definitions, coordinate frames, relations)
app.get('/api/measurement-definitions', metaController.measurementDefinitions);
app.get('/api/coordinate-frames', metaController.coordinateFrames);
app.get('/api/anatomical-relations', metaController.relations);

// Favorites & Progress (in-memory, per server session)
app.post('/api/favorites', favoritesController.toggle);
app.get('/api/favorites', favoritesController.list);
app.get('/api/progress', progressController.get);

// ─── Frontend ───
app.use(express.static('frontend'));

app.get('/api/*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found. See /api/stats for available routes.' });
});

app.listen(PORT, () => {
  console.log(`🧬 Anatomy API running on http://localhost:${PORT}`);
  console.log(`   Stats:    http://localhost:${PORT}/api/stats`);
  console.log(`   Bones:    http://localhost:${PORT}/api/bones`);
  console.log(`   Search:   http://localhost:${PORT}/api/search?q=femur`);
  console.log(`   Random:   http://localhost:${PORT}/api/bones/random`);
});
