/**
 * Anatomy — Core Interaction Engine
 * Handles SVG bone clicks, info panel updates, and topic loading.
 */

const App = {
  state: {
    data: null,
    activeBoneId: null,
    topicId: null,
    bones: []
  },

  /** Load topic data and initialize */
  async loadTopic(topicId) {
    this.state.topicId = topicId;
    const topic = TOPICS[topicId];
    if (!topic) return;

    try {
      const resp = await fetch(topic.dataFile);
      this.state.data = await resp.json();
      this.state.bones = this.state.data.bones || [];
      this.initInteraction();
    } catch (e) {
      console.error('Failed to load topic data:', e);
    }
  },

  /** Wire up SVG click areas and bone list */
  initInteraction() {
    // Clickable bone areas in SVG
    document.querySelectorAll('.bone-area').forEach(el => {
      el.addEventListener('click', () => {
        const boneId = el.dataset.bone;
        if (boneId) this.selectBone(boneId);
      });
      el.addEventListener('mouseenter', () => {
        const boneId = el.dataset.bone;
        if (boneId && boneId !== this.state.activeBoneId) {
          this.showTooltip(boneId, el);
        }
      });
      el.addEventListener('mouseleave', () => {
        this.hideTooltip();
      });
    });

    // Bone list items in sidebar
    document.querySelectorAll('.bone-list-item').forEach(el => {
      el.addEventListener('click', () => {
        const boneId = el.dataset.bone;
        if (boneId) this.selectBone(boneId);
      });
    });

    // Auto-select first bone
    if (this.state.bones.length > 0) {
      this.selectBone(this.state.bones[0].id);
    }
  },

  /** Select a bone — update SVG highlight, info panel, and list */
  selectBone(boneId) {
    if (this.state.activeBoneId === boneId) return;
    this.state.activeBoneId = boneId;

    // Update SVG highlight
    document.querySelectorAll('.bone-area').forEach(el => {
      el.classList.toggle('active', el.dataset.bone === boneId);
    });

    // Update bone list highlight
    document.querySelectorAll('.bone-list-item').forEach(el => {
      el.classList.toggle('active', el.dataset.bone === boneId);
    });

    // Update info panel
    const bone = this.state.bones.find(b => b.id === boneId);
    if (bone) this.renderInfoPanel(bone);

    // Progress tracking
    this.updateProgress();
  },

  /** Render the info panel for a selected bone */
  renderInfoPanel(bone) {
    const panel = document.getElementById('info-panel');
    if (!panel) return;

    const idx = this.state.bones.findIndex(b => b.id === bone.id);
    const total = this.state.bones.length;

    panel.innerHTML = `
      <div class="progress-bar">
        <div class="fill" style="width: ${((idx + 1) / total) * 100}%"></div>
      </div>
      <div class="panel-header">
        <span style="font-size:1.5rem">🦴</span>
        <h2>${bone.name}</h2>
      </div>
      <div class="panel-latin">${bone.latin}</div>
      <div class="panel-description">${bone.description}</div>
      <div class="panel-fun-fact">
        <strong>💡 Did you know?</strong><br>
        ${bone.funFact}
      </div>
      <div class="bone-list">
        <div style="font-size:0.8rem;color:var(--text-dim);margin:16px 0 8px;font-weight:600;">ALL BONES</div>
        ${this.state.bones.map(b => `
          <div class="bone-list-item ${b.id === bone.id ? 'active' : ''}" data-bone="${b.id}">
            ${b.name}
          </div>
        `).join('')}
      </div>
    `;

    // Re-wire list item clicks after re-render
    panel.querySelectorAll('.bone-list-item').forEach(el => {
      el.addEventListener('click', () => {
        const bid = el.dataset.bone;
        if (bid) this.selectBone(bid);
      });
    });

    // Scroll to top of panel
    panel.scrollTop = 0;
  },

  /** Show tooltip on hover */
  showTooltip(boneId, element) {
    const bone = this.state.bones.find(b => b.id === boneId);
    if (!bone) return;

    let tooltip = document.getElementById('bone-tooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.id = 'bone-tooltip';
      tooltip.style.cssText = `
        position: fixed;
        background: #1a1d27;
        border: 1px solid #242838;
        border-radius: 8px;
        padding: 8px 12px;
        font-size: 0.8rem;
        color: #e8e6e3;
        pointer-events: none;
        z-index: 200;
        box-shadow: 0 4px 16px rgba(0,0,0,0.5);
        max-width: 220px;
        transition: opacity .15s;
      `;
      document.body.appendChild(tooltip);
    }

    tooltip.innerHTML = `<strong>${bone.name}</strong><br><span style="color:#888a96;font-style:italic;">${bone.latin}</span>`;
    tooltip.style.opacity = '1';

    const rect = element.getBoundingClientRect();
    tooltip.style.left = (rect.left + rect.width / 2 - 110) + 'px';
    tooltip.style.top = (rect.top - 40) + 'px';
  },

  /** Hide tooltip */
  hideTooltip() {
    const tooltip = document.getElementById('bone-tooltip');
    if (tooltip) tooltip.style.opacity = '0';
  },

  /** Update progress display */
  updateProgress() {
    const total = this.state.bones.length;
    const viewed = new Set(
      JSON.parse(sessionStorage.getItem('anatomy_viewed') || '[]')
    );
    if (this.state.activeBoneId) viewed.add(this.state.activeBoneId);
    sessionStorage.setItem('anatomy_viewed', JSON.stringify([...viewed]));

    const el = document.getElementById('progress-count');
    if (el) el.textContent = `${viewed.size} / ${total} bones explored`;
  }
};

/** Keyboard navigation */
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    const bones = App.state.bones;
    const idx = bones.findIndex(b => b.id === App.state.activeBoneId);
    if (idx < bones.length - 1) App.selectBone(bones[idx + 1].id);
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    const bones = App.state.bones;
    const idx = bones.findIndex(b => b.id === App.state.activeBoneId);
    if (idx > 0) App.selectBone(bones[idx - 1].id);
  }
});
