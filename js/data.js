/**
 * Anatomy — Topic Registry & Data Loading
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
 * Map SVG bone-area IDs to region IDs or specific bone IDs.
 * SVG areas group bones visually (e.g., "ribs" = whole rib cage + sternum).
 */
const SVG_BONE_MAP = {
  'cranium':       { type: 'region', id: 'reg:skull' },
  'mandible':      { type: 'bone', id: 'bone:mandible' },
  'clavicle':      { type: 'bone_group', ids: ['bone:clavicle_L', 'bone:clavicle_R'] },
  'scapula':       { type: 'bone_group', ids: ['bone:scapula_L', 'bone:scapula_R'] },
  'sternum':       { type: 'bone', id: 'bone:sternum' },
  'ribs':          { type: 'region', id: 'reg:thoracic_cage' },
  'humerus':       { type: 'bone_group', ids: ['bone:humerus_L', 'bone:humerus_R'] },
  'radius':        { type: 'bone_group', ids: ['bone:radius_L', 'bone:radius_R'] },
  'ulna':          { type: 'bone_group', ids: ['bone:ulna_L', 'bone:ulna_R'] },
  'carpals':       { type: 'bone_group', ids: ['bone:scaphoid_L', 'bone:scaphoid_R', 'bone:lunate_L', 'bone:lunate_R', 'bone:triquetrum_L', 'bone:triquetrum_R', 'bone:pisiform_L', 'bone:pisiform_R', 'bone:trapezium_L', 'bone:trapezium_R', 'bone:trapezoid_L', 'bone:trapezoid_R', 'bone:capitate_L', 'bone:capitate_R', 'bone:hamate_L', 'bone:hamate_R'] },
  'metacarpals':   { type: 'bone_group', ids: ['bone:metacarpal_1_L', 'bone:metacarpal_1_R', 'bone:metacarpal_2_L', 'bone:metacarpal_2_R', 'bone:metacarpal_3_L', 'bone:metacarpal_3_R', 'bone:metacarpal_4_L', 'bone:metacarpal_4_R', 'bone:metacarpal_5_L', 'bone:metacarpal_5_R'] },
  'phalanges':     { type: 'region', id: 'reg:hand' },
  'pelvis':        { type: 'region', id: 'reg:pelvic_girdle' },
  'femur':         { type: 'bone_group', ids: ['bone:femur_L', 'bone:femur_R'] },
  'patella':       { type: 'bone_group', ids: ['bone:patella_L', 'bone:patella_R'] },
  'tibia':         { type: 'bone_group', ids: ['bone:tibia_L', 'bone:tibia_R'] },
  'fibula':        { type: 'bone_group', ids: ['bone:fibula_L', 'bone:fibula_R'] },
  'tarsals':       { type: 'bone_group', ids: ['bone:talus_L', 'bone:talus_R', 'bone:calcaneus_L', 'bone:calcaneus_R', 'bone:navicular_L', 'bone:navicular_R', 'bone:cuneiform_medial_L', 'bone:cuneiform_medial_R', 'bone:cuneiform_intermediate_L', 'bone:cuneiform_intermediate_R', 'bone:cuneiform_lateral_L', 'bone:cuneiform_lateral_R', 'bone:cuboid_L', 'bone:cuboid_R'] },
  'metatarsals':   { type: 'bone_group', ids: ['bone:metatarsal_1_L', 'bone:metatarsal_1_R', 'bone:metatarsal_2_L', 'bone:metatarsal_2_R', 'bone:metatarsal_3_L', 'bone:metatarsal_3_R', 'bone:metatarsal_4_L', 'bone:metatarsal_4_R', 'bone:metatarsal_5_L', 'bone:metatarsal_5_R'] },
};
