import './style.css'
import { LEVELS } from './levels.js'
import { sfx, resumeAudio } from './sfx.js'

// ---------- Elementen ----------
const canvas = document.getElementById('game')
const ctx = canvas.getContext('2d')
const overlay = document.getElementById('overlay')
const muteBtn = document.getElementById('mute')
const hud = {
  level: document.getElementById('level'),
  hearts: document.getElementById('hearts'),
  diamonds: document.getElementById('diamonds'),
}

// ---------- Constanten ----------
const MAX_HEARTS = 3
const DIRS = [
  [0, -1],
  [0, 1],
  [-1, 0],
  [1, 0],
]
const KEYMAP = {
  ArrowUp: [0, -1], w: [0, -1], W: [0, -1],
  ArrowDown: [0, 1], s: [0, 1], S: [0, 1],
  ArrowLeft: [-1, 0], a: [-1, 0], A: [-1, 0],
  ArrowRight: [1, 0], d: [1, 0], D: [1, 0],
}
const DIR_BY_NAME = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }

// ---------- Spelstatus ----------
let levelIndex = 0
let state = null

const key = (x, y) => x + ',' + y

function loadLevel(idx) {
  const map = LEVELS[idx].map((row) => row.split(''))
  const rows = map.length
  const cols = map[0].length
  const grid = []
  const diamonds = new Set()
  const creepers = []
  let start = { x: 1, y: 1 }

  for (let y = 0; y < rows; y++) {
    grid[y] = []
    for (let x = 0; x < cols; x++) {
      const ch = map[y][x]
      grid[y][x] = ch === '#' ? '#' : '.'
      if (ch === 'S') start = { x, y }
      if (ch === 'D') diamonds.add(key(x, y))
      if (ch === 'C') creepers.push({ x, y, dir: { x: 0, y: 0 } })
    }
  }

  state = {
    grid,
    rows,
    cols,
    steve: { ...start },
    start,
    diamonds,
    totalDiamonds: diamonds.size,
    creepers,
    hearts: MAX_HEARTS,
    status: 'playing', // 'playing' | 'won' | 'finished' | 'lost'
    creeperTimer: 0,
    creeperInterval: Math.max(320, 620 - idx * 90), // hoger level = iets sneller
    flash: 0,
  }
  updateHud()
}

// ---------- Bewegen ----------
function isWall(x, y) {
  if (x < 0 || y < 0 || x >= state.cols || y >= state.rows) return true
  return state.grid[y][x] === '#'
}

function tryMove(dx, dy) {
  if (!state || state.status !== 'playing') return
  const nx = state.steve.x + dx
  const ny = state.steve.y + dy
  if (isWall(nx, ny)) return

  state.steve.x = nx
  state.steve.y = ny

  const k = key(nx, ny)
  if (state.diamonds.has(k)) {
    state.diamonds.delete(k)
    sfx.coin()
    updateHud()
    if (state.diamonds.size === 0) {
      win()
      return
    }
  }
  if (state.creepers.some((c) => c.x === nx && c.y === ny)) hit()
}

function moveCreepers() {
  for (const c of state.creepers) {
    const opts = []
    for (const [dx, dy] of DIRS) {
      if (!isWall(c.x + dx, c.y + dy)) opts.push({ dx, dy, nx: c.x + dx, ny: c.y + dy })
    }
    if (!opts.length) continue

    // niet meteen terugkeren (oogt natuurlijker)
    let choices = opts.filter((o) => !(o.dx === -c.dir.x && o.dy === -c.dir.y))
    if (!choices.length) choices = opts

    let pick
    if (Math.random() < 0.4) {
      // soms richting Steve lopen
      choices.sort((a, b) => manhattan(a.nx, a.ny) - manhattan(b.nx, b.ny))
      pick = choices[0]
    } else {
      pick = choices[(Math.random() * choices.length) | 0]
    }

    c.x = pick.nx
    c.y = pick.ny
    c.dir = { x: pick.dx, y: pick.dy }
    if (c.x === state.steve.x && c.y === state.steve.y) hit()
  }
}

function manhattan(x, y) {
  return Math.abs(x - state.steve.x) + Math.abs(y - state.steve.y)
}

function hit() {
  if (state.status !== 'playing') return
  state.hearts -= 1
  state.flash = 1
  sfx.bonk()
  state.steve = { ...state.start }
  updateHud()
  if (state.hearts <= 0) lose()
}

function win() {
  state.status = 'won'
  sfx.win()
  if (levelIndex < LEVELS.length - 1) {
    showOverlay('Goed gedaan!', 'Je hebt alle diamanten gevonden!', 'Volgende level', () => {
      levelIndex += 1
      loadLevel(levelIndex)
      hideOverlay()
    })
  } else {
    state.status = 'finished'
    showOverlay('Gewonnen!', 'Je hebt het hele spel uitgespeeld. Wat goed!', 'Opnieuw spelen', () => {
      levelIndex = 0
      loadLevel(0)
      hideOverlay()
    })
  }
}

function lose() {
  state.status = 'lost'
  showOverlay('Oeps!', 'De creepers hebben je te pakken. Probeer het nog een keer!', 'Opnieuw', () => {
    loadLevel(levelIndex)
    hideOverlay()
  })
}

// ---------- Tekenen ----------
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const rect = canvas.getBoundingClientRect()
  canvas.width = Math.max(1, Math.floor(rect.width * dpr))
  canvas.height = Math.max(1, Math.floor(rect.height * dpr))
}

function drawFloor(px, py, t, gx, gy) {
  ctx.fillStyle = (gx + gy) % 2 === 0 ? '#8ad15a' : '#80c850'
  ctx.fillRect(px, py, t, t)
}

function drawWall(px, py, t) {
  ctx.fillStyle = '#5b626e'
  ctx.fillRect(px, py, t, t)
  ctx.fillStyle = '#474d57'
  ctx.fillRect(px + t * 0.06, py + t * 0.06, t * 0.88, t * 0.88)
  ctx.fillStyle = '#6b7280'
  ctx.fillRect(px + t * 0.14, py + t * 0.14, t * 0.32, t * 0.26)
  ctx.fillRect(px + t * 0.56, py + t * 0.18, t * 0.28, t * 0.22)
  ctx.fillRect(px + t * 0.18, py + t * 0.56, t * 0.26, t * 0.28)
  ctx.fillRect(px + t * 0.55, py + t * 0.55, t * 0.3, t * 0.26)
}

function drawDiamond(px, py, t, now) {
  const cx = px + t / 2
  const cy = py + t / 2
  const s = t * 0.3 * (1 + 0.08 * Math.sin(now / 280))
  ctx.save()
  ctx.translate(cx, cy)
  ctx.fillStyle = '#36d6e7'
  ctx.beginPath()
  ctx.moveTo(0, -s)
  ctx.lineTo(s, -s * 0.2)
  ctx.lineTo(0, s)
  ctx.lineTo(-s, -s * 0.2)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#a6f1fa'
  ctx.beginPath()
  ctx.moveTo(0, -s)
  ctx.lineTo(s * 0.45, -s * 0.2)
  ctx.lineTo(0, s * 0.1)
  ctx.lineTo(-s * 0.45, -s * 0.2)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

function drawSteve(px, py, t) {
  const u = t / 8
  // benen
  ctx.fillStyle = '#3a4a8c'
  ctx.fillRect(px + u * 2, py + u * 7, u * 1.6, u)
  ctx.fillRect(px + u * 4.4, py + u * 7, u * 1.6, u)
  // shirt
  ctx.fillStyle = '#19a3a3'
  ctx.fillRect(px + u * 2, py + u * 4, u * 4, u * 3)
  // armen
  ctx.fillStyle = '#e0a878'
  ctx.fillRect(px + u * 1, py + u * 4, u, u * 3)
  ctx.fillRect(px + u * 6, py + u * 4, u, u * 3)
  // hoofd
  ctx.fillStyle = '#e0a878'
  ctx.fillRect(px + u * 2, py + u, u * 4, u * 3)
  // haar
  ctx.fillStyle = '#5a3a22'
  ctx.fillRect(px + u * 2, py + u, u * 4, u)
  ctx.fillRect(px + u * 2, py + u, u, u * 2)
  ctx.fillRect(px + u * 5, py + u, u, u * 2)
  // ogen
  ctx.fillStyle = '#2b2b3a'
  ctx.fillRect(px + u * 3, py + u * 2.4, u * 0.8, u * 0.9)
  ctx.fillRect(px + u * 4.4, py + u * 2.4, u * 0.8, u * 0.9)
}

function drawCreeper(px, py, t) {
  const u = t / 8
  // lijf
  ctx.fillStyle = '#4caf50'
  ctx.fillRect(px + u, py + u, u * 6, u * 6)
  ctx.fillStyle = '#43a047'
  ctx.fillRect(px + u * 2, py + u * 2, u, u)
  ctx.fillRect(px + u * 5, py + u * 3, u, u)
  ctx.fillRect(px + u * 2.5, py + u * 5.5, u, u)
  // gezicht
  ctx.fillStyle = '#16240f'
  ctx.fillRect(px + u * 2.2, py + u * 2.6, u * 1.3, u * 1.3)
  ctx.fillRect(px + u * 4.5, py + u * 2.6, u * 1.3, u * 1.3)
  ctx.fillRect(px + u * 3.4, py + u * 3.9, u * 1.2, u * 2.1)
  ctx.fillRect(px + u * 2.6, py + u * 5, u * 0.9, u)
  ctx.fillRect(px + u * 4.5, py + u * 5, u * 0.9, u)
}

function render(now) {
  const W = canvas.width
  const H = canvas.height
  ctx.clearRect(0, 0, W, H)
  if (!state) return

  const t = Math.floor(Math.min(W / state.cols, H / state.rows))
  const offX = Math.floor((W - t * state.cols) / 2)
  const offY = Math.floor((H - t * state.rows) / 2)

  for (let y = 0; y < state.rows; y++) {
    for (let x = 0; x < state.cols; x++) {
      const px = offX + x * t
      const py = offY + y * t
      if (state.grid[y][x] === '#') drawWall(px, py, t)
      else drawFloor(px, py, t, x, y)
    }
  }

  state.diamonds.forEach((k) => {
    const [x, y] = k.split(',').map(Number)
    drawDiamond(offX + x * t, offY + y * t, t, now)
  })

  for (const c of state.creepers) drawCreeper(offX + c.x * t, offY + c.y * t, t)
  drawSteve(offX + state.steve.x * t, offY + state.steve.y * t, t)

  if (state.flash > 0) {
    ctx.fillStyle = 'rgba(220,40,40,' + 0.3 * state.flash + ')'
    ctx.fillRect(0, 0, W, H)
    state.flash = Math.max(0, state.flash - 0.05)
  }
}

// ---------- HUD ----------
function heartIcon(full) {
  const color = full ? '#ff5b5b' : '#3a3f4b'
  return (
    '<svg viewBox="0 0 24 24" class="icon"><path d="M12 21s-7-4.6-9.3-9C1 8.5 2.6 5 6 5c2 0 3.2 1.2 4 2.3C10.8 6.2 12 5 14 5c3.4 0 5 3.5 3.3 7-2.3 4.4-9.3 9-9.3 9z" fill="' +
    color +
    '"/></svg>'
  )
}

const diamondIcon =
  '<svg viewBox="0 0 24 24" class="icon"><path d="M6 3h12l4 6-10 12L2 9z" fill="#36d6e7" stroke="#1a9fb0" stroke-width="1.5"/></svg>'

function updateHud() {
  let hearts = ''
  for (let i = 0; i < MAX_HEARTS; i++) hearts += heartIcon(i < state.hearts)
  hud.hearts.innerHTML = hearts
  const got = state.totalDiamonds - state.diamonds.size
  hud.diamonds.innerHTML = diamondIcon + '<span>' + got + '/' + state.totalDiamonds + '</span>'
  hud.level.textContent = 'Level ' + (levelIndex + 1)
}

// ---------- Overlay ----------
function showOverlay(title, text, btnLabel, onClick) {
  overlay.querySelector('.ov-title').textContent = title
  overlay.querySelector('.ov-text').textContent = text
  const btn = overlay.querySelector('.ov-btn')
  btn.textContent = btnLabel
  btn.onclick = () => {
    resumeAudio()
    onClick()
  }
  overlay.classList.add('show')
}

function hideOverlay() {
  overlay.classList.remove('show')
}

// ---------- Geluid aan/uit ----------
function speakerIcon(on) {
  const base =
    '<svg viewBox="0 0 24 24"><path d="M5 9v6h4l5 4V5L9 9H5z" fill="currentColor"/>'
  if (on) {
    return (
      base +
      '<path d="M16 8.5a4 4 0 010 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
    )
  }
  return base + '<path d="M16 9.5l5 5M21 9.5l-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
}

function updateMuteBtn() {
  muteBtn.innerHTML = speakerIcon(sfx.enabled)
}

muteBtn.addEventListener('click', () => {
  sfx.enabled = !sfx.enabled
  updateMuteBtn()
})

// ---------- Bediening ----------
window.addEventListener(
  'keydown',
  (e) => {
    const m = KEYMAP[e.key]
    if (m) {
      e.preventDefault()
      tryMove(m[0], m[1])
    }
  },
  { passive: false }
)

// Knoppen onderin: tik = 1 stap, ingedrukt houden = blijven lopen.
const ARROW_ROTATION = { up: 0, right: 90, down: 180, left: 270 }
document.querySelectorAll('.dpad-btn').forEach((btn) => {
  const dir = btn.dataset.dir
  const [dx, dy] = DIR_BY_NAME[dir]
  btn.innerHTML =
    '<svg viewBox="0 0 24 24" style="transform:rotate(' +
    ARROW_ROTATION[dir] +
    'deg)"><path d="M12 5l8 12H4z" fill="currentColor"/></svg>'
  let timer = null
  const start = (e) => {
    e.preventDefault()
    resumeAudio()
    tryMove(dx, dy)
    timer = setInterval(() => tryMove(dx, dy), 160)
  }
  const stop = () => {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }
  btn.addEventListener('pointerdown', start)
  btn.addEventListener('pointerup', stop)
  btn.addEventListener('pointerleave', stop)
  btn.addEventListener('pointercancel', stop)
})

// Vegen (swipe) over het speelveld.
let touchStart = null
canvas.addEventListener('pointerdown', (e) => {
  resumeAudio()
  touchStart = { x: e.clientX, y: e.clientY }
})
canvas.addEventListener('pointerup', (e) => {
  if (!touchStart) return
  const dx = e.clientX - touchStart.x
  const dy = e.clientY - touchStart.y
  touchStart = null
  const ax = Math.abs(dx)
  const ay = Math.abs(dy)
  if (Math.max(ax, ay) < 22) return
  if (ax > ay) tryMove(dx > 0 ? 1 : -1, 0)
  else tryMove(0, dy > 0 ? 1 : -1)
})

// ---------- Spel-loop ----------
let last = performance.now()
function frame(now) {
  const dt = now - last
  last = now
  if (state && state.status === 'playing') {
    state.creeperTimer += dt
    if (state.creeperTimer >= state.creeperInterval) {
      state.creeperTimer = 0
      moveCreepers()
    }
  }
  render(now)
  requestAnimationFrame(frame)
}

// ---------- Start ----------
function init() {
  resize()
  window.addEventListener('resize', resize)
  window.addEventListener('orientationchange', resize)
  updateMuteBtn()

  // Startscherm: knop "Spelen" begint level 1.
  showOverlay(
    'Diamant Doolhof',
    'Loop met Steve door het doolhof en pak alle diamanten. Pas op voor de creepers! Veeg over het scherm of gebruik de knoppen.',
    'Spelen',
    () => {
      levelIndex = 0
      loadLevel(0)
      hideOverlay()
    }
  )

  requestAnimationFrame(frame)
}

init()
