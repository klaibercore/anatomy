// In-memory favorites store (per server instance)
let favorites = new Set();

export const favoritesController = {
  toggle(req, res) {
    const { boneId } = req.body;
    if (!boneId) return res.status(400).json({ error: 'boneId required' });

    if (favorites.has(boneId)) {
      favorites.delete(boneId);
      res.json({ boneId, favorited: false, favorites: [...favorites] });
    } else {
      favorites.add(boneId);
      res.json({ boneId, favorited: true, favorites: [...favorites] });
    }
  },

  list(req, res) {
    res.json({ favorites: [...favorites] });
  }
};
