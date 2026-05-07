import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_PATH = join(__dirname, '..', 'data', 'skeletal.json');

let dataset = null;

export async function loadData() {
  if (!dataset) {
    const raw = await readFile(DATA_PATH, 'utf-8');
    dataset = JSON.parse(raw);
  }
  return dataset;
}

export function getCachedData() {
  return dataset;
}

// ─── Bone helpers ───

export function findBone(bones, id) {
  return bones.find(b => b.id === id) || null;
}

export function getBonesByRegion(bones, regionId) {
  return bones.filter(b => b.region_ids?.includes(regionId));
}

export function getBonesByShape(bones, shapeClass) {
  return bones.filter(b => b.shape_class === shapeClass);
}

export function getBonesBySide(bones, side) {
  return bones.filter(b => b.side === side);
}

export function getBonesByDivision(bones, division) {
  return bones.filter(b => b.axial_or_appendicular === division);
}

export function searchBones(bones, query) {
  const q = query.toLowerCase();
  return bones.filter(b => {
    const en = b.names?.preferred?.en?.toLowerCase() || '';
    const la = b.names?.preferred?.la?.toLowerCase() || '';
    const id = b.id.toLowerCase();
    return en.includes(q) || la.includes(q) || id.includes(q);
  });
}

export function getUniqueShapeClasses(bones) {
  const classes = new Set(bones.map(b => b.shape_class).filter(Boolean));
  return [...classes].sort();
}

// ─── Region helpers ───

export function getRegion(regions, id) {
  return regions.find(r => r.id === id) || null;
}

export function getChildRegions(regions, parentId) {
  return regions.filter(r => r.parent_region_id === parentId);
}

export function buildRegionTree(regions) {
  const roots = regions.filter(r => !r.parent_region_id);
  function addChildren(parent) {
    const children = regions.filter(r => r.parent_region_id === parent.id);
    return {
      ...parent,
      children: children.map(addChildren)
    };
  }
  // Start from skeletal_system, then axial/appendicular
  const tree = roots.map(addChildren);
  return tree.length > 0 ? tree : [{ id: 'reg:skeletal_system', names: { preferred: { en: 'Skeletal System' } }, children: regions.filter(r => r.id !== 'reg:skeletal_system').map(addChildren) }];
}

// ─── Articulation helpers ───

export function getArticulationsForBone(articulations, boneId) {
  return articulations.filter(a =>
    a.participants?.some(p => p.bone_id === boneId)
  ) || [];
}

// ─── Ligament helpers ───

export function getLigamentsForBone(ligaments, boneId) {
  return ligaments.filter(l =>
    l.attachments?.some(a => a.bone_id === boneId)
  ) || [];
}

// ─── Enrichment ───

export function enrichBone(bone, dataset) {
  const arts = getArticulationsForBone(dataset.articulations || [], bone.id);
  const ligs = getLigamentsForBone(dataset.ligaments || [], bone.id);
  const regionNames = (bone.region_ids || [])
    .map(rid => getRegion(dataset.regions, rid))
    .filter(Boolean)
    .map(r => r.names?.preferred?.en || r.id);

  // Resolve neighbor names
  const neighbors = (bone.neighbors || []).map(n => {
    const nb = findBone(dataset.bones, n.neighbor_bone_id);
    return {
      id: n.neighbor_bone_id,
      name: nb?.names?.preferred?.en || n.neighbor_bone_id,
      direction: (n.direction_id || '').replace('dir:', ''),
      articulation: n.via_articulation_id || null
    };
  });

  return {
    ...bone,
    regionNames,
    articulations: arts.map(a => ({
      id: a.id,
      name: a.names?.preferred?.en || a.id,
      type: a.structural_subtype || a.structural_class,
      functional: a.functional_class,
      participants: a.participants?.map(p => p.bone_id) || []
    })),
    ligaments: ligs.map(l => ({
      id: l.id,
      name: l.names?.preferred?.en || l.id,
      kind: l.kind,
    })),
    neighbors,
  };
}
