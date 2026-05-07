/**
 * Anatomy — Premium Interaction Engine
 * Works with the computational anatomy schema (data/skeletal.json)
 *
 * Features:
 * - Bone search with live filtering
 * - Favorites/bookmarking (localStorage)
 * - Random bone explorer
 * - Viewed bone tracking (sessionStorage)
 * - Smooth panel transitions
 * - Error handling for missing/malformed data
 * - Keyboard navigation
 */

const App = {
  state: {
    data: null,
    activeSelection: null,
    topicId: null,
    viewHistory: [],
    favorites: new Set(),
    bookmarked: false,
  },

  async loadTopic(topicId) {
    this.state.topicId = topicId;
    const topic = TOPICS[topicId];
    if (!topic) {
      console.error(`[Anatomy] Unknown topic: "${topicId}"`);
      this._showError(`Topic "${topicId}" not found. Available topics: ${Object.keys(TOPICS).join(', ')}`);
      return;
    }

    try {
      const resp = await fetch(topic.dataFile);
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}: Failed to load ${topic.dataFile}`);
      }
      this.state.data = await resp.json();

      // Validate data structure
      if (!this.state.data.bones || !Array.isArray(this.state.data.bones)) {
        throw new Error('Data file missing "bones" array');
      }

      this._loadFavorites();
      this._wireSVG();
      this._wireBoneList();
      this._wireSearch();
      this._wireRandomButton();
      this._wireBookmarkToggle();
      this._showWelcome();
      this._updateCounter();
    } catch (e) {
      console.error('[Anatomy] Failed to load topic data:', e);
      this._showError(`Could not load topic data: ${e.message}`);
    }
  },

  // ─── Error Display ───

  _showError(message) {
    const panel = document.getElementById('info-panel');
    if (!panel) return;
    panel.innerHTML = `
      <div class="panel-empty">
        <div class="hint-icon">⚠️</div>
        <h3>Something went wrong</h3>
        <p style="color:var(--text-dim);font-size:0.85rem;margin-top:8px;">${message}</p>
      </div>
    `;
  },

  // ─── Favorites ───

  _loadFavorites() {
    try {
      const saved = JSON.parse(localStorage.getItem('anatomy_favorites') || '[]');
      this.state.favorites = new Set(Array.isArray(saved) ? saved : []);
    } catch {
      this.state.favorites = new Set();
    }
  },

  _saveFavorites() {
    localStorage.setItem('anatomy_favorites', JSON.stringify([...this.state.favorites]));
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
    this._updateBookmarkButton(boneId);
  },

  _updateBookmarkButton(boneId) {
    const btn = document.getElementById('bookmark-btn');
    if (!btn) return;
    const isFav = this.state.favorites.has(boneId);
    btn.classList.toggle('bookmarked', isFav);
    btn.innerHTML = isFav ? '⭐ Bookmarked' : '☆ Bookmark';
  },

  _wireBookmarkToggle() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('#bookmark-btn');
      if (!btn) return;
      const boneId = btn.dataset.boneId;
      if (boneId) this._toggleFavorite(boneId);
    });
  },

  // ─── Toast ───

  _showToast(message) {
    let toast = document.querySelector('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => toast.classList.remove('show'), 2000);
  },

  // ─── SVG Interaction ───

  _wireSVG() {
    document.querySelectorAll('.bone-area').forEach(el => {
      el.addEventListener('click', () => {
        const areaId = el.dataset.bone;
        if (!areaId) return;
        const map = SVG_BONE_MAP[areaId];
        if (!map) return this._showBoneDetail({ type: 'bone', id: areaId });

        // Animate a subtle scale pulse on click
        el.style.transform = 'scale(0.98)';
        setTimeout(() => el.style.transform = '', 150);

        this._showBoneDetail(map);
      });

      el.addEventListener('mouseenter', () => {
        const areaId = el.dataset.bone;
        if (!areaId) return;
        const map = SVG_BONE_MAP[areaId];
        this._showTooltip(areaId, map, el);
      });

      el.addEventListener('mouseleave', () => this._hideTooltip());
    });
  },

  _wireBoneList() {
    document.querySelectorAll('.bone-list-item[data-bone]').forEach(el => {
      el.addEventListener('click', () => {
        const boneId = el.dataset.bone;
        if (boneId) {
          this._showBoneDetail({ type: 'bone', id: boneId });
          // Scroll to panel on mobile
          const panel = document.getElementById('info-panel');
          if (panel && window.innerWidth <= 768) {
            setTimeout(() => panel.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
          }
        }
      });
    });
  },

  // ─── Search ───

  _wireSearch() {
    const searchInput = document.getElementById('bone-search');
    const clearBtn = document.getElementById('search-clear');
    if (!searchInput) return;

    const performSearch = () => {
      const query = searchInput.value.trim().toLowerCase();
      const container = document.getElementById('search-results');
      const list = document.getElementById('bone-list-region');

      // Toggle clear button
      searchInput.parentElement.classList.toggle('has-value', query.length > 0);

      if (!query) {
        // Show region list, hide search results
        if (container) container.innerHTML = '';
        if (list) list.style.display = '';
        return;
      }

      // Search bones
      const results = this.state.data.bones.filter(b => {
        const en = (b.names?.preferred?.en || '').toLowerCase();
        const la = (b.names?.preferred?.la || '').toLowerCase();
        const id = b.id.toLowerCase();
        return en.includes(query) || la.includes(query) || id.includes(query);
      });

      // Hide region list
      if (list) list.style.display = 'none';

      if (!container) return;

      if (results.length === 0) {
        container.innerHTML = '<div class="search-no-results">🔍 No bones found matching "' + query + '"</div>';
        return;
      }

      container.innerHTML = results.map(b => {
        const en = b.names?.preferred?.en || b.id;
        const la = b.names?.preferred?.la || '';
        const side = b.side !== 'median' ? `<span class="bone-side">${b.side}</span>` : '';
        // Highlight matched text
        const highlighted = en.replace(
          new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'),
          (m) => `<strong style="color:var(--accent);">${m}</strong>`
        );
        return `<div class="bone-list-item highlight" data-bone="${b.id}">
          <span>${highlighted}</span>
          <span style="font-size:0.72rem;color:var(--text-muted);font-style:italic;">${la}</span>
          ${side}
        </div>`;
      }).join('');

      // Wire search result clicks
      container.querySelectorAll('.bone-list-item[data-bone]').forEach(el => {
        el.addEventListener('click', () => {
          const boneId = el.dataset.bone;
          if (boneId) this._showBoneDetail({ type: 'bone', id: boneId });
        });
      });
    };

    searchInput.addEventListener('input', performSearch);
    searchInput.addEventListener('search', performSearch);

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchInput.parentElement.classList.remove('has-value');
        performSearch();
        searchInput.focus();
      });
    }
  },

  // ─── Random Bone ───

  _wireRandomButton() {
    const btn = document.getElementById('random-bone-btn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const bones = this.state.data.bones;
      if (!bones || bones.length === 0) return;
      const randomBone = bones[Math.floor(Math.random() * bones.length)];
      this._showBoneDetail({ type: 'bone', id: randomBone.id });
      // Subtle visual feedback
      btn.style.transform = 'rotate(15deg)';
      setTimeout(() => btn.style.transform = '', 300);
    });
  },

  // ─── Bone Detail Selection ───

  _showBoneDetail(map) {
    if (!this.state.data) return;

    // Add to history for smooth back navigation
    this.state.viewHistory.push(map);

    if (map.type === 'region') {
      const region = this.state.data.regions?.find(r => r.id === map.id);
      if (!region) return;
      const bones = this.state.data.bones.filter(b =>
        b.region_ids && b.region_ids.includes(map.id)
      );
      this._renderRegionPanel(region, bones);
      this._updateBreadcrumb(region.names?.preferred?.en || region.id);
      return;
    }

    if (map.type === 'bone') {
      const bone = this.state.data.bones.find(b => b.id === map.id);
      if (!bone) return;
      this._markViewed(bone.id);
      this._renderBonePanel(bone);
      return;
    }

    if (map.type === 'bone_group') {
      const bones = map.ids
        .map(id => this.state.data.bones.find(b => b.id === id))
        .filter(Boolean);
      if (bones.length === 0) return;
      // Check for bilateral pair
      const left = bones.find(b => b.side === 'left');
      const right = bones.find(b => b.side === 'right');
      if (left && right) {
        this._renderBilateralPanel(left, right);
      } else {
        this._renderBoneGroupPanel(bones);
      }
      this._updateBreadcrumb(map.id);
      return;
    }
  },

  // ─── Render Panels ───

  _renderRegionPanel(region, bones) {
    const panel = document.getElementById('info-panel');
    if (!panel) return;

    const names = region.names || {};
    const en = names.preferred?.en || region.id;
    const la = names.preferred?.la || '';
    const count = bones.length;

    panel.innerHTML = `
      <div class="panel-section" style="animation:scaleIn 0.3s ease-out;">
        <div class="section-label">REGION</div>
        <h2 class="panel-title">${this._escapeHtml(en)}</h2>
        ${la ? `<div class="panel-latin">${this._escapeHtml(la)}</div>` : ''}
        <div class="panel-meta">
          <span>${count} bones</span>
          ${region.division ? `<span>${this._escapeHtml(region.division)}</span>` : ''}
        </div>
      </div>

      <div class="panel-section" style="animation:slideUp 0.3s ease-out 0.05s both;">
        <div class="section-label">BONES IN THIS REGION</div>
        <div class="bone-list">
          ${bones.map(b => `
            <div class="bone-list-item" data-bone="${b.id}">
              ${this._escapeHtml(b.names?.preferred?.en || b.id)}
              <span class="bone-side">${b.side !== 'median' ? b.side : ''}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    this._wireBoneList();
    this._highlightArea(null);
    this._updateCounter();
  },

  _renderBonePanel(bone) {
    if (!bone) return;
    const panel = document.getElementById('info-panel');
    if (!panel) return;

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
    const neighbors = bone.neighbors || [];

    panel.innerHTML = `
      <div class="panel-section" style="animation:scaleIn 0.3s ease-out;">
        <div class="section-label">BONE</div>
        <h2 class="panel-title">${this._escapeHtml(en)}</h2>
        ${la ? `<div class="panel-latin">${this._escapeHtml(la)}</div>` : ''}
        <div class="panel-meta">
          ${bone.shape_class ? `<span>${this._escapeHtml(bone.shape_class)}</span>` : ''}
          <span>${bone.side !== 'median' ? this._escapeHtml(bone.side) : 'median'}</span>
          ${bone.axial_or_appendicular ? `<span>${this._escapeHtml(bone.axial_or_appendicular)}</span>` : ''}
        </div>
        <div class="panel-ids">
          ${fma ? `<span class="ext-id">FMA:${this._escapeHtml(String(fma.code))}</span>` : ''}
          ${ta2 ? `<span class="ext-id">TA2:${this._escapeHtml(String(ta2.code))}</span>` : ''}
        </div>
      </div>

      <div class="panel-section" style="animation:slideUp 0.3s ease-out 0.05s both;">
        <div class="section-label">ACTIONS</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <button id="bookmark-btn" class="panel-back-btn" data-bone-id="${bone.id}" style="width:auto;flex:1;">
            ${isFav ? '⭐ Bookmarked' : '☆ Bookmark'}
          </button>
          <button id="random-bone-btn" class="panel-back-btn" style="width:auto;flex:1;font-size:0.85rem;">
            🎲 Random
          </button>
        </div>
      </div>

      <!-- Progress bar -->
      <div class="progress-section" style="animation:slideUp 0.3s ease-out 0.1s both;margin-bottom:12px;">
        <div class="progress-header">
          <span class="progress-label">Exploration</span>
          <span class="progress-text" id="progress-count">${this._getViewed().size} / ${this.state.data.bones.length} explored</span>
        </div>
        <div class="progress-bar">
          <div class="fill" style="width:${this._calcProgress()}%"></div>
        </div>
      </div>

      ${arts.length > 0 ? `
      <div class="panel-section" style="animation:slideUp 0.3s ease-out 0.15s both;">
        <div class="section-label">ARTICULATIONS (${arts.length})</div>
        ${arts.slice(0, 12).map(a => `
          <div class="panel-rel-item">
            <span class="rel-name">${this._escapeHtml(a.names?.preferred?.en || a.id)}</span>
            <span class="rel-type">${this._escapeHtml(a.structural_subtype || a.structural_class || '')} · ${this._escapeHtml(a.functional_class || '')}</span>
          </div>
        `).join('')}
        ${arts.length > 12 ? `<div class="panel-more">+${arts.length - 12} more</div>` : ''}
      </div>
      ` : ''}

      ${ligs.length > 0 ? `
      <div class="panel-section" style="animation:slideUp 0.3s ease-out 0.2s both;">
        <div class="section-label">LIGAMENTS (${ligs.length})</div>
        ${ligs.slice(0, 8).map(l => `
          <div class="panel-rel-item">
            <span class="rel-name">${this._escapeHtml(l.names?.preferred?.en || l.id)}</span>
            <span class="rel-type">${this._escapeHtml(l.kind || '')}</span>
          </div>
        `).join('')}
        ${ligs.length > 8 ? `<div class="panel-more">+${ligs.length - 8} more</div>` : ''}
      </div>
      ` : ''}

      ${neighbors.length > 0 ? `
      <div class="panel-section" style="animation:slideUp 0.3s ease-out 0.25s both;">
        <div class="section-label">NEIGHBORS</div>
        ${neighbors.map(n => {
          const nb = this.state.data.bones.find(b => b.id === n.neighbor_bone_id);
          return `
            <div class="panel-rel-item clickable" data-bone="${n.neighbor_bone_id}">
              <span class="rel-name">${this._escapeHtml(nb?.names?.preferred?.en || n.neighbor_bone_id)}</span>
              <span class="rel-dir">${this._escapeHtml((n.direction_id || '').replace('dir:', ''))}</span>
            </div>
          `;
        }).join('')}
      </div>
      ` : ''}

      <div class="panel-section" style="animation:slideUp 0.3s ease-out 0.3s both;">
        <button class="panel-back-btn" id="back-to-regions">← All bones</button>
      </div>
    `;

    // Wire neighbor clicks
    panel.querySelectorAll('.panel-rel-item.clickable').forEach(el => {
      el.addEventListener('click', () => {
        const bid = el.dataset.bone;
        if (bid) this._showBoneDetail({ type: 'bone', id: bid });
      });
    });

    // Wire back button
    const backBtn = document.getElementById('back-to-regions');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        const regionId = bone.region_ids?.[0];
        if (regionId) {
          const region = this.state.data.regions?.find(r => r.id === regionId);
          const bones = this.state.data.bones.filter(b =>
            b.region_ids?.includes(regionId)
          );
          if (region) this._renderRegionPanel(region, bones);
        }
        this._updateBreadcrumb();
      });
    }

    // Wire random button inside panel
    this._wireRandomButton();

    // Highlight SVG area
    this._highlightArea(bone.id);
    this._updateCounter();

    // Update breadcrumb
    this._updateBreadcrumb(en);
  },

  _renderBilateralPanel(left, right) {
    this._renderBonePanel(left);
    const panel = document.getElementById('info-panel');
    if (panel) {
      const firstSection = panel.querySelector('.panel-section:first-child');
      if (firstSection && !firstSection.querySelector('.bilateral-badge')) {
        const badge = document.createElement('div');
        badge.className = 'bilateral-badge';
        badge.innerHTML = `🔄 Also: ${this._escapeHtml(right.names?.preferred?.en || right.id)} <span style="font-size:0.72rem;opacity:0.7;">(right side)</span>`;
        badge.addEventListener('click', () => this._renderBonePanel(right));
        firstSection.appendChild(badge);
      }
    }
  },

  _renderBoneGroupPanel(bones) {
    const panel = document.getElementById('info-panel');
    if (!panel) return;

    const leftBones = bones.filter(b => b.side === 'left');
    const rightBones = bones.filter(b => b.side === 'right');
    const medianBones = bones.filter(b => b.side === 'median');

    panel.innerHTML = `
      <div class="panel-section" style="animation:scaleIn 0.3s ease-out;">
        <div class="section-label">BONE GROUP</div>
        <h2 class="panel-title">${bones.length} bones</h2>
        <div class="panel-meta"><span>Click a specific bone to learn more</span></div>
      </div>

      ${leftBones.length > 0 ? `
      <div class="panel-section" style="animation:slideUp 0.3s ease-out 0.05s both;">
        <div class="section-label">LEFT (${leftBones.length})</div>
        ${leftBones.map(b => `
          <div class="bone-list-item" data-bone="${b.id}">
            ${this._escapeHtml(b.names?.preferred?.en || b.id)}
          </div>
        `).join('')}
      </div>
      ` : ''}

      ${rightBones.length > 0 ? `
      <div class="panel-section" style="animation:slideUp 0.3s ease-out 0.1s both;">
        <div class="section-label">RIGHT (${rightBones.length})</div>
        ${rightBones.map(b => `
          <div class="bone-list-item" data-bone="${b.id}">
            ${this._escapeHtml(b.names?.preferred?.en || b.id)}
          </div>
        `).join('')}
      </div>
      ` : ''}

      ${medianBones.length > 0 ? `
      <div class="panel-section" style="animation:slideUp 0.3s ease-out 0.15s both;">
        <div class="section-label">UNSIDED (${medianBones.length})</div>
        ${medianBones.map(b => `
          <div class="bone-list-item" data-bone="${b.id}">
            ${this._escapeHtml(b.names?.preferred?.en || b.id)}
          </div>
        `).join('')}
      </div>
      ` : ''}
    `;

    this._wireBoneList();
    this._highlightArea(null);
    this._updateBreadcrumb();
  },

  _showWelcome() {
    const panel = document.getElementById('info-panel');
    if (!panel) return;

    const totalBones = this.state.data.bones.length;
    const totalArts = (this.state.data.articulations || []).length;
    const viewed = this._getViewed();

    panel.innerHTML = `
      <div class="panel-empty" style="animation:scaleIn 0.4s ease-out;">
        <div class="hint-icon">🦴</div>
        <h3>Skeletal System</h3>
        <p style="margin-bottom:8px;">${totalBones} bones · ${totalArts} articulations</p>
        <p style="font-size:0.85rem;color:var(--text-dim);">Click any colored area on the skeleton or search for a bone below.</p>
        <div class="progress-section" style="margin-top:16px;">
          <div class="progress-header">
            <span class="progress-label">Explored</span>
            <span class="progress-text" id="progress-count">${viewed.size} / ${totalBones} bones</span>
          </div>
          <div class="progress-bar">
            <div class="fill" style="width:${this._calcProgress()}%"></div>
          </div>
        </div>
      </div>
    `;

    // Show regions list
    const regions = (this.state.data.regions || []).filter(r => r.id !== 'reg:skeletal_system');
    if (regions.length > 0) {
      const regionList = document.createElement('div');
      regionList.className = 'region-list';
      regionList.id = 'bone-list-region';
      regionList.style.cssText = 'margin-top:16px;';
      regions.forEach(r => {
        const count = this.state.data.bones.filter(b => b.region_ids?.includes(r.id)).length;
        const item = document.createElement('div');
        item.className = 'bone-list-item';
        item.dataset.region = r.id;
        item.textContent = `${r.names?.preferred?.en || r.id} (${count})`;
        item.addEventListener('click', () => {
          const bones = this.state.data.bones.filter(b => b.region_ids?.includes(r.id));
          this._renderRegionPanel(r, bones);
        });
        regionList.appendChild(item);
      });
      panel.querySelector('.panel-empty').appendChild(regionList);
    }
  },

  // ─── Breadcrumb ───

  _updateBreadcrumb(currentName) {
    const breadcrumb = document.getElementById('breadcrumbs');
    if (!breadcrumb) return;

    if (!currentName) {
      breadcrumb.innerHTML = `
        <a href="../index.html">Hub</a>
        <span class="separator">›</span>
        <span class="current">Skeletal System</span>
      `;
      return;
    }

    breadcrumb.innerHTML = `
      <a href="../index.html">Hub</a>
      <span class="separator">›</span>
      <a href="../topics/skeletal.html">Skeletal System</a>
      <span class="separator">›</span>
      <span class="current">${this._escapeHtml(currentName)}</span>
    `;
  },

  // ─── Tooltips ───

  _showTooltip(areaId, map, element) {
    let tooltip = document.getElementById('bone-tooltip');
    if (!tooltip) { return; } // tooltip HTML exists in the page

    if (map.type === 'region') {
      const region = this.state.data?.regions?.find(r => r.id === map.id);
      const count = this.state.data?.bones.filter(b => b.region_ids?.includes(map.id)).length || 0;
      tooltip.innerHTML = `<strong>${this._escapeHtml(region?.names?.preferred?.en || areaId)}</strong><br><span style="color:var(--text-dim);font-size:0.75rem;">${count} bones</span>`;
    } else if (map.type === 'bone') {
      const bone = this.state.data?.bones?.find(b => b.id === map.id);
      tooltip.innerHTML = `<strong>${this._escapeHtml(bone?.names?.preferred?.en || areaId)}</strong><br><span style="color:var(--text-dim);font-size:0.75rem;font-style:italic;">${this._escapeHtml(bone?.names?.preferred?.la || '')}</span>`;
    } else if (map.type === 'bone_group') {
      const first = this.state.data?.bones?.find(b => b.id === map.ids[0]);
      tooltip.innerHTML = `<strong>${this._escapeHtml(first?.names?.preferred?.en || areaId)}</strong><br><span style="color:var(--text-dim);font-size:0.75rem;">${map.ids.length} bones</span>`;
    }

    tooltip.style.opacity = '1';

    const rect = element.getBoundingClientRect();
    const tooltipWidth = 260;
    const gap = 12;

    // Try above first
    let left = rect.left + rect.width / 2 - tooltipWidth / 2;
    let top = rect.top - tooltip.offsetHeight - gap;

    // Clamp left
    left = Math.max(10, Math.min(left, window.innerWidth - tooltipWidth - 10));

    // If above goes off-screen, show below
    if (top < 10) {
      top = rect.bottom + gap;
    }

    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
  },

  _hideTooltip() {
    const tooltip = document.getElementById('bone-tooltip');
    if (tooltip) tooltip.style.opacity = '0';
  },

  // ─── Highlight ───

  _highlightArea(boneId) {
    document.querySelectorAll('.bone-area').forEach(el => el.classList.remove('active'));

    if (!boneId) return;

    // Find which SVG area this bone belongs to
    for (const [areaId, map] of Object.entries(SVG_BONE_MAP)) {
      if (map.type === 'bone' && map.id === boneId) {
        document.querySelectorAll(`.bone-area[data-bone="${areaId}"]`).forEach(el => el.classList.add('active'));
        // Scroll SVG to make the area visible
        const activeEl = document.querySelector(`.bone-area[data-bone="${areaId}"]`);
        if (activeEl && window.innerWidth <= 768) {
          const svg = activeEl.closest('svg');
          if (svg) {
            const bbox = activeEl.getBBox();
            const svgRect = svg.getBoundingClientRect();
            // Only scroll if the element is below the fold
            const viewportCenter = window.innerHeight / 2;
            if (svgRect.bottom > viewportCenter || svgRect.top < 0) {
              svg.querySelector('g')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }
        }
        return;
      }
      if (map.type === 'bone_group' && map.ids.includes(boneId)) {
        document.querySelectorAll(`.bone-area[data-bone="${areaId}"]`).forEach(el => el.classList.add('active'));
        return;
      }
    }
  },

  // ─── Progress Tracking ───

  _calcProgress() {
    const viewed = this._getViewed();
    const total = this.state.data?.bones.length || 1;
    return Math.min(100, (viewed.size / total) * 100);
  },

  _updateCounter() {
    const viewed = this._getViewed();
    const total = this.state.data?.bones.length || 0;
    const el = document.getElementById('progress-count');
    if (el) {
      el.textContent = `${viewed.size} / ${total} explored`;
    }

    // Also update the standalone progress bar fill if it exists
    const fill = document.querySelector('.progress-bar .fill');
    if (fill && total > 0) {
      fill.style.width = `${Math.min(100, (viewed.size / total) * 100)}%`;
    }
  },

  _getViewed() {
    try {
      return new Set(JSON.parse(sessionStorage.getItem('anatomy_viewed') || '[]'));
    } catch {
      return new Set();
    }
  },

  _markViewed(boneId) {
    try {
      const viewed = this._getViewed();
      viewed.add(boneId);
      sessionStorage.setItem('anatomy_viewed', JSON.stringify([...viewed]));
      this._updateCounter();
    } catch (e) {
      // sessionStorage may be full or unavailable
      console.warn('[Anatomy] Could not save viewed state:', e);
    }
  },

  // ─── Utility ───

  _escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};

// ─── Keyboard Navigation ───
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  if (['ArrowRight', 'ArrowDown'].includes(e.key)) {
    e.preventDefault();
    const items = document.querySelectorAll('.bone-list-item[data-bone]');
    const active = document.querySelector('.bone-list-item.active');
    const idx = active ? Array.from(items).indexOf(active) : -1;
    if (idx < items.length - 1) {
      items[idx + 1].click();
      items[idx + 1].scrollIntoView({ block: 'nearest' });
    }
  } else if (['ArrowLeft', 'ArrowUp'].includes(e.key)) {
    e.preventDefault();
    const items = document.querySelectorAll('.bone-list-item[data-bone]');
    const active = document.querySelector('.bone-list-item.active');
    const idx = active ? Array.from(items).indexOf(active) : items.length;
    if (idx > 0) {
      items[idx - 1].click();
      items[idx - 1].scrollIntoView({ block: 'nearest' });
    }
  }

  // Random bone on 'R' key
  if (e.key === 'r' || e.key === 'R') {
    const btn = document.getElementById('random-bone-btn');
    if (btn) btn.click();
  }
});

// ─── Nav scroll effect ───
document.addEventListener('scroll', () => {
  const nav = document.querySelector('nav');
  if (nav) {
    nav.classList.toggle('scrolled', window.scrollY > 20);
  }
});
