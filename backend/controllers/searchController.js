import { loadData, searchBones, enrichBone } from '../models/anatomy.js';

export const searchController = {
  async search(req, res) {
    try {
      const { q, limit } = req.query;
      if (!q || q.trim().length < 2) {
        return res.json({ query: q || '', results: [], total: 0 });
      }

      const dataset = await loadData();
      let results = searchBones(dataset.bones, q);
      const total = results.length;

      const maxResults = Math.min(parseInt(limit) || 30, 100);
      results = results.slice(0, maxResults).map(b => enrichBone(b, dataset));

      res.json({
        query: q,
        total,
        results
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }
};
