/**
 * Anatomy — SVG Icon Library
 * Professional icon set replacing all emoji.
 * Feather-style: 24×24, stroke-width 1.5, round caps/joins.
 */

const ICONS = {
  // Top-level skeleton regions
  axial:    '<svg viewBox="0 0 24 24"><path d="M12 3v2M12 7v2M12 11v2M12 15v2M12 19v2"/><path d="M8 5h8M6 9h12M4 13h16M6 17h12M8 21h8"/><path d="M4 3l3 2M4 3l3-2M20 3l-3 2M20 3l-3 2M4 21l3-2M4 21l3 2M20 21l-3-2M20 21l-3 2"/></svg>',
  appendicular: '<svg viewBox="0 0 24 24"><path d="M7 4l5-2 5 2v4l-3 2v3l-4 3M7 4l-2 3 3 2M7 4v6l4 3M17 4l2 3-3 2M17 4v8l-3 1"/></svg>',

  // Sub-regions
  skull:    '<svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 0 0-9 9c0 3.5 2 6.5 5 8v1h8v-1c3-1.5 5-4.5 5-8a9 9 0 0 0-9-9z"/><circle cx="9" cy="11" r="2"/><circle cx="15" cy="11" r="2"/><path d="M10 18h4M11 14h2"/><path d="M8 14c0 1 .5 2 1 2"/><path d="M16 14c0 1-.5 2-1 2"/></svg>',
  face:     '<svg viewBox="0 0 24 24"><ellipse cx="12" cy="13" rx="7" ry="8"/><circle cx="9" cy="11" r="1.5"/><circle cx="15" cy="11" r="1.5"/><path d="M10 15a2 2 0 0 0 4 0"/><path d="M12 5V3"/></svg>',
  hyoid:    '<svg viewBox="0 0 24 24"><path d="M7 12h3a2 2 0 0 1 4 0h3"/><path d="M7 12l-2 2M17 12l2 2"/><path d="M10 12V8a2 2 0 0 1 4 0v4"/></svg>',
  spine:    '<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="3" rx="1"/><rect x="8" y="7" width="8" height="3" rx="1"/><rect x="7" y="11" width="10" height="3" rx="1"/><rect x="8" y="15" width="8" height="3" rx="1"/><rect x="9" y="19" width="6" height="2" rx="1"/></svg>',
  ribs:     '<svg viewBox="0 0 24 24"><path d="M12 3v18"/><path d="M5 6c0 2 3 4 7 4s7-2 7-4"/><path d="M4 10c0 2 4 4 8 4s8-2 8-4"/><path d="M5 14c0 2 3 4 7 4s7-2 7-4"/></svg>',

  // Limbs & girdles
  pectoral: '<svg viewBox="0 0 24 24"><path d="M12 4l4 3v3l-2 1M12 4l-4 3v3l2 1M8 7l-3 2 1 3M16 7l3 2-1 3"/><path d="M9 14L7 17M15 14l2 3M12 14v4"/></svg>',
  upper:    '<svg viewBox="0 0 24 24"><path d="M7 3v7a5 5 0 0 0 10 0V3"/><path d="M3 12l3 2 6-1 6 1 3-2"/><path d="M12 12v9"/><path d="M9 17l2 2M15 17l-2 2"/></svg>',
  pelvic:   '<svg viewBox="0 0 24 24"><path d="M4 8c0 6 3 12 8 12s8-6 8-12"/><path d="M4 8l2-3a3 3 0 0 1 12 0l2 3"/><path d="M12 8v2"/></svg>',
  lower:    '<svg viewBox="0 0 24 24"><path d="M12 4v16"/><path d="M10 20l2 2 2-2"/><path d="M8 8l4-1 4 1"/><path d="M10 10l2 1 2-1"/></svg>',

  // Shape class
  long:     '<svg viewBox="0 0 24 24"><rect x="11" y="3" width="2" height="18" rx="1"/></svg>',
  short:    '<svg viewBox="0 0 24 24"><rect x="7" y="7" width="10" height="10" rx="3"/></svg>',
  flat:     '<svg viewBox="0 0 24 24"><rect x="4" y="10" width="16" height="4" rx="1"/></svg>',
  irregular:'<svg viewBox="0 0 24 24"><path d="M5 8l3-3 4 1 3-2 4 3v6l-2 3-3 1-3-1-3 2-3-2z"/></svg>',
  sesamoid: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="2"/></svg>',

  // UI icons
  bone:     '<svg viewBox="0 0 24 24"><path d="M17 7a3 3 0 0 1 3-3M7 7a3 3 0 0 0-3-3M7 17a3 3 0 0 0-3 3M17 17a3 3 0 0 1 3 3"/><path d="M7 4h10a3 3 0 0 1 0 6H7a3 3 0 0 1 0-6z"/><path d="M7 14h10a3 3 0 0 1 0 6H7a3 3 0 0 1 0-6z"/></svg>',
  search:   '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M16 16l5 5"/></svg>',
  close:    '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6l-12 12"/></svg>',
  bookmark: '<svg viewBox="0 0 24 24"><path d="M6 4h12v17l-6-4.5L6 21V4z"/></svg>',
  bookmarkFilled: '<svg viewBox="0 0 24 24"><path d="M6 4h12v17l-6-4.5L6 21V4z" fill="currentColor"/></svg>',
  random:   '<svg viewBox="0 0 24 24"><path d="M17 7l3 3-3 3"/><path d="M6 10H4a2 2 0 0 1 0-4h10"/><path d="M7 17l-3-3 3-3"/><path d="M18 14h2a2 2 0 0 1 0 4H10"/></svg>',
  clear:    '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6l-12 12"/></svg>',
  viewed:   '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="2"/><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/></svg>',
  viewedEmpty: '<svg viewBox="0 0 24 24"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" fill="none"/><circle cx="12" cy="12" r="2" fill="none"/></svg>',
  lock:     '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
  kbd:      '<svg viewBox="0 0 24 24"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10v4M10 10v4M14 10v4M18 10v4"/></svg>',
  external: '<svg viewBox="0 0 24 24"><path d="M18 10V5h-5"/><path d="M13 11l6-6"/><path d="M13 5H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg>',

  // Stats / data
  articulation: '<svg viewBox="0 0 24 24"><circle cx="7" cy="12" r="2"/><circle cx="17" cy="12" r="2"/><path d="M9 12h6"/></svg>',
  ligament: '<svg viewBox="0 0 24 24"><path d="M6 6l4 12M18 6l-4 12"/><path d="M8 10h8M7 14h10"/></svg>',
  region:   '<svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg>',
  system:   '<svg viewBox="0 0 24 24"><circle cx="12" cy="6" r="2"/><path d="M7 19l5-11 5 11"/><path d="M9 16h6"/></svg>',

  // Chevron
  chevron:  '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
  chevronDown: '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>',
  arrowUp:  '<svg viewBox="0 0 24 24"><path d="M5 11l7-7 7 7M12 19V5"/></svg>',
  arrowDown:'<svg viewBox="0 0 24 24"><path d="M5 13l7 7 7-7M12 5v14"/></svg>',
};

/** Render an SVG icon as inline HTML */
function icon(name, cls = '') {
  const svg = ICONS[name];
  if (!svg) {
    console.warn(`[Icons] Unknown icon: ${name}`);
    return `<span class="icon-svg ${cls}"></span>`;
  }
  return `<span class="icon-svg ${cls}">${svg}</span>`;
}
