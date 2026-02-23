// ===========================
//  Library of Wisdom - App.js
//  Saves everything to localStorage
// ===========================

const SECTIONS = ['movies', 'books', 'games', 'shows', 'dramas'];
const STORAGE_KEY = 'library_of_wisdom';

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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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

    const statusLabels = {
      completed: '✓ Done',
      inprogress: '▶ In Progress',
      wishlist: '☆ Wishlist',
      dropped: '✗ Dropped'
    };

    const imgHTML = item.image
      ? `<img class="card-img" src="${item.image}" alt="${escapeHtml(item.title)}" />`
      : `<div class="card-img-placeholder"><span>+</span></div>`;

    card.innerHTML = `
      ${imgHTML}
      ${item.status ? `<div class="status-badge">${statusLabels[item.status] || ''}</div>` : ''}
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
  const overlay = document.getElementById('modal-overlay');
  const modalTitle = document.getElementById('modal-title');
  const deleteBtn = document.getElementById('delete-btn');

  editingSection = section;
  currentImageBase64 = null;

  document.getElementById('entry-section').value = section;
  document.getElementById('entry-image').value = '';
  document.getElementById('img-preview-wrap').style.display = 'none';
  document.getElementById('img-preview').src = '';

  if (id) {
    // Edit mode
    editingId = id;
    const item = (data[section] || []).find(i => i.id === id);
    if (!item) return;

    modalTitle.textContent = 'Edit Entry';
    document.getElementById('entry-id').value = id;
    document.getElementById('entry-title').value = item.title || '';
    document.getElementById('entry-label').value = item.label || '';
    document.getElementById('entry-status').value = item.status || 'completed';
    document.getElementById('entry-notes').value = item.notes || '';
    deleteBtn.style.display = 'block';

    if (item.image) {
      currentImageBase64 = item.image;
      document.getElementById('img-preview').src = item.image;
      document.getElementById('img-preview-wrap').style.display = 'block';
    }
  } else {
    // Add mode
    editingId = null;
    modalTitle.textContent = 'Add Entry';
    document.getElementById('entry-id').value = '';
    document.getElementById('entry-title').value = '';
    document.getElementById('entry-label').value = '';
    document.getElementById('entry-status').value = 'completed';
    document.getElementById('entry-notes').value = '';
    deleteBtn.style.display = 'none';
  }

  overlay.classList.add('open');
  document.getElementById('entry-title').focus();
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  editingId = null;
  editingSection = null;
  currentImageBase64 = null;
}

// ── Save Entry ─────────────────────────────────────
document.getElementById('entry-form').addEventListener('submit', function (e) {
  e.preventDefault();

  const section = document.getElementById('entry-section').value;
  const title = document.getElementById('entry-title').value.trim();
  const label = document.getElementById('entry-label').value.trim();

  if (!title) return;

  if (!data[section]) data[section] = [];

  if (editingId) {
    // Update
    const idx = data[section].findIndex(i => i.id === editingId);
    if (idx !== -1) {
      data[section][idx] = {
        ...data[section][idx],
        title,
        label,
        status,
        notes,
        image: currentImageBase64 || data[section][idx].image || null
      };
    }
  } else {
    // Create
    data[section].push({
      id: generateId(),
      title,
      label,
      status,
      notes,
      image: currentImageBase64 || null,
      createdAt: Date.now()
    });
  }

  saveData();
  renderSection(section);
  closeModal();
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

// ── Image Picker ───────────────────────────────────
document.getElementById('entry-image').addEventListener('change', function () {
  const file = this.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    currentImageBase64 = e.target.result;
    document.getElementById('img-preview').src = currentImageBase64;
    document.getElementById('img-preview-wrap').style.display = 'block';
  };
  reader.readAsDataURL(file);
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

// ── Init ───────────────────────────────────────────
renderAll();
