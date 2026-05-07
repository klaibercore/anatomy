# Anatomy Backend — MVC API Server

Express MVC backend serving the 206-bone computational anatomy reference dataset.

## Quick Start

```bash
cd backend
npm install
npm start
```

Server runs on `http://localhost:3001`.

## API Endpoints

### Stats
`GET /api/stats` — Total counts of bones, articulations, ligaments, etc.

### Bones
| Endpoint | Description |
|---|---|
| `GET /api/bones` | List all 206 bones (supports `?page=1&per_page=20`) |
| `GET /api/bones?enrich=true` | List with resolved articulations, ligaments, neighbors |
| `GET /api/bones/random` | Random bone with full enrichment |
| `GET /api/bones/:id` | Single bone (e.g. `bone:femur_L`) |
| `GET /api/bones/shape/long` | Filter by shape class (long/short/flat/irregular/sesamoid) |
| `GET /api/bones/side/left` | Filter by side (left/right/median/bilateral) |
| `GET /api/bones/division/appendicular` | Filter by division (axial/appendicular) |

### Search
`GET /api/search?q=femur` — Search by English/Latin name or ID. Supports `?limit=30`.

### Regions
| Endpoint | Description |
|---|---|
| `GET /api/regions` | All 13 regions |
| `GET /api/regions?tree=true` | Hierarchical region tree |
| `GET /api/regions?includeBones=true` | Regions with bone ID lists |
| `GET /api/regions/:id` | Single region with bone list |

### Articulations
| Endpoint | Description |
|---|---|
| `GET /api/articulations` | All 68 articulations |
| `GET /api/articulations?bone_id=bone:femur_L` | Filter by bone |
| `GET /api/articulations/:id` | Single articulation with resolved participant names |

### Ligaments
| Endpoint | Description |
|---|---|
| `GET /api/ligaments` | All 84 ligaments |
| `GET /api/ligaments?bone_id=bone:femur_L` | Filter by attachment |
| `GET /api/ligaments/:id` | Single ligament with resolved attachment names |

### Meta
| Endpoint | Description |
|---|---|
| `GET /api/cartilages` | 29 cartilage structures |
| `GET /api/measurement-definitions` | 18 measurement definitions |
| `GET /api/coordinate-frames` | 11 coordinate frame definitions |
| `GET /api/anatomical-relations` | 32 directed anatomical relations |

### Session
| Endpoint | Description |
|---|---|
| `POST /api/favorites` | Toggle favorite `{"boneId": "bone:femur_L"}` |
| `GET /api/favorites` | List favorited bone IDs |
| `GET /api/progress` | Exploration progress per region |

## Data

The dataset at `backend/data/skeletal.json` contains:
- 206 bones with FMA/TA2/UBERON cross-references
- 68 articulations with structural/functional classification
- 84 ligaments with attachments and function tags
- 29 cartilage structures
- 11 coordinate frames
- 18 measurement definitions
- 32 anatomical relations (directed graph)
