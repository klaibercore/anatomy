import { loadData } from '../models/anatomy.js';

export const articulationController = {
  async list(req, res) {
    try {
      const dataset = await loadData();
      const { bone_id } = req.query;
      let articulations = dataset.articulations || [];
      if (bone_id) {
        articulations = articulations.filter(a =>
          a.participants?.some(p => p.bone_id === bone_id)
        );
      }
      res.json({ total: articulations.length, articulations });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },

  async getById(req, res) {
    try {
      const dataset = await loadData();
      const art = (dataset.articulations || []).find(a => a.id === req.params.id);
      if (!art) return res.status(404).json({ error: `Articulation '${req.params.id}' not found` });

      // Resolve bone names of participants
      const participants = (art.participants || []).map(p => {
        const bone = dataset.bones.find(b => b.id === p.bone_id);
        return { ...p, boneName: bone?.names?.preferred?.en || p.bone_id };
      });

      res.json({ ...art, participants });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }
};
