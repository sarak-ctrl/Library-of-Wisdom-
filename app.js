// ===========================
//  Library of Wisdom - App.js
//  Fixed: Image compression + storage error handling
// ===========================

const SECTIONS = ['movies', 'books', 'games', 'shows', 'dramas'];
const STORAGE_KEY = 'library_of_wisdom';

// ── Image Compression Config ───────────────────────
const IMG_MAX_DIMENSION = 400;   // max width or height in px
const IMG_QUALITY       = 0.70;  // JPEG quality (0–1). Lower = smaller file.

// ── State ──────────────────────────────────────────
let data = loadData();
let editingId = null;
let editingSection = null;
let currentImageBase64 = null;

// ── Load / Save ────────────────────────────────────
function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  const empty = {};
  SECTIONS.forEach(s => (empty[s] = []));
  return empty;
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    if (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014) {
      showStorageWarning();
    } else {
      console.error('saveData error:', e);
    }
    return false;
  }
}

function showStorageWarning() {
  // Remove any existing warning first
  const existing = document.getElementById('storage-warning');
  if (existing) existing.remove();

  const banner = document.createElement('div');
  banner.id = 'storage-warning';
  banner.innerHTML = `
    <strong>⚠️ Storage Full</strong>
    Your browser storage is full and the last entry could not be saved.
    Try deleting unused entries, or paste an <em>image URL</em> instead of uploading files.
    <button onclick="this.parentElement.remove()">✕</button>
  `;
  banner.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; z-index: 9999;
    background: #c0392b; color: #fff; padding: 12px 20px;
    font-size: 14px; display: flex; align-items: center; gap: 10px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  `;
  banner.querySelector('button').style.cssText = `
    margin-left: auto; background: none; border: 1px solid #fff;
    color: #fff; cursor: pointer; padding: 2px 8px; border-radius: 4px;
    font-size: 14px;
  `;
  document.body.prepend(banner);
}

// ── Image Compression ──────────────────────────────
/**
 * Compresses a File/Blob into a Base64 JPEG string.
 * Resizes to at most IMG_MAX_DIMENSION px on the longest side.
 * Returns a Promise<string>.
 */
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = function (e) {
      const img = new Image();

      img.onerror = () => reject(new Error('Failed to load image'));
      img.onload = function () {
        let { width: w, height: h } = img;

        // Scale down if needed
        if (w > IMG_MAX_DIMENSION || h > IMG_MAX_DIMENSION) {
          if (w >= h) {
            h = Math.round((h * IMG_MAX_DIMENSION) / w);
            w = IMG_MAX_DIMENSION;
          } else {
            w = Math.round((w * IMG_MAX_DIMENSION) / h);
            h = IMG_MAX_DIMENSION;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width  = w;
        canvas.height = h;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);

        resolve(canvas.toDataURL('image/jpeg', IMG_QUALITY));
      };

      img.src = e.target.result;
    };

    reader.readAsDataURL(file);
  });
}

// ── Render ─────────────────────────────────────────
function renderSection(section) {
  const grid = document.getElementById(`${section}-grid`);
  const items = data[section] || [];
  grid.innerHTML = '';

  if (items.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <p>Nothing here yet</p>
        <small>Click "+ Add Entry" to get started</small>
      </div>`;
    return;
  }

  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.id = item.id;
    card.dataset.section = section;

    const imgHTML = item.image
      ? `<img class="card-img" src="${item.image}" alt="${escapeHtml(item.title)}" />`
      : `<div class="card-img-placeholder"><span>+</span></div>`;

    card.innerHTML = `
      ${imgHTML}
      <div class="card-info">
        <div class="card-title">${escapeHtml(item.title)}</div>
        ${item.label ? `<div class="card-label">${escapeHtml(item.label)}</div>` : ''}
      </div>
    `;

    card.addEventListener('click', () => openModal(section, item.id));
    grid.appendChild(card);
  });
}

function renderAll() {
  SECTIONS.forEach(renderSection);
}

// ── Modal ──────────────────────────────────────────
function openModal(section, id = null) {
  const overlay    = document.getElementById('modal-overlay');
  const modalTitle = document.getElementById('modal-title');
  const deleteBtn  = document.getElementById('delete-btn');

  editingSection    = section;
  currentImageBase64 = null;

  document.getElementById('entry-section').value            = section;
  document.getElementById('entry-image').value              = '';
  document.getElementById('img-preview-wrap').style.display = 'none';
  document.getElementById('img-preview').src                = '';

  if (id) {
    // Edit mode
    editingId = id;
    const item = (data[section] || []).find(i => i.id === id);
    if (!item) return;

    modalTitle.textContent                   = 'Edit Entry';
    document.getElementById('entry-id').value    = id;
    document.getElementById('entry-title').value = item.title || '';
    document.getElementById('entry-label').value = item.label || '';
    deleteBtn.style.display                  = 'block';

    if (item.image) {
      currentImageBase64 = item.image;
      document.getElementById('img-preview').src                = item.image;
      document.getElementById('img-preview-wrap').style.display = 'block';
    }
  } else {
    // Add mode
    editingId                                    = null;
    modalTitle.textContent                       = 'Add Entry';
    document.getElementById('entry-id').value    = '';
    document.getElementById('entry-title').value = '';
    document.getElementById('entry-label').value = '';
    deleteBtn.style.display                      = 'none';
  }

  overlay.classList.add('open');
  document.getElementById('entry-title').focus();
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  editingId          = null;
  editingSection     = null;
  currentImageBase64 = null;
}

// ── Save Entry ─────────────────────────────────────
document.getElementById('entry-form').addEventListener('submit', function (e) {
  e.preventDefault();

  const section = document.getElementById('entry-section').value;
  const title   = document.getElementById('entry-title').value.trim();
  const label   = document.getElementById('entry-label').value.trim();

  if (!title) return;
  if (!data[section]) data[section] = [];

  if (editingId) {
    // Update existing
    const idx = data[section].findIndex(i => i.id === editingId);
    if (idx !== -1) {
      data[section][idx] = {
        ...data[section][idx],
        title,
        label,
        image: currentImageBase64 || data[section][idx].image || null
      };
    }
  } else {
    // Create new
    data[section].push({
      id:        generateId(),
      title,
      label,
      image:     currentImageBase64 || null,
      createdAt: Date.now()
    });
  }

  const saved = saveData();
  if (saved) {
    renderSection(section);
    closeModal();
  } else {
    // Storage failed — roll back the in-memory change so state stays consistent
    if (editingId) {
      // Re-load from storage to restore previous state
      data = loadData();
    } else {
      data[section].pop();
    }
  }
});

// ── Delete Entry ───────────────────────────────────
document.getElementById('delete-btn').addEventListener('click', function () {
  if (!editingId || !editingSection) return;
  if (!confirm('Delete this entry?')) return;

  data[editingSection] = (data[editingSection] || []).filter(i => i.id !== editingId);
  saveData();
  renderSection(editingSection);
  closeModal();
});

// ── Image Picker (with compression) ───────────────
document.getElementById('entry-image').addEventListener('change', async function () {
  const file = this.files[0];
  if (!file) return;

  // Show a loading state on the preview area
  const previewWrap = document.getElementById('img-preview-wrap');
  const preview     = document.getElementById('img-preview');

  previewWrap.style.display = 'block';
  preview.style.opacity     = '0.4';
  preview.src               = '';

  try {
    const compressed = await compressImage(file);
    currentImageBase64    = compressed;
    preview.src           = compressed;
    preview.style.opacity = '1';

    // Show the compressed size as a helpful indicator
    const kb = Math.round((compressed.length * 3) / 4 / 1024);
    console.log(`Compressed image: ~${kb} KB`);
  } catch (err) {
    console.error('Image compression failed:', err);
    previewWrap.style.display = 'none';
    alert('Could not process that image. Please try a different file.');
  }
});

// ── Tabs ───────────────────────────────────────────
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', function () {
    const target = this.dataset.section;

    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));

    this.classList.add('active');
    document.getElementById(target).classList.add('active');
  });
});

// ── Add Buttons ────────────────────────────────────
document.querySelectorAll('.add-btn').forEach(btn => {
  btn.addEventListener('click', function () {
    openModal(this.dataset.section);
  });
});

// ── Close Modal ────────────────────────────────────
document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-overlay').addEventListener('click', function (e) {
  if (e.target === this) closeModal();
});
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') closeModal();
});

// ── Helpers ────────────────────────────────────────
function generateId() {
  return '_' + Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Image URL Tab Switcher ─────────────────────────
document.querySelectorAll('.img-tab').forEach(tab => {
  tab.addEventListener('click', function () {
    document.querySelectorAll('.img-tab').forEach(t => t.classList.remove('active'));
    this.classList.add('active');

    const target = this.dataset.tab;
    document.getElementById('tab-upload').style.display = target === 'upload' ? 'block'  : 'none';
    document.getElementById('tab-paste').style.display  = target === 'paste'  ? 'flex'   : 'none';
  });
});

// ── Load Image from URL ────────────────────────────
document.getElementById('load-url-btn').addEventListener('click', function () {
  const url = document.getElementById('entry-image-url').value.trim();
  if (!url) return;

  currentImageBase64 = url;
  document.getElementById('img-preview').src                = url;
  document.getElementById('img-preview-wrap').style.display = 'block';
});

// ── Init ───────────────────────────────────────────
renderAll();
