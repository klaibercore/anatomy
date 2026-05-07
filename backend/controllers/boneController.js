import { loadData, enrichBone } from '../models/anatomy.js';

export const boneController = {
  async list(req, res) {
    try {
      const dataset = await loadData();
      const { enrich, page, per_page } = req.query;
      let bones = dataset.bones;

      if (enrich === 'true') {
        bones = bones.map(b => enrichBone(b, dataset));
      }

      // Pagination
      const pageNum = parseInt(page) || 1;
      const perPage = Math.min(parseInt(per_page) || 206, 206);
      const start = (pageNum - 1) * perPage;
      const paginated = bones.slice(start, start + perPage);

      res.json({
        total: bones.length,
        page: pageNum,
        perPage,
        bones: paginated
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },

  async getById(req, res) {
    try {
      const dataset = await loadData();
      const bone = dataset.bones.find(b => b.id === req.params.id);
      if (!bone) {
        return res.status(404).json({ error: `Bone '${req.params.id}' not found` });
      }
      res.json(enrichBone(bone, dataset));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },

  async random(req, res) {
    try {
      const dataset = await loadData();
      const bones = dataset.bones;
      const bone = bones[Math.floor(Math.random() * bones.length)];
      res.json(enrichBone(bone, dataset));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },

  async byShape(req, res) {
    try {
      const dataset = await loadData();
      const shape = req.params.shapeClass;
      const bones = dataset.bones.filter(b => b.shape_class === shape);
      if (bones.length === 0) {
        return res.status(404).json({ error: `No bones with shape class '${shape}'` });
      }
      res.json({ shapeClass: shape, total: bones.length, bones: bones.map(b => enrichBone(b, dataset)) });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },

  async bySide(req, res) {
    try {
      const dataset = await loadData();
      const side = req.params.side;
      const bones = dataset.bones.filter(b => b.side === side);
      res.json({ side, total: bones.length, bones: bones.map(b => enrichBone(b, dataset)) });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },

  async byDivision(req, res) {
    try {
      const dataset = await loadData();
      const div = req.params.division;
      const bones = dataset.bones.filter(b => b.axial_or_appendicular === div);
      res.json({ division: div, total: bones.length, bones: bones.map(b => enrichBone(b, dataset)) });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }
};
