/**
 * Anatomy — Core Interaction Engine
 * Works with the computational anatomy schema (data/skeletal.json)
 */

const App = {
  state: {
    data: null,
    activeSelection: null, // { type: 'region'|'bone'|'bone_group', ref: ..., bones: [...] }
    topicId: null,
    viewHistory: [],
  },

  async loadTopic(topicId) {
    this.state.topicId = topicId;
    const topic = TOPICS[topicId];
    if (!topic) return;

    try {
      const resp = await fetch(topic.dataFile);
      this.state.data = await resp.json();

      this._wireSVG();
      this._wireBoneList();
      this._showWelcome();
    } catch (e) {
      console.error('Failed to load topic data:', e);
    }
  },

  // ─── SVG interaction ───

  _wireSVG() {
    document.querySelectorAll('.bone-area').forEach(el => {
      el.addEventListener('click', () => {
        const areaId = el.dataset.bone;
        if (!areaId) return;
        const map = SVG_BONE_MAP[areaId];
        if (!map) return this._showBoneDetail({ type: 'bone', id: areaId });
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
    document.querySelectorAll('.bone-list-item').forEach(el => {
      el.addEventListener('click', () => {
        const boneId = el.dataset.bone;
        if (boneId) this._showBoneDetail({ type: 'bone', id: boneId });
      });
    });
  },

  // ─── Selection ───

  _showBoneDetail(map) {
    if (!this.state.data) return;

    if (map.type === 'region') {
      const region = this.state.data.regions.find(r => r.id === map.id);
      if (!region) return;
      const bones = this.state.data.bones.filter(b =>
        b.region_ids && b.region_ids.includes(map.id)
      );
      this._renderRegionPanel(region, bones);
      return;
    }

    if (map.type === 'bone') {
      const bone = this.state.data.bones.find(b => b.id === map.id);
      if (!bone) return;
      this._renderBonePanel(bone);
      return;
    }

    if (map.type === 'bone_group') {
      const bones = map.ids
        .map(id => this.state.data.bones.find(b => b.id === id))
        .filter(Boolean);
      if (bones.length === 0) return;
      // If it's a bilateral pair, show both side by side
      const left = bones.find(b => b.side === 'left');
      const right = bones.find(b => b.side === 'right');
      if (left && right) {
        this._renderBilateralPanel(left, right);
      } else {
        this._renderBoneGroupPanel(bones);
      }
      return;
    }
  },

  // ─── Render panels ───

  _renderRegionPanel(region, bones) {
    const panel = document.getElementById('info-panel');
    if (!panel) return;

    const names = region.names || {};
    const en = names.preferred?.en || region.id;
    const la = names.preferred?.la || '';
    const count = bones.length;

    panel.innerHTML = `
      <div class="panel-section">
        <div class="section-label">REGION</div>
        <h2 class="panel-title">${en}</h2>
        ${la ? `<div class="panel-latin">${la}</div>` : ''}
        <div class="panel-meta">${count} bones ${region.division ? '· ' + region.division : ''}</div>
      </div>

      <div class="panel-section">
        <div class="section-label">BONES IN THIS REGION</div>
        <div class="bone-list">
          ${bones.map(b => `
            <div class="bone-list-item" data-bone="${b.id}">
              ${b.names?.preferred?.en || b.id}
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

    // Get articulations this bone participates in
    const arts = (bone.articulation_ids || [])
      .map(id => this.state.data.articulations?.find(a => a.id === id))
      .filter(Boolean);

    // Get ligaments attached to this bone (query from ligament attachments)
    const ligs = (this.state.data.ligaments || []).filter(l =>
      l.attachments && l.attachments.some(a => a.bone_id === bone.id)
    );

    // Get neighbors
    const neighbors = bone.neighbors || [];

    panel.innerHTML = `
      <div class="progress-bar" style="margin-bottom:12px;">
        <div class="fill" style="width:${this._calcProgress()}%"></div>
      </div>

      <div class="panel-section">
        <div class="section-label">BONE</div>
        <h2 class="panel-title">${en}</h2>
        ${la ? `<div class="panel-latin">${la}</div>` : ''}
        <div class="panel-meta">
          ${bone.shape_class ? `· ${bone.shape_class} bone` : ''}
          ${bone.side !== 'median' ? `· ${bone.side}` : '· median'}
          · ${bone.axial_or_appendicular || ''}
        </div>
        <div class="panel-ids">
          ${fma ? `<span class="ext-id">FMA:${fma.code}</span>` : ''}
          ${ta2 ? `<span class="ext-id">TA2:${ta2.code}</span>` : ''}
        </div>
      </div>

      ${arts.length > 0 ? `
      <div class="panel-section">
        <div class="section-label">ARTICULATIONS (${arts.length})</div>
        ${arts.map(a => `
          <div class="panel-rel-item">
            <span class="rel-name">${a.names?.preferred?.en || a.id}</span>
            <span class="rel-type">${a.structural_subtype || a.structural_class} · ${a.functional_class || ''}</span>
          </div>
        `).join('')}
      </div>
      ` : ''}

      ${ligs.length > 0 ? `
      <div class="panel-section">
        <div class="section-label">LIGAMENTS (${ligs.length})</div>
        ${ligs.slice(0, 8).map(l => `
          <div class="panel-rel-item">
            <span class="rel-name">${l.names?.preferred?.en || l.id}</span>
            <span class="rel-type">${l.kind || ''}</span>
          </div>
        `).join('')}
        ${ligs.length > 8 ? `<div class="panel-more">+${ligs.length - 8} more</div>` : ''}
      </div>
      ` : ''}

      ${neighbors.length > 0 ? `
      <div class="panel-section">
        <div class="section-label">NEIGHBORS</div>
        ${neighbors.map(n => {
          const nb = this.state.data.bones.find(b => b.id === n.neighbor_bone_id);
          return `
            <div class="panel-rel-item clickable" data-bone="${n.neighbor_bone_id}">
              <span class="rel-name">${nb?.names?.preferred?.en || n.neighbor_bone_id}</span>
              <span class="rel-dir">${(n.direction_id || '').replace('dir:', '')}</span>
            </div>
          `;
        }).join('')}
      </div>
      ` : ''}

      <div class="panel-section" style="margin-top:16px;">
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
          const region = this.state.data.regions.find(r => r.id === regionId);
          const bones = this.state.data.bones.filter(b =>
            b.region_ids?.includes(regionId)
          );
          if (region) this._renderRegionPanel(region, bones);
        }
      });
    }

    // Highlight SVG area
    this._highlightArea(bone.id);
    this._updateCounter();
  },

  _renderBilateralPanel(left, right) {
    this._renderBonePanel(left); // Show left, but note both sides
    // Add a note about bilateral
    const panel = document.getElementById('info-panel');
    if (panel) {
      const header = panel.querySelector('.panel-section:first-child');
      if (header && !header.querySelector('.bilateral-badge')) {
        const badge = document.createElement('div');
        badge.className = 'bilateral-badge';
        badge.textContent = `🔄 Also: ${right.names?.preferred?.en || right.id} (right)`;
        badge.style.cssText = 'background:var(--accent-glow);border:1px solid var(--accent);border-radius:8px;padding:8px 12px;margin-top:8px;font-size:0.85rem;cursor:pointer;';
        badge.addEventListener('click', () => this._renderBonePanel(right));
        header.appendChild(badge);
      }
    }
  },

  _renderBoneGroupPanel(bones) {
    // For groups with >2 bones (carpals, etc.), show a list
    const panel = document.getElementById('info-panel');
    if (!panel) return;

    const leftBones = bones.filter(b => b.side === 'left');
    const rightBones = bones.filter(b => b.side === 'right');
    const medianBones = bones.filter(b => b.side === 'median');

    panel.innerHTML = `
      <div class="panel-section">
        <div class="section-label">BONE GROUP</div>
        <h2 class="panel-title">${bones.length} bones</h2>
        <div class="panel-meta">Click a specific bone to learn more</div>
      </div>

      ${leftBones.length > 0 ? `
      <div class="panel-section">
        <div class="section-label">LEFT</div>
        ${leftBones.map(b => `
          <div class="bone-list-item" data-bone="${b.id}">${b.names?.preferred?.en || b.id}</div>
        `).join('')}
      </div>
      ` : ''}

      ${rightBones.length > 0 ? `
      <div class="panel-section">
        <div class="section-label">RIGHT</div>
        ${rightBones.map(b => `
          <div class="bone-list-item" data-bone="${b.id}">${b.names?.preferred?.en || b.id}</div>
        `).join('')}
      </div>
      ` : ''}

      ${medianBones.length > 0 ? `
      <div class="panel-section">
        <div class="section-label">UNSIDED</div>
        ${medianBones.map(b => `
          <div class="bone-list-item" data-bone="${b.id}">${b.names?.preferred?.en || b.id}</div>
        `).join('')}
      </div>
      ` : ''}
    `;

    this._wireBoneList();
    this._highlightArea(null);
  },

  _showWelcome() {
    const panel = document.getElementById('info-panel');
    if (!panel) return;

    const totalBones = this.state.data.bones.length;
    const totalArts = (this.state.data.articulations || []).length;

    panel.innerHTML = `
      <div class="panel-empty">
        <div class="hint-icon">🦴</div>
        <h3 style="margin:8px 0 4px;font-size:1.1rem;">Skeletal System</h3>
        <p style="margin-bottom:8px;">${totalBones} bones · ${totalArts} articulations · Reference anatomy data</p>
        <p style="font-size:0.85rem;color:var(--text-dim);">Click any colored area on the skeleton to explore.</p>
        <div id="progress-count" style="margin-top:16px;font-size:0.8rem;color:var(--text-dim);"></div>
      </div>
    `;

    // Show regions list
    const regions = this.state.data.regions.filter(r => r.id !== 'reg:skeletal_system');
    const regionList = document.createElement('div');
    regionList.className = 'region-list';
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
  },

  // ─── Tooltips ───

  _showTooltip(areaId, map, element) {
    let tooltip = document.getElementById('bone-tooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.id = 'bone-tooltip';
      tooltip.style.cssText = `
        position: fixed; background: #1a1d27; border: 1px solid #242838;
        border-radius: 8px; padding: 8px 12px; font-size: 0.8rem;
        color: #e8e6e3; pointer-events: none; z-index: 200;
        box-shadow: 0 4px 16px rgba(0,0,0,0.5); max-width: 260px;
        transition: opacity 0.15s;
      `;
      document.body.appendChild(tooltip);
    }

    if (map.type === 'region') {
      const region = this.state.data?.regions.find(r => r.id === map.id);
      const count = this.state.data?.bones.filter(b => b.region_ids?.includes(map.id)).length || 0;
      tooltip.innerHTML = `<strong>${region?.names?.preferred?.en || areaId}</strong><br><span style="color:#888a96;">${count} bones</span>`;
    } else if (map.type === 'bone') {
      const bone = this.state.data?.bones.find(b => b.id === map.id);
      tooltip.innerHTML = `<strong>${bone?.names?.preferred?.en || areaId}</strong><br><span style="color:#888a96;font-style:italic;">${bone?.names?.preferred?.la || ''}</span>`;
    } else if (map.type === 'bone_group') {
      const first = this.state.data?.bones.find(b => b.id === map.ids[0]);
      tooltip.innerHTML = `<strong>${first?.names?.preferred?.en || areaId}</strong><br><span style="color:#888a96;">${map.ids.length} bones</span>`;
    }

    tooltip.style.opacity = '1';
    const rect = element.getBoundingClientRect();
    let left = rect.left + rect.width / 2 - 130;
    let top = rect.top - 40;
    if (left < 10) left = 10;
    if (top < 10) top = rect.bottom + 10;
    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
  },

  _hideTooltip() {
    const tooltip = document.getElementById('bone-tooltip');
    if (tooltip) tooltip.style.opacity = '0';
  },

  // ─── Highlight ───

  _highlightArea(boneId) {
    // Remove all highlights
    document.querySelectorAll('.bone-area').forEach(el => el.classList.remove('active'));

    if (!boneId) return;

    // Find which SVG area this bone belongs to
    for (const [areaId, map] of Object.entries(SVG_BONE_MAP)) {
      if (map.type === 'bone' && map.id === boneId) {
        document.querySelectorAll(`.bone-area[data-bone="${areaId}"]`).forEach(el => el.classList.add('active'));
        return;
      }
      if (map.type === 'bone_group' && map.ids.includes(boneId)) {
        document.querySelectorAll(`.bone-area[data-bone="${areaId}"]`).forEach(el => el.classList.add('active'));
        return;
      }
    }
  },

  // ─── Progress ───
  _calcProgress() {
    const viewed = this._getViewed();
    const total = this.state.data?.bones.length || 1;
    return (viewed.size / total) * 100;
  },

  _updateCounter() {
    const viewed = this._getViewed();
    const el = document.getElementById('progress-count');
    if (el) el.textContent = `🦴 ${viewed.size} / ${this.state.data?.bones.length || 0} bones explored`;
  },

  _getViewed() {
    return new Set(JSON.parse(sessionStorage.getItem('anatomy_viewed') || '[]'));
  },

  _markViewed(boneId) {
    const viewed = this._getViewed();
    viewed.add(boneId);
    sessionStorage.setItem('anatomy_viewed', JSON.stringify([...viewed]));
  }
};

// Keyboard navigation
document.addEventListener('keydown', (e) => {
  if (['ArrowRight', 'ArrowDown'].includes(e.key)) {
    const items = document.querySelectorAll('.bone-list-item[data-bone]');
    const active = document.querySelector('.bone-list-item.active');
    const idx = active ? Array.from(items).indexOf(active) : -1;
    if (idx < items.length - 1) {
      items[idx + 1].click();
      items[idx + 1].scrollIntoView({ block: 'nearest' });
    }
  } else if (['ArrowLeft', 'ArrowUp'].includes(e.key)) {
    const items = document.querySelectorAll('.bone-list-item[data-bone]');
    const active = document.querySelector('.bone-list-item.active');
    const idx = active ? Array.from(items).indexOf(active) : items.length;
    if (idx > 0) {
      items[idx - 1].click();
      items[idx - 1].scrollIntoView({ block: 'nearest' });
    }
  }
});
