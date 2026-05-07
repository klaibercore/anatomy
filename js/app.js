/**
 * Anatomy — Data Browser Engine
 *
 * Data-first redesign: region tree, search, filters, rich bone cards.
 * No SVG skeleton. Real reference anatomy data.
 */

const App = {
  state: {
    data: null,
    topicId: null,
    favorites: new Set(),
    activeBoneId: null,
    activeFilter: null, // shape_class filter
    searchQuery: '',
    expandedNodes: new Set(['reg:axial', 'reg:appendicular']),
  },

  /* ── Lifecycle ── */

  async loadTopic(topicId) {
    this.state.topicId = topicId;
    const topic = TOPICS[topicId];
    if (!topic) {
      this._showError(`Topic "${topicId}" not found.`);
      return;
    }

    try {
      // dataFile is relative to repo root (e.g. 'data/skeletal.json')
      // but topics/ is one level deep. Determine the repo root URL.
      const pathname = window.location.pathname;
      // pathname examples:
      //   GitHub Pages:  /anatomy/topics/skeletal.html
      //   Root domain:   /topics/skeletal.html
      //   Local file:    /Users/.../topics/skeletal.html (won't match)
      // Strategy: if path contains /topics/, go one level up for repo root
      const idx = pathname.indexOf('/topics/');
      const repoRoot = idx >= 0 ? pathname.substring(0, idx + 1) : '/';
      const dataUrl = `${repoRoot}${topic.dataFile}`;
      const resp = await fetch(dataUrl);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${topic.dataFile}`);
      this.state.data = await resp.json();
      if (!this.state.data.bones || !Array.isArray(this.state.data.bones))
        throw new Error('Data file missing "bones" array');

      this._loadFavorites();
      this._renderAll();
      this._wireSearch();
      this._wireRandom();
      this._wireFilters();
      this._wireKeyboard();
      this._updateStats();
      this._updateProgress();
    } catch (e) {
      console.error('[Anatomy]', e);
      this._showError(e.message);
    }
  },

  /* ── Main Render ── */

  _renderAll() {
    this._renderTree();
    this._renderWelcome();
  },

  /* ── Region Tree ── */

  _renderTree() {
    const container = document.getElementById('region-tree');
    if (!container) return;

    container.innerHTML = REGION_HIERARCHY.map(node => this._buildTreeNode(node, 0)).join('');

    // Wire expand/collapse
    container.querySelectorAll('.tree-toggle').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const regionId = btn.dataset.region;
        if (!regionId) return;
        if (this.state.expandedNodes.has(regionId)) {
          this.state.expandedNodes.delete(regionId);
        } else {
          this.state.expandedNodes.add(regionId);
        }
        this._renderTree();
      });
    });

    // Wire region click (show all bones in region)
    container.querySelectorAll('.tree-item[data-region]').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('.tree-toggle')) return;
        const regionId = el.dataset.region;
        if (!regionId) return;
        const region = this.state.data.regions.find(r => r.id === regionId);
        if (region) this._showRegion(region);
      });
    });

    // Wire bone clicks
    container.querySelectorAll('.tree-bone[data-bone]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const boneId = el.dataset.bone;
        if (boneId) this._showBone(boneId);
      });
    });
  },

  _buildTreeNode(node, depth) {
    const isParent = node.children && node.children.length > 0;
    const isExpanded = this.state.expandedNodes.has(node.id);
    const indent = depth * 20;

    // Count bones for this region (including sub-regions)
    const bones = this._getBonesForRegion(node.id);
    const boneList = isExpanded && isParent ? this._buildBoneList(node) : '';
    const viewed = this._getViewed();
    const viewedCount = bones.filter(b => viewed.has(b.id)).length;
    const progress = bones.length > 0 ? Math.round((viewedCount / bones.length) * 100) : 0;

    let html = `<div class="tree-item" data-region="${node.id}" style="--indent:${indent}px">
      <div class="tree-row">
        ${isParent ? `<span class="tree-toggle ${isExpanded ? 'expanded' : ''}" data-region="${node.id}">
          <svg width="10" height="10" viewBox="0 0 10 10"><path d="M3 1L7 5L3 9" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>
        </span>` : `<span class="tree-toggle-spacer"></span>`}
        <span class="tree-icon">${node.icon || '📁'}</span>
        <span class="tree-label">${this._escapeHtml(node.name || node.id)}</span>
        <span class="tree-count">${bones.length}</span>
        <div class="tree-progress" title="${viewedCount}/${bones.length} explored">
          <div class="tree-progress-fill" style="width:${progress}%"></div>
        </div>
      </div>
      ${boneList}
    </div>`;

    return html;
  },

  _buildBoneList(node) {
    const bones = this._getBonesForRegion(node.id);
    const viewed = this._getViewed();
    const filter = this.state.activeFilter;

    let filtered = bones;
    if (filter) {
      filtered = bones.filter(b => b.shape_class === filter);
    }

    if (filtered.length === 0) return '';

    let html = '<div class="tree-children">';
    // Sub-region children
    if (node.children) {
      html += node.children.map(child => this._buildTreeNode(child, (node.children[0] === child) ? 1 : 1)).join('');
    }
    // Individual bones
    html += filtered.map(b => {
      const isViewed = viewed.has(b.id);
      const isActive = b.id === this.state.activeBoneId;
      const sideSym = SIDE_SYMBOLS[b.side] || '';
      const shapeIcon = SHAPE_CLASS_ICONS[b.shape_class] || '';
      return `<div class="tree-bone ${isActive ? 'active' : ''}" data-bone="${b.id}" style="--indent:${(node.children ? 2 : 1) * 20}px">
        <span class="tree-bone-viewed">${isViewed ? '👁️' : ''}</span>
        <span class="tree-bone-name">${this._escapeHtml(b.names?.preferred?.en || b.id)}</span>
        <span class="tree-bone-meta">
          <span class="shape-badge shape-${b.shape_class}" title="${b.shape_class}">${shapeIcon}</span>
          ${sideSym ? `<span class="side-badge" title="${b.side}">${sideSym}</span>` : ''}
        </span>
      </div>`;
    }).join('');
    html += '</div>';
    return html;
  },

  _getBonesForRegion(regionId) {
    const data = this.state.data;
    if (!data) return [];
    const direct = data.bones.filter(b => b.region_ids && b.region_ids.includes(regionId));

    // Also get bones from sub-regions
    const region = data.regions.find(r => r.id === regionId);
    if (region && region.contains) {
      region.contains.forEach(child => {
        if (child.ref_type === 'region') {
          const childBones = data.bones.filter(b => b.region_ids && b.region_ids.includes(child.ref_id));
          childBones.forEach(b => {
            if (!direct.find(d => d.id === b.id)) direct.push(b);
          });
        }
      });
    }

    return direct;
  },

  /* ── Region Display ── */

  _showRegion(region) {
    const bones = this._getBonesForRegion(region.id);
    this._renderInfoPanel(this._buildRegionCard(region, bones));
    this._updateBreadcrumbs(region.names?.preferred?.en || region.id);
    this.state.activeBoneId = null;
    this._renderTree();
  },

  _buildRegionCard(region, bones) {
    const en = region.names?.preferred?.en || region.id;
    const la = region.names?.preferred?.la || '';
    const ext = region.external_ids || [];
    const fma = ext.find(e => e.ontology === 'FMA');

    const viewed = this._getViewed();
    const viewedCount = bones.filter(b => viewed.has(b.id)).length;
    const progress = bones.length > 0 ? Math.round((viewedCount / bones.length) * 100) : 0;

    // Group by shape_class
    const shapeGroups = {};
    bones.forEach(b => {
      const sc = b.shape_class || 'other';
      if (!shapeGroups[sc]) shapeGroups[sc] = [];
      shapeGroups[sc].push(b);
    });

    return `
      <div class="info-card" data-type="region">
        <div class="card-section card-hero">
          <div class="card-hero-badge">REGION</div>
          <h2 class="card-title">${this._escapeHtml(en)}</h2>
          ${la ? `<div class="card-latin">${this._escapeHtml(la)}</div>` : ''}
          <div class="card-meta-row">
            <span class="card-meta-chip">🦴 ${bones.length} bones</span>
            ${fma ? `<span class="card-meta-chip mono">FMA:${this._escapeHtml(fma.code)}</span>` : ''}
            <span class="card-meta-chip">${this._escapeHtml(region.division || '')}</span>
          </div>
        </div>

        <div class="card-section">
          <div class="card-section-header">
            <span>Exploration Progress</span>
            <span class="progress-num">${viewedCount}/${bones.length}</span>
          </div>
          <div class="card-progress-bar">
            <div class="card-progress-fill" style="width:${progress}%"></div>
          </div>
        </div>

        <div class="card-section">
          <div class="card-section-header">
            <span>Bones by Type</span>
          </div>
          ${Object.entries(shapeGroups).map(([sc, list]) => `
            <div class="card-group-row" onclick="App._filterByShape('${sc}')" style="cursor:pointer;">
              <span>${SHAPE_CLASS_ICONS[sc] || ''} ${sc.charAt(0).toUpperCase() + sc.slice(1)}</span>
              <span class="card-count">${list.length}</span>
            </div>
          `).join('')}
        </div>

        <div class="card-section">
          <div class="card-section-header">
            <span>All Bones</span>
          </div>
          ${bones.map(b => {
            const isViewed = viewed.has(b.id);
            return `<div class="card-bone-row" onclick="App._showBone('${b.id}')">
              ${isViewed ? '<span class="viewed-dot">👁️</span>' : '<span class="viewed-dot-empty"></span>'}
              <span class="card-bone-name">${this._escapeHtml(b.names?.preferred?.en || b.id)}</span>
              <span class="card-bone-meta">${SHAPE_CLASS_ICONS[b.shape_class] || ''} ${SIDE_SYMBOLS[b.side] || ''}</span>
            </div>`;
          }).join('')}
        </div>
      </div>
    `;
  },

  /* ── Bone Detail ── */

  _showBone(boneId) {
    const bone = this.state.data.bones.find(b => b.id === boneId);
    if (!bone) return;

    this._markViewed(bone.id);
    this.state.activeBoneId = bone.id;
    this._renderInfoPanel(this._buildBoneCard(bone));
    this._updateBreadcrumbs(bone.names?.preferred?.en || bone.id);
    this._renderTree();
    this._updateProgress();

    // Scroll tree to this bone
    const el = document.querySelector(`.tree-bone[data-bone="${boneId}"]`);
    if (el) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      // Ensure parent regions are expanded
      const region = this.state.data.regions.find(r => bone.region_ids && bone.region_ids.includes(r.id));
      if (region) {
        // Walk up to expand all ancestors
        this._expandAncestors(region);
        this._renderTree();
        setTimeout(() => {
          const el2 = document.querySelector(`.tree-bone[data-bone="${boneId}"]`);
          if (el2) el2.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }, 50);
      }
    }
  },

  _expandAncestors(region) {
    this.state.expandedNodes.add(region.id);
    if (region.parent_region_id) {
      const parent = this.state.data.regions.find(r => r.id === region.parent_region_id);
      if (parent) {
        this.state.expandedNodes.add(parent.id);
        // Also expand the top-level parents
        REGION_HIERARCHY.forEach(top => {
          if (top.id === parent.id || (top.children && top.children.some(c => c.id === region.id || c.id === parent.id))) {
            this.state.expandedNodes.add(top.id);
          }
        });
      }
    }
    // Also expand the top-level containing region
    REGION_HIERARCHY.forEach(top => {
      if (top.id === region.id || (top.children && top.children.some(c => c.id === region.id))) {
        this.state.expandedNodes.add(top.id);
      }
    });
  },

  _buildBoneCard(bone) {
    const names = bone.names || {};
    const en = names.preferred?.en || bone.id;
    const la = names.preferred?.la || '';
    const ext = bone.external_ids || [];
    const fma = ext.find(e => e.ontology === 'FMA');
    const ta2 = ext.find(e => e.ontology === 'TA2');
    const isFav = this.state.favorites.has(bone.id);

    // Articulations
    const arts = (bone.articulation_ids || [])
      .map(id => this.state.data.articulations?.find(a => a.id === id))
      .filter(Boolean);

    // Ligaments
    const ligs = (this.state.data.ligaments || []).filter(l =>
      l.attachments && l.attachments.some(a => a.bone_id === bone.id)
    );

    // Neighbors
    const neighbors = (bone.neighbors || []).map(n => {
      const nb = this.state.data.bones.find(b => b.id === n.neighbor_bone_id);
      return { ...n, bone: nb };
    }).filter(n => n.bone);

    // Region context
    const region = bone.region_ids
      ? this.state.data.regions.find(r => r.id === bone.region_ids[0])
      : null;

    const viewed = this._getViewed();
    const totalBones = this.state.data.bones.length;
    const progress = Math.round((viewed.size / totalBones) * 100);

    return `
      <div class="info-card" data-type="bone">
        <div class="card-section card-hero">
          <div class="card-hero-badge">BONE</div>
          <h2 class="card-title">${this._escapeHtml(en)}</h2>
          ${la ? `<div class="card-latin">${this._escapeHtml(la)}</div>` : ''}
          <div class="card-meta-row">
            ${bone.shape_class ? `<span class="card-meta-chip">${SHAPE_CLASS_ICONS[bone.shape_class] || ''} ${bone.shape_class.charAt(0).toUpperCase() + bone.shape_class.slice(1)}</span>` : ''}
            <span class="card-meta-chip" title="${bone.side}">${SIDE_SYMBOLS[bone.side] || bone.side} ${bone.side}</span>
            ${bone.axial_or_appendicular ? `<span class="card-meta-chip">${bone.axial_or_appendicular}</span>` : ''}
          </div>
          <div class="card-id-row">
            ${fma ? `<span class="ext-badge">FMA:${this._escapeHtml(fma.code)}</span>` : ''}
            ${ta2 ? `<span class="ext-badge">TA2:${this._escapeHtml(ta2.code)}</span>` : ''}
          </div>
        </div>

        <div class="card-section card-actions">
          <button class="card-btn ${isFav ? 'fav' : ''}" onclick="App._toggleFavorite('${bone.id}')">
            ${isFav ? '⭐' : '☆'} ${isFav ? 'Bookmarked' : 'Bookmark'}
          </button>
          <button class="card-btn" onclick="App._showRandomBone()">🎲 Random Bone</button>
          ${region ? `<button class="card-btn" onclick="App._viewInContext('${region.id}')">🔍 View in context</button>` : ''}
        </div>

        <div class="card-section">
          <div class="card-section-header">
            <span>Exploration Progress</span>
            <span class="progress-num">${viewed.size}/${totalBones} bones</span>
          </div>
          <div class="card-progress-bar">
            <div class="card-progress-fill" style="width:${progress}%"></div>
          </div>
        </div>

        ${region ? `
        <div class="card-section">
          <div class="card-section-header">
            <span>Region</span>
          </div>
          <div class="card-region-link" onclick="App._showRegionByName('${region.id}')">
            ${this._escapeHtml(region.names?.preferred?.en || region.id)}
          </div>
        </div>
        ` : ''}

        ${arts.length > 0 ? `
        <div class="card-section">
          <div class="card-section-header">
            <span>Articulations</span>
            <span class="card-section-count">${arts.length}</span>
          </div>
          ${arts.slice(0, 10).map(a => `
            <div class="card-rel-item">
              <span class="card-rel-name">${this._escapeHtml(a.names?.preferred?.en || a.id)}</span>
              <span class="card-rel-type">${a.structural_subtype || a.structural_class || ''}${a.functional_class ? ' · ' + a.functional_class : ''}</span>
            </div>
          `).join('')}
          ${arts.length > 10 ? `<div class="card-rel-more">+${arts.length - 10} more articulations</div>` : ''}
        </div>
        ` : ''}

        ${ligs.length > 0 ? `
        <div class="card-section">
          <div class="card-section-header">
            <span>Ligaments</span>
            <span class="card-section-count">${ligs.length}</span>
          </div>
          ${ligs.slice(0, 8).map(l => `
            <div class="card-rel-item">
              <span class="card-rel-name">${this._escapeHtml(l.names?.preferred?.en || l.id)}</span>
              <span class="card-rel-type">${l.kind || ''}</span>
            </div>
          `).join('')}
          ${ligs.length > 8 ? `<div class="card-rel-more">+${ligs.length - 8} more ligaments</div>` : ''}
        </div>
        ` : ''}

        ${neighbors.length > 0 ? `
        <div class="card-section">
          <div class="card-section-header">
            <span>Neighboring Bones</span>
            <span class="card-section-count">${neighbors.length}</span>
          </div>
          ${neighbors.map(n => `
            <div class="card-rel-item clickable" onclick="App._showBone('${n.neighbor_bone_id}')">
              <span class="card-rel-name">${this._escapeHtml(n.bone?.names?.preferred?.en || n.neighbor_bone_id)}</span>
              <span class="card-rel-dir">${(n.direction_id || '').replace('dir:', '')}</span>
            </div>
          `).join('')}
        </div>
        ` : ''}
      </div>
    `;
  },

  /* ── Welcome / Empty State ── */

  _renderWelcome() {
    const panel = document.getElementById('info-panel');
    if (!panel || panel.querySelector('.info-card')) return; // already showing something

    const data = this.state.data;
    const viewed = this._getViewed();
    const totalBones = data.bones.length;
    const totalArts = (data.articulations || []).length;
    const totalLigs = (data.ligaments || []).length;
    const progress = Math.round((viewed.size / totalBones) * 100);

    panel.innerHTML = `
      <div class="welcome-card">
        <div class="welcome-icon">🦴</div>
        <h2 class="welcome-title">Skeletal System</h2>
        <p class="welcome-subtitle">${totalBones} bones · ${totalArts} articulations · ${totalLigs} ligaments</p>

        <div class="welcome-stats">
          <div class="welcome-stat">
            <span class="welcome-stat-num">${this._countBy('shape_class', 'long')}</span>
            <span class="welcome-stat-label">Long bones</span>
          </div>
          <div class="welcome-stat">
            <span class="welcome-stat-num">${this._countBy('shape_class', 'short')}</span>
            <span class="welcome-stat-label">Short bones</span>
          </div>
          <div class="welcome-stat">
            <span class="welcome-stat-num">${this._countBy('shape_class', 'flat')}</span>
            <span class="welcome-stat-label">Flat bones</span>
          </div>
          <div class="welcome-stat">
            <span class="welcome-stat-num">${this._countBy('shape_class', 'irregular')}</span>
            <span class="welcome-stat-label">Irregular</span>
          </div>
          <div class="welcome-stat">
            <span class="welcome-stat-num">${this._countBy('shape_class', 'sesamoid')}</span>
            <span class="welcome-stat-label">Sesamoid</span>
          </div>
        </div>

        <div class="welcome-progress">
          <div class="card-section-header">
            <span>Exploration Progress</span>
            <span class="progress-num">${viewed.size}/${totalBones}</span>
          </div>
          <div class="card-progress-bar large">
            <div class="card-progress-fill" style="width:${progress}%"></div>
          </div>
        </div>

        <p class="welcome-hint">← Expand a region in the sidebar to browse bones, or use the search bar above.</p>
      </div>
    `;
  },

  _countBy(field, value) {
    return this.state.data.bones.filter(b => b[field] === value).length;
  },

  /* ── Search ── */

  _wireSearch() {
    const input = document.getElementById('bone-search');
    const clearBtn = document.getElementById('search-clear');
    if (!input) return;

    const doSearch = () => {
      const query = input.value.trim().toLowerCase();
      this.state.searchQuery = query;
      const results = document.getElementById('search-results');
      const container = document.getElementById('region-tree-wrapper');

      input.parentElement.classList.toggle('has-value', query.length > 0);

      if (!query) {
        if (results) { results.innerHTML = ''; results.style.display = 'none'; }
        if (container) container.style.display = '';
        return;
      }

      if (container) container.style.display = 'none';

      const hits = this.state.data.bones.filter(b => {
        const en = (b.names?.preferred?.en || '').toLowerCase();
        const la = (b.names?.preferred?.la || '').toLowerCase();
        const id = b.id.toLowerCase();
        return en.includes(query) || la.includes(query) || id.includes(query);
      });

      if (!results) return;
      results.style.display = '';

      if (hits.length === 0) {
        results.innerHTML = `<div class="search-empty">🔍 No bones found matching "<strong>${this._escapeHtml(query)}</strong>"</div>`;
        return;
      }

      results.innerHTML = hits.slice(0, 30).map(b => {
        const en = b.names?.preferred?.en || b.id;
        const la = b.names?.preferred?.la || '';
        const re = new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
        const highlighted = en.replace(re, '<mark>$1</mark>');
        const shapeIcon = SHAPE_CLASS_ICONS[b.shape_class] || '';
        const sideSym = SIDE_SYMBOLS[b.side] || '';
        return `<div class="search-result" onclick="App._showBone('${b.id}')">
          <div class="search-result-main">
            <span class="search-result-name">${highlighted}</span>
            <span class="search-result-latin">${this._escapeHtml(la)}</span>
          </div>
          <div class="search-result-meta">
            <span class="shape-badge shape-${b.shape_class}">${shapeIcon}</span>
            ${sideSym ? `<span class="side-badge">${sideSym}</span>` : ''}
          </div>
        </div>`;
      }).join('') + (hits.length > 30 ? `<div class="search-more">+${hits.length - 30} more results</div>` : '');
    };

    input.addEventListener('input', doSearch);
    input.addEventListener('search', doSearch);

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        input.value = '';
        input.parentElement.classList.remove('has-value');
        doSearch();
        input.focus();
      });
    }
  },

  /* ── Random Bone ── */

  _wireRandom() {
    const btn = document.getElementById('random-bone-btn');
    if (btn) btn.addEventListener('click', () => this._showRandomBone());
  },

  _showRandomBone() {
    const bones = this.state.data.bones;
    if (!bones || bones.length === 0) return;
    const pick = bones[Math.floor(Math.random() * bones.length)];
    this._showBone(pick.id);
    const btn = document.getElementById('random-bone-btn');
    if (btn) {
      btn.style.transform = 'rotate(20deg)';
      setTimeout(() => btn.style.transform = '', 300);
    }
  },

  /* ── Filters ── */

  _wireFilters() {
    document.querySelectorAll('[data-filter]').forEach(el => {
      el.addEventListener('click', () => {
        const filter = el.dataset.filter;
        this._applyFilter(filter);
      });
    });
  },

  _applyFilter(filter) {
    // Remove active class
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));

    if (this.state.activeFilter === filter) {
      this.state.activeFilter = null;
    } else {
      this.state.activeFilter = filter;
      document.querySelector(`.filter-chip[data-filter="${filter}"]`)?.classList.add('active');
    }

    this._renderTree();
    this._renderWelcome();
  },

  _filterByShape(shape) {
    this.state.activeFilter = shape;
    // Highlight the right chip
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    document.querySelector(`.filter-chip[data-filter="${shape}"]`)?.classList.add('active');
    this._renderTree();
    this._renderWelcome();
  },

  /* ── View in Context ── */

  _viewInContext(regionId) {
    const region = this.state.data.regions.find(r => r.id === regionId);
    if (!region) return;
    this._expandAncestors(region);
    this._renderTree();

    // Show the region
    this._showRegion(region);
  },

  _showRegionByName(regionId) {
    const region = this.state.data.regions.find(r => r.id === regionId);
    if (region) this._showRegion(region);
  },

  /* ── Info Panel ── */

  _renderInfoPanel(html) {
    const panel = document.getElementById('info-panel');
    if (panel) panel.innerHTML = html;
  },

  /* ── Breadcrumbs ── */

  _updateBreadcrumbs(currentName) {
    const bc = document.getElementById('breadcrumbs');
    if (!bc) return;
    if (!currentName) {
      bc.innerHTML = `<a href="../index.html">Hub</a><span class="sep">›</span><span class="current">Skeletal System</span>`;
      return;
    }
    bc.innerHTML = `<a href="../index.html">Hub</a><span class="sep">›</span><a href="../topics/skeletal.html">Skeletal System</a><span class="sep">›</span><span class="current">${this._escapeHtml(currentName)}</span>`;
  },

  /* ── Stats Bar ── */

  _updateStats() {
    const el = document.getElementById('stats-bar');
    if (!el) return;
    const totalBones = this.state.data.bones.length;
    const totalArts = (this.state.data.articulations || []).length;
    const totalLigs = (this.state.data.ligaments || []).length;
    el.textContent = `🦴 ${totalBones} bones · 🫂 ${totalArts} articulations · 🔗 ${totalLigs} ligaments`;
  },

  /* ── Progress ── */

  _updateProgress() {
    const viewed = this._getViewed();
    const total = this.state.data?.bones.length || 0;
    const pct = total > 0 ? Math.round((viewed.size / total) * 100) : 0;

    const num = document.getElementById('progress-num');
    if (num) num.textContent = `${viewed.size} / ${total}`;

    const fill = document.getElementById('progress-fill');
    if (fill) fill.style.width = `${pct}%`;

    // Also update sidebar progress
    this._renderTree();
  },

  /* ── Favorites ── */

  _loadFavorites() {
    try {
      const saved = JSON.parse(localStorage.getItem('anatomy_favorites2') || '[]');
      this.state.favorites = new Set(Array.isArray(saved) ? saved : []);
    } catch { this.state.favorites = new Set(); }
  },

  _saveFavorites() {
    localStorage.setItem('anatomy_favorites2', JSON.stringify([...this.state.favorites]));
  },

  _toggleFavorite(boneId) {
    if (this.state.favorites.has(boneId)) {
      this.state.favorites.delete(boneId);
      this._showToast('Removed from bookmarks');
    } else {
      this.state.favorites.add(boneId);
      this._showToast('⭐ Bookmarked!');
    }
    this._saveFavorites();
    this._showBone(boneId); // re-render
  },

  _showToast(msg) {
    let toast = document.querySelector('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => toast.classList.remove('show'), 2000);
  },

  /* ── Viewed Tracking ── */

  _getViewed() {
    try {
      return new Set(JSON.parse(sessionStorage.getItem('anatomy_viewed') || '[]'));
    } catch { return new Set(); }
  },

  _markViewed(boneId) {
    try {
      const viewed = this._getViewed();
      viewed.add(boneId);
      sessionStorage.setItem('anatomy_viewed', JSON.stringify([...viewed]));
    } catch (e) { console.warn('[Anatomy] sessionStorage error:', e); }
  },

  /* ── Keyboard ── */

  _wireKeyboard() {
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      // R for random
      if (e.key === 'r' || e.key === 'R') {
        this._showRandomBone();
        return;
      }

      // / for search focus
      if (e.key === '/') {
        e.preventDefault();
        const input = document.getElementById('bone-search');
        if (input) input.focus();
        return;
      }

      // Arrow up/down for navigation
      if (['ArrowDown', 'ArrowUp'].includes(e.key)) {
        e.preventDefault();
        const items = document.querySelectorAll('.tree-bone');
        if (items.length === 0) return;
        const active = document.querySelector('.tree-bone.active');
        let idx = active ? Array.from(items).indexOf(active) : -1;
        idx = e.key === 'ArrowDown' ? Math.min(idx + 1, items.length - 1) : Math.max(idx - 1, 0);
        const bid = items[idx]?.dataset.bone;
        if (bid) this._showBone(bid);
      }
    });
  },

  /* ── Utility ── */

  _escapeHtml(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  },

  _showError(msg) {
    const panel = document.getElementById('info-panel');
    if (panel) panel.innerHTML = `<div class="welcome-card"><div class="welcome-icon">⚠️</div><h2>Error</h2><p>${this._escapeHtml(msg)}</p></div>`;
  }
};

// ─── Nav scroll shadow ───
document.addEventListener('scroll', () => {
  const nav = document.querySelector('nav');
  if (nav) nav.classList.toggle('scrolled', window.scrollY > 20);
});
