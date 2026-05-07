import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, 'data', 'skeletal.json');
let dataset = null;

async function loadData() {
  if (!dataset) {
    const raw = await readFile(DATA_PATH, 'utf-8');
    dataset = JSON.parse(raw);
  }
  return dataset;
}

function findBone(id) {
  if (!dataset) return null;
  return dataset.bones.find(b => b.id === id) || null;
}

function search(q) {
  if (!dataset) return [];
  const query = q.toLowerCase();
  return dataset.bones.filter(b => {
    const en = b.names?.preferred?.en?.toLowerCase() || '';
    const la = b.names?.preferred?.la?.toLowerCase() || '';
    const id = b.id.toLowerCase();
    return en.includes(query) || la.includes(query) || id.includes(query);
  });
}

function getRegion(id) {
  if (!dataset) return null;
  return dataset.regions.find(r => r.id === id) || null;
}

function enrichBone(bone) {
  if (!dataset) return bone;
  const arts = (dataset.articulations || []).filter(a =>
    a.participants?.some(p => p.bone_id === bone.id)
  );
  const ligs = (dataset.ligaments || []).filter(l =>
    l.attachments?.some(a => a.bone_id === bone.id)
  );
  const regionNames = (bone.region_ids || [])
    .map(rid => getRegion(rid))
    .filter(Boolean)
    .map(r => r.names?.preferred?.en || r.id);
  return { ...bone, regionNames, articulationCount: arts.length, ligamentCount: ligs.length };
}

async function main() {
  await loadData();
  console.error(`🧬 Anatomy MCP Server loaded: ${dataset.bones.length} bones`, new Date().toISOString());

  const server = new Server(
    { name: 'anatomy-mcp', version: '1.0.0' },
    { capabilities: { tools: {}, resources: {} } }
  );

  // ─── Tools ───

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'search_bones',
        description: 'Search bones by English/Latin name or ID',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search term (bone name, Latin, or ID)' },
            limit: { type: 'number', description: 'Max results (default 10)' }
          },
          required: ['query']
        }
      },
      {
        name: 'get_bone',
        description: 'Get detailed info about a specific bone by its ID',
        inputSchema: {
          type: 'object',
          properties: {
            bone_id: { type: 'string', description: 'Bone ID (e.g. bone:femur_L, bone:frontal)' }
          },
          required: ['bone_id']
        }
      },
      {
        name: 'random_bone',
        description: 'Get a random bone with details',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'get_region',
        description: 'Get a region with its bones',
        inputSchema: {
          type: 'object',
          properties: {
            region_id: { type: 'string', description: 'Region ID (e.g. reg:skull, reg:vertebral_column)' }
          },
          required: ['region_id']
        }
      },
      {
        name: 'list_articulations',
        description: 'List articulations for a bone',
        inputSchema: {
          type: 'object',
          properties: {
            bone_id: { type: 'string', description: 'Bone ID' }
          },
          required: ['bone_id']
        }
      },
      {
        name: 'list_ligaments',
        description: 'List ligaments attached to a bone',
        inputSchema: {
          type: 'object',
          properties: {
            bone_id: { type: 'string', description: 'Bone ID' }
          },
          required: ['bone_id']
        }
      },
      {
        name: 'list_regions',
        description: 'List all anatomical regions',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'get_stats',
        description: 'Get summary statistics of the skeletal dataset',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'filter_bones',
        description: 'Filter bones by shape class, side, or division',
        inputSchema: {
          type: 'object',
          properties: {
            shape_class: { type: 'string', enum: ['long', 'short', 'flat', 'irregular', 'sesamoid'] },
            side: { type: 'string', enum: ['left', 'right', 'median', 'bilateral'] },
            division: { type: 'string', enum: ['axial', 'appendicular'] }
          }
        }
      }
    ]
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'search_bones': {
          const query = args.query;
          const limit = args.limit || 10;
          const results = search(query).slice(0, limit).map(enrichBone);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({ query, total: search(query).length, results }, null, 2)
            }]
          };
        }
        case 'get_bone': {
          const bone = findBone(args.bone_id);
          if (!bone) {
            return { content: [{ type: 'text', text: `Bone '${args.bone_id}' not found` }], isError: true };
          }
          return {
            content: [{ type: 'text', text: JSON.stringify(enrichBone(bone), null, 2) }]
          };
        }
        case 'random_bone': {
          const bones = dataset.bones;
          const bone = bones[Math.floor(Math.random() * bones.length)];
          return {
            content: [{ type: 'text', text: JSON.stringify(enrichBone(bone), null, 2) }]
          };
        }
        case 'get_region': {
          const region = getRegion(args.region_id);
          if (!region) {
            return { content: [{ type: 'text', text: `Region '${args.region_id}' not found` }], isError: true };
          }
          const bones = dataset.bones.filter(b => b.region_ids?.includes(args.region_id));
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                ...region,
                boneCount: bones.length,
                bones: bones.map(b => ({
                  id: b.id,
                  name: b.names?.preferred?.en || b.id,
                  latin: b.names?.preferred?.la || '',
                  shape: b.shape_class,
                  side: b.side
                }))
              }, null, 2)
            }]
          };
        }
        case 'list_articulations': {
          const arts = (dataset.articulations || []).filter(a =>
            a.participants?.some(p => p.bone_id === args.bone_id)
          );
          const bone = findBone(args.bone_id);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                bone: bone?.names?.preferred?.en || args.bone_id,
                total: arts.length,
                articulations: arts.map(a => ({
                  id: a.id,
                  name: a.names?.preferred?.en || a.id,
                  type: a.structural_subtype || a.structural_class,
                  functional: a.functional_class,
                  participants: a.participants?.map(p => p.bone_id)
                }))
              }, null, 2)
            }]
          };
        }
        case 'list_ligaments': {
          const ligs = (dataset.ligaments || []).filter(l =>
            l.attachments?.some(a => a.bone_id === args.bone_id)
          );
          const bone = findBone(args.bone_id);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                bone: bone?.names?.preferred?.en || args.bone_id,
                total: ligs.length,
                ligaments: ligs.map(l => ({
                  id: l.id,
                  name: l.names?.preferred?.en || l.id,
                  kind: l.kind,
                  attachments: l.attachments?.map(a => ({
                    boneId: a.bone_id,
                    name: findBone(a.bone_id)?.names?.preferred?.en || a.bone_id
                  }))
                }))
              }, null, 2)
            }]
          };
        }
        case 'list_regions': {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(dataset.regions.map(r => ({
                id: r.id,
                name: r.names?.preferred?.en || r.id,
                division: r.division || '',
                boneCount: dataset.bones.filter(b => b.region_ids?.includes(r.id)).length
              })), null, 2)
            }]
          };
        }
        case 'get_stats': {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                totalBones: dataset.bones.length,
                totalArticulations: (dataset.articulations || []).length,
                totalLigaments: (dataset.ligaments || []).length,
                totalRegions: dataset.regions.length,
                shapeClasses: [...new Set(dataset.bones.map(b => b.shape_class).filter(Boolean))],
                byShape: Object.fromEntries(
                  [...new Set(dataset.bones.map(b => b.shape_class).filter(Boolean))]
                    .map(s => [s, dataset.bones.filter(b => b.shape_class === s).length])
                ),
                byDivision: {
                  axial: dataset.bones.filter(b => b.axial_or_appendicular === 'axial').length,
                  appendicular: dataset.bones.filter(b => b.axial_or_appendicular === 'appendicular').length
                }
              }, null, 2)
            }]
          };
        }
        case 'filter_bones': {
          let results = dataset.bones;
          if (args.shape_class) results = results.filter(b => b.shape_class === args.shape_class);
          if (args.side) results = results.filter(b => b.side === args.side);
          if (args.division) results = results.filter(b => b.axial_or_appendicular === args.division);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                filters: args,
                total: results.length,
                bones: results.slice(0, 50).map(enrichBone)
              }, null, 2)
            }]
          };
        }
        default:
          return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
      }
    } catch (err) {
      return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
    }
  });

  // ─── Resources (anatomy://bone/<id> URLs) ───
  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [
      {
        uri: 'anatomy://bones',
        name: 'All Bones',
        description: 'List of all 206 bones in the human skeleton',
        mimeType: 'application/json'
      },
      {
        uri: 'anatomy://stats',
        name: 'Skeletal System Stats',
        description: 'Summary statistics of the skeletal dataset',
        mimeType: 'application/json'
      },
      {
        uri: 'anatomy://regions',
        name: 'Anatomical Regions',
        description: 'All 13 anatomical regions of the skeletal system',
        mimeType: 'application/json'
      }
    ]
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri;
    if (uri === 'anatomy://bones') {
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(dataset.bones.map(b => ({
            id: b.id, name: b.names?.preferred?.en, latin: b.names?.preferred?.la
          })), null, 2)
        }]
      };
    }
    if (uri === 'anatomy://stats') {
      return {
        contents: [{
          uri, mimeType: 'application/json',
          text: JSON.stringify({
            totalBones: dataset.bones.length,
            totalArticulations: (dataset.articulations || []).length,
            totalLigaments: (dataset.ligaments || []).length,
            totalRegions: dataset.regions.length,
            totalCartilages: (dataset.cartilages || []).length,
            totalFrames: (dataset.coordinate_frames || []).length,
            totalMeasurements: (dataset.measurement_definitions || []).length,
            totalRelations: (dataset.anatomical_relations || []).length
          }, null, 2)
        }]
      };
    }
    if (uri === 'anatomy://regions') {
      return {
        contents: [{
          uri, mimeType: 'application/json',
          text: JSON.stringify(dataset.regions.map(r => ({
            id: r.id,
            name: r.names?.preferred?.en,
            division: r.division,
            boneCount: dataset.bones.filter(b => b.region_ids?.includes(r.id)).length
          })), null, 2)
        }]
      };
    }
    return { content: [{ type: 'text', text: `Resource not found: ${uri}` }], isError: true };
  });

  // ─── Connect via stdio ───
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('🧬 Anatomy MCP Server ready on stdio');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
