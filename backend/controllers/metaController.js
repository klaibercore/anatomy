import { loadData } from '../models/anatomy.js';

export const metaController = {
  async measurementDefinitions(req, res) {
    try {
      const dataset = await loadData();
      res.json(dataset.measurement_definitions || []);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },

  async coordinateFrames(req, res) {
    try {
      const dataset = await loadData();
      res.json(dataset.coordinate_frames || []);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  },

  async relations(req, res) {
    try {
      const dataset = await loadData();
      // Resolve subject/object names
      const relations = (dataset.anatomical_relations || []).map(r => {
        function resolveName(ref) {
          if (!ref) return null;
          if (ref.ref_type === 'bone') {
            const bone = dataset.bones.find(b => b.id === ref.ref_id);
            return { ...ref, name: bone?.names?.preferred?.en || ref.ref_id };
          }
          if (ref.ref_type === 'articulation') {
            const art = (dataset.articulations || []).find(a => a.id === ref.ref_id);
            return { ...ref, name: art?.names?.preferred?.en || ref.ref_id };
          }
          return ref;
        }
        return {
          ...r,
          subject: resolveName(r.subject),
          object: resolveName(r.object),
          via: r.via ? resolveName(r.via) : undefined
        };
      });
      res.json({ total: relations.length, relations });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }
};
