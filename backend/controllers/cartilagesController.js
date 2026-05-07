import { loadData } from '../models/anatomy.js';

export const cartilagesController = {
  async list(req, res) {
    try {
      const dataset = await loadData();
      const cartilages = (dataset.cartilages || []).map(c => ({
        ...c,
        locatedOn: (c.located_on || []).map(ref => {
          if (ref.ref_type === 'articulation') {
            const art = (dataset.articulations || []).find(a => a.id === ref.ref_id);
            return { ...ref, name: art?.names?.preferred?.en || ref.ref_id };
          }
          return ref;
        })
      }));
      res.json({ total: cartilages.length, cartilages });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }
};
