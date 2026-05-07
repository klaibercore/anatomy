import { loadData } from '../models/anatomy.js';

// In-memory viewed tracker
const viewed = new Map();

export const progressController = {
  async get(req, res) {
    try {
      const dataset = await loadData();
      const totalBones = dataset.bones.length;
      const viewedCount = viewed.size;

      // Per-region breakdown
      const regions = {};
      dataset.regions.forEach(r => {
        const bones = dataset.bones.filter(b => b.region_ids?.includes(r.id));
        const viewedInRegion = bones.filter(b => viewed.has(b.id)).length;
        regions[r.id] = {
          regionName: r.names?.preferred?.en || r.id,
          total: bones.length,
          viewed: viewedInRegion
        };
      });

      res.json({
        totalBones,
        viewed: viewed.size,
        percent: totalBones > 0 ? Math.round((viewedCount / totalBones) * 100) : 0,
        regions,
        viewedBones: [...viewed]
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }
};

// Mark a bone as viewed (called by other controllers)
export function markViewed(boneId) {
  viewed.add(boneId);
}
