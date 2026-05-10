/* app.js — shared utilities for insights-service admin UI */

// ─── API helpers ──────────────────────────────────────────────────────────────

async function apiFetch(path, options = {}) {
  const opts = {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  }
  if (options.body !== undefined && typeof options.body !== 'string') {
    opts.body = JSON.stringify(options.body)
  }

  const res = await fetch(path, opts)
  if (res.status === 204) return null

  const data = await res.json()
  if (!res.ok) {
    const msg = data?.error?.message ?? `HTTP ${res.status}`
    throw new Error(msg)
  }
  return data
}

function api(path) {
  return {
    get:    ()     => apiFetch(path, { method: 'GET' }),
    post:   (body) => apiFetch(path, { method: 'POST',   body }),
    put:    (body) => apiFetch(path, { method: 'PUT',    body }),
    del:    ()     => apiFetch(path, { method: 'DELETE' }),
  }
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function _getToastContainer() {
  let c = document.getElementById('toast-container')
  if (!c) {
    c = document.createElement('div')
    c.id = 'toast-container'
    c.className = 'toast-container'
    document.body.appendChild(c)
  }
  return c
}

function showToast(message, type = 'success') {
  const container = _getToastContainer()
  const toast = document.createElement('div')
  toast.className = `toast ${type}`

  const icons = { success: '✓', error: '✕', info: 'i' }
  toast.innerHTML = `<span class="toast-icon">${icons[type] ?? icons.info}</span><span>${message}</span>`

  container.appendChild(toast)

  setTimeout(() => {
    toast.classList.add('leaving')
    toast.addEventListener('animationend', () => toast.remove(), { once: true })
  }, 3000)
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function formatDate(isoString) {
  if (!isoString) return '—'
  return new Date(isoString).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

function formatDateTime(isoString) {
  if (!isoString) return '—'
  return new Date(isoString).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ─── Confirm modal ────────────────────────────────────────────────────────────

function _ensureConfirmModal() {
  if (document.getElementById('confirm-modal')) return
  const el = document.createElement('div')
  el.id = 'confirm-modal'
  el.className = 'modal-overlay hidden'
  el.innerHTML = `
    <div class="modal" style="max-width:400px">
      <div class="modal-header">
        <h2 id="confirm-modal-title">Confirm</h2>
      </div>
      <div class="modal-body">
        <p id="confirm-modal-message" style="margin:0 0 20px;color:var(--ink-2);font-size:14px"></p>
        <div class="form-actions">
          <button class="btn btn-secondary" id="confirm-modal-cancel">Cancel</button>
          <button class="btn btn-danger" id="confirm-modal-ok">Delete</button>
        </div>
      </div>
    </div>
  `
  document.body.appendChild(el)
}

function confirmAction(message, okLabel = 'Delete') {
  _ensureConfirmModal()
  return new Promise(resolve => {
    const overlay = document.getElementById('confirm-modal')
    document.getElementById('confirm-modal-message').textContent = message
    document.getElementById('confirm-modal-ok').textContent = okLabel

    overlay.classList.remove('hidden')

    function finish(result) {
      overlay.classList.add('hidden')
      okBtn.removeEventListener('click', onOk)
      cancelBtn.removeEventListener('click', onCancel)
      resolve(result)
    }

    const okBtn     = document.getElementById('confirm-modal-ok')
    const cancelBtn = document.getElementById('confirm-modal-cancel')
    function onOk()     { finish(true) }
    function onCancel() { finish(false) }
    okBtn.addEventListener('click', onOk, { once: true })
    cancelBtn.addEventListener('click', onCancel, { once: true })
  })
}

// ─── Modal helpers ────────────────────────────────────────────────────────────

function openModal(id) {
  const el = document.getElementById(id)
  if (!el) return
  el.classList.remove('hidden')
  // Focus first input inside modal
  requestAnimationFrame(() => {
    const first = el.querySelector('input, select, textarea')
    if (first) first.focus()
  })
}

function closeModal(id) {
  const el = document.getElementById(id)
  if (!el) return
  el.classList.add('hidden')
}

// Close modal when clicking backdrop
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.add('hidden')
  }
})

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return
  document.querySelectorAll('.modal-overlay:not(.hidden)').forEach(el => {
    el.classList.add('hidden')
  })
})

// ─── Nav active state ─────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname
  document.querySelectorAll('.nav-links a').forEach(a => {
    const href = a.getAttribute('href')
    if (!href) return
    // exact match, or sub-path match (but '/' only matches exactly)
    const active = href === '/'
      ? (path === '/' || path === '/index.html')
      : path.startsWith(href.replace('.html', '')) || path === href
    if (active) a.classList.add('active')
    else a.classList.remove('active')
  })
})

// ─── Shared nav renderer ──────────────────────────────────────────────────────

function renderNav(activePage) {
  const nav = document.querySelector('.nav-links')
  if (!nav) return
  const links = [
    { href: '/',             label: 'Warehouses', icon: '▦' },
    { href: '/features.html', label: 'Features',   icon: '⚑' },
  ]
  nav.innerHTML = links.map(l => `
    <li>
      <a href="${l.href}" class="${activePage === l.label ? 'active' : ''}">
        <span style="font-size:12px;opacity:.7">${l.icon}</span>
        ${l.label}
      </a>
    </li>
  `).join('')
}

// ─── Badge helpers ────────────────────────────────────────────────────────────

function enabledBadge(enabled) {
  return enabled
    ? `<span class="badge badge-enabled">Enabled</span>`
    : `<span class="badge badge-disabled">Disabled</span>`
}

function typeBadge(type) {
  return `<span class="type-badge">${type}</span>`
}

// ─── Loading / empty state helpers ───────────────────────────────────────────

function renderLoading(container) {
  container.innerHTML = `<div class="loading"><div class="spinner"></div>Loading…</div>`
}

function renderEmpty(container, title, message) {
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">◫</div>
      <h3>${title}</h3>
      <p>${message}</p>
    </div>`
}

// ─── Escape HTML ──────────────────────────────────────────────────────────────

function esc(str) {
  if (str === null || str === undefined) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
