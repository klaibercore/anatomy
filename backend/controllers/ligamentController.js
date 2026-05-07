import { loadData } from '../models/anatomy.js';

export const ligamentController = {
  async list(req, res) {
    try {
      const dataset = await loadData();
      const { bone_id } = req.query;
      let ligaments = dataset.ligaments || [];
      if (bone_id) {
        ligaments = ligaments.filter(l =>
          l.attachments?.some(a => a.bone_id === bone_id)
        );
      }
      // Return with resolved bone names
      ligaments = ligaments.map(l => ({
        ...l,
        attachments: (l.attachments || []).map(a => {
          const bone = dataset.bones.find(b => b.id === a.bone_id);
          return { ...a, boneName: bone?.names?.preferred?.en || a.bone_id };
        })
      }));
      res.json({ total: ligaments.length, ligaments });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },

  async getById(req, res) {
    try {
      const dataset = await loadData();
      const lig = (dataset.ligaments || []).find(l => l.id === req.params.id);
      if (!lig) return res.status(404).json({ error: `Ligament '${req.params.id}' not found` });
      // Resolve bone names
      const enriched = {
        ...lig,
        attachments: (lig.attachments || []).map(a => {
          const bone = dataset.bones.find(b => b.id === a.bone_id);
          return { ...a, boneName: bone?.names?.preferred?.en || a.bone_id };
        })
      };
      res.json(enriched);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }
};
