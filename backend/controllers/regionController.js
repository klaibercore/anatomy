import { loadData, getRegion, getChildRegions, buildRegionTree, getBonesByRegion } from '../models/anatomy.js';

export const regionController = {
  async list(req, res) {
    try {
      const dataset = await loadData();
      const { tree, bones: includeBones } = req.query;
      if (tree === 'true') {
        return res.json(buildRegionTree(dataset.regions));
      }
      let regions = dataset.regions;
      if (includeBones === 'true') {
        regions = regions.map(r => ({
          ...r,
          bones: getBonesByRegion(dataset.bones, r.id).map(b => b.id)
        }));
      }
      res.json(regions);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },

  async getById(req, res) {
    try {
      const dataset = await loadData();
      const region = getRegion(dataset.regions, req.params.id);
      if (!region) return res.status(404).json({ error: `Region '${req.params.id}' not found` });

      const bones = getBonesByRegion(dataset.bones, region.id);
      const children = getChildRegions(dataset.regions, region.id);

      res.json({
        ...region,
        boneCount: bones.length,
        bones: bones.map(b => ({
          id: b.id,
          name: b.names?.preferred?.en || b.id,
          latin: b.names?.preferred?.la || '',
          shapeClass: b.shape_class,
          side: b.side
        })),
        subregions: children.map(c => ({
          id: c.id,
          name: c.names?.preferred?.en || c.id
        }))
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }
};
