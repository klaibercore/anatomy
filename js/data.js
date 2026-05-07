/**
 * Anatomy — Topic Registry & Region Hierarchy
 */

const TOPICS = {
  skeletal: {
    id: 'skeletal',
    title: 'Skeletal System',
    subtitle: '206 bones, 68 articulations, 84 ligaments — the structural framework of the human body',
    icon: '🦴',
    color: '#e8d5b7',
    route: 'topics/skeletal.html',
    dataFile: 'data/skeletal.json',
    count: '206 bones'
  }
};

/**
 * Region hierarchy for the tree browser.
 * Each entry maps a region ID to its display name, icon,
 * children (sub-regions), and the order among siblings.
 *
 * Bones are pulled dynamically from skeletal.json's region_ids.
 */
const REGION_HIERARCHY = [
  {
    id: 'reg:axial',
    name: 'Axial Skeleton',
    icon: '🔝',
    children: [
      {
        id: 'reg:skull',
        name: 'Neurocranium (Skull vault)',
        icon: '🧠',
        parentRegion: 'reg:axial'
      },
      {
        id: 'reg:facial_skeleton',
        name: 'Viscerocranium (Face)',
        icon: '👤',
        parentRegion: 'reg:axial'
      },
      {
        id: 'reg:hyoid_apparatus',
        name: 'Hyoid Apparatus',
        icon: '🦷',
        parentRegion: 'reg:axial'
      },
      {
        id: 'reg:vertebral_column',
        name: 'Vertebral Column',
        icon: '📏',
        parentRegion: 'reg:axial'
      },
      {
        id: 'reg:thoracic_cage',
        name: 'Thoracic Cage',
        icon: '🛡️',
        parentRegion: 'reg:axial'
      }
    ]
  },
  {
    id: 'reg:appendicular',
    name: 'Appendicular Skeleton',
    icon: '🏃',
    children: [
      {
        id: 'reg:pectoral_girdle',
        name: 'Pectoral Girdle',
        icon: '🔗',
        parentRegion: 'reg:appendicular'
      },
      {
        id: 'reg:upper_limb',
        name: 'Upper Limb (Free part)',
        icon: '💪',
        parentRegion: 'reg:appendicular'
      },
      {
        id: 'reg:pelvic_girdle',
        name: 'Pelvic Girdle',
        icon: '🦴',
        parentRegion: 'reg:appendicular'
      },
      {
        id: 'reg:lower_limb',
        name: 'Lower Limb (Free part)',
        icon: '🦵',
        parentRegion: 'reg:appendicular'
      }
    ]
  }
];

const SHAPE_CLASS_ICONS = {
  'long': '📏',
  'short': '⚪',
  'flat': '🔲',
  'irregular': '🌀',
  'sesamoid': '💎'
};

const SIDE_SYMBOLS = {
  'left': '←',
  'right': '→',
  'bilateral': '↔',
  'median': '⊙',
  'unsided': '·'
};
