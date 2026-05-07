import { loadData, getCachedData, getUniqueShapeClasses } from '../models/anatomy.js';

export const statsController = {
  async getStats(req, res) {
    try {
      const d = await loadData();
      const bones = d.bones;
      const shapeClasses = getUniqueShapeClasses(bones);
      const sideCounts = {};
      bones.forEach(b => {
        const side = b.side || 'unsided';
        sideCounts[side] = (sideCounts[side] || 0) + 1;
      });
      const divisionCounts = {};
      bones.forEach(b => {
        const div = b.axial_or_appendicular || 'other';
        divisionCounts[div] = (divisionCounts[div] || 0) + 1;
      });
      const shapeCounts = {};
      bones.forEach(b => {
        if (b.shape_class) {
          shapeCounts[b.shape_class] = (shapeCounts[b.shape_class] || 0) + 1;
        }
      });
      res.json({
        totalBones: bones.length,
        totalArticulations: (d.articulations || []).length,
        totalLigaments: (d.ligaments || []).length,
        totalRegions: d.regions.length,
        totalCartilages: (d.cartilages || []).length,
        totalCoordinateFrames: (d.coordinate_frames || []).length,
        totalMeasurementDefinitions: (d.measurement_definitions || []).length,
        totalAnatomicalRelations: (d.anatomical_relations || []).length,
        shapeClasses,
        sideCounts,
        divisionCounts,
        shapeCounts,
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  }
};
