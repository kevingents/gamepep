import './style.css'
import * as THREE from 'three'
import { sfx, resumeAudio } from './sfx.js'
import { buildHaarlem } from './haarlem.js'
import { makeCharacter, loadCfg, saveCfg, OPTIONS, PART_LABELS } from './character.js'
import { getTop, topScore, qualifies, addScore } from './scores.js'

// =====================================================================
//  Diamant Haarlem - een 3D arcade-game in Minecraft-stijl.
//  Loop met je eigen popje door Haarlem, pak alle diamanten, ontwijk
//  de creepers, haal een highscore. Speelt zich af in Haarlem met
//  herkenningspunten zoals de Grote Kerk, Molen De Adriaan en de
//  Veronicaschool.
// =====================================================================

const GRID = 24
const MAX_HEARTS = 3
const STEVE_SPEED = 4.6
const CREEPER_SPEED = 1.7
const BASE_DIAMONDS = 5
const BASE_CREEPERS = 2
const START = { x: 12.5, z: 20.5 }

// ---------- DOM ----------
const canvas = document.getElementById('game')
const hud = {
  level: document.getElementById('level'),
  hearts: document.getElementById('hearts'),
  score: document.getElementById('score'),
  diamonds: document.getElementById('diamonds'),
}
const muteBtn = document.getElementById('mute')
const $ = (id) => document.getElementById(id)

// ---------- Texturen (creeper-gezicht + gras) ----------
function makeTexture(size, draw, repeat) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  draw(c.getContext('2d'), size)
  const tex = new THREE.CanvasTexture(c)
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.NearestFilter
  if (repeat) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(repeat, repeat)
  }
  return tex
}
const grassTex = makeTexture(
  16,
  (g, s) => {
    g.fillStyle = '#6fb43e'
    g.fillRect(0, 0, s, s)
    g.fillStyle = '#7cc04a'
    for (let i = 0; i < 18; i++) g.fillRect((Math.random() * s) | 0, (Math.random() * s) | 0, 1, 2)
    g.strokeStyle = 'rgba(0,0,0,0.13)'
    g.strokeRect(0.5, 0.5, s - 1, s - 1)
  },
  GRID
)
const creeperTex = makeTexture(16, (g, s) => {
  g.fillStyle = '#54b455'
  g.fillRect(0, 0, s, s)
  g.fillStyle = '#46a047'
  for (let i = 0; i < 16; i++) g.fillRect((Math.random() * s) | 0, (Math.random() * s) | 0, 2, 2)
  g.fillStyle = '#15230e'
  g.fillRect(3, 5, 3, 3)
  g.fillRect(10, 5, 3, 3)
  g.fillRect(6, 8, 4, 5)
  g.fillRect(4, 11, 2, 2)
  g.fillRect(10, 11, 2, 2)
})

const mat = {
  grass: new THREE.MeshLambertMaterial({ map: grassTex }),
  dirt: new THREE.MeshLambertMaterial({ color: 0x8a5a33 }),
  creeper: new THREE.MeshLambertMaterial({ map: creeperTex }),
  diamond: new THREE.MeshStandardMaterial({ color: 0x40dcea, emissive: 0x0c7f8c, metalness: 0.3, roughness: 0.25 }),
}
function pillarGeo(w, h, d) {
  const g = new THREE.BoxGeometry(w, h, d)
  g.translate(0, h / 2, 0)
  return g
}

// ---------- Three.js basis ----------
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x9fd6ff)
scene.fog = new THREE.Fog(0x9fd6ff, 30, 80)

const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200)
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap

scene.add(new THREE.AmbientLight(0xbfd4ff, 0.62))
const sun = new THREE.DirectionalLight(0xfff2dc, 1.0)
sun.position.set(GRID * 0.7, GRID * 1.3, GRID * 0.3)
sun.castShadow = true
sun.shadow.mapSize.set(1024, 1024)
const sd = GRID * 0.8
sun.shadow.camera.left = -sd
sun.shadow.camera.right = sd
sun.shadow.camera.top = sd
sun.shadow.camera.bottom = -sd
sun.shadow.camera.near = 1
sun.shadow.camera.far = GRID * 4
sun.target.position.set(GRID / 2, 0, GRID / 2)
scene.add(sun, sun.target)

const groundMats = [mat.dirt, mat.dirt, mat.grass, mat.dirt, mat.dirt, mat.dirt]
const ground = new THREE.Mesh(new THREE.BoxGeometry(GRID, 1, GRID), groundMats)
ground.position.set(GRID / 2, -0.5, GRID / 2)
ground.receiveShadow = true
scene.add(ground)

// ---------- Haarlem ----------
const worldGroup = new THREE.Group()
scene.add(worldGroup)
const world = buildHaarlem(worldGroup, GRID)
const roundGroup = new THREE.Group()
scene.add(roundGroup)

// ---------- Speler-popje ----------
let playerCfg = loadCfg()
let player = null
function setCharacter(cfg) {
  const pos = player ? player.position.clone() : null
  const ry = player ? player.rotation.y : 0
  if (player) scene.remove(player)
  player = makeCharacter(cfg)
  if (pos) player.position.copy(pos)
  player.rotation.y = ry
  scene.add(player)
}
setCharacter(playerCfg)

// ---------- Spelstatus ----------
let status = 'intro' // 'intro' | 'creator' | 'playing' | 'gameover'
let score = 0
let lives = MAX_HEARTS
let round = 1
let steveX = START.x
let steveZ = START.z
let walkPhase = 0
let invuln = 0
let pendingScore = 0
let diamonds = []
let creepers = []
let totalDiamonds = 0

const cellKey = (cx, cz) => cx + ',' + cz
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v)
function cellSolid(x, z) {
  return world.solids.has(cellKey(Math.floor(x), Math.floor(z)))
}

// ---------- Bouwers (diamant + creeper) ----------
function makeDiamond() {
  const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.32), mat.diamond)
  m.scale.set(1, 1.4, 1)
  m.castShadow = true
  return m
}
function makeCreeper() {
  const g = new THREE.Group()
  const body = new THREE.Mesh(pillarGeo(0.7, 1.4, 0.7), mat.creeper)
  body.position.y = 0.24
  body.castShadow = true
  g.add(body)
  const footGeo = pillarGeo(0.28, 0.22, 0.3)
  for (const [fx, fz] of [[-0.18, 0.22], [0.18, 0.22], [-0.18, -0.22], [0.18, -0.22]]) {
    const f = new THREE.Mesh(footGeo, mat.creeper)
    f.position.set(fx, 0, fz)
    f.castShadow = true
    g.add(f)
  }
  return g
}

// ---------- Ronde bouwen ----------
function clearRound() {
  for (const child of [...roundGroup.children]) {
    roundGroup.remove(child)
    child.traverse((o) => {
      if (o.isMesh && o.geometry) o.geometry.dispose()
    })
  }
  diamonds = []
  creepers = []
}
function freeCell(taken) {
  for (let tries = 0; tries < 300; tries++) {
    const cx = 1 + ((Math.random() * (GRID - 6)) | 0)
    const cz = 1 + ((Math.random() * (GRID - 2)) | 0)
    const k = cellKey(cx, cz)
    const nearStart = Math.abs(cx + 0.5 - START.x) < 2 && Math.abs(cz + 0.5 - START.z) < 2
    if (!nearStart && !taken.has(k) && !world.solids.has(k)) {
      taken.add(k)
      return { x: cx + 0.5, z: cz + 0.5 }
    }
  }
  return null
}
function buildRound() {
  clearRound()
  const taken = new Set()
  totalDiamonds = BASE_DIAMONDS + (round - 1) * 2
  for (let i = 0; i < totalDiamonds; i++) {
    const c = freeCell(taken)
    if (!c) continue
    const m = makeDiamond()
    m.position.set(c.x, 0.9, c.z)
    roundGroup.add(m)
    diamonds.push({ mesh: m, x: c.x, z: c.z, baseY: 0.9, phase: Math.random() * 6.28, collected: false })
  }
  const creeperCount = BASE_CREEPERS + (round - 1)
  for (let i = 0; i < creeperCount; i++) {
    const c = freeCell(taken)
    if (!c) continue
    const m = makeCreeper()
    m.position.set(c.x, 0, c.z)
    roundGroup.add(m)
    creepers.push({ mesh: m, x: c.x, z: c.z, heading: Math.random() * 6.28, timer: 0 })
  }
  steveX = START.x
  steveZ = START.z
  player.position.set(steveX, 0, steveZ)
  player.rotation.y = 0
  player.visible = true
  invuln = 0
  camera.position.set(steveX, 11, steveZ + 13)
  camLook.set(steveX, 1.2, steveZ)
  camera.lookAt(camLook)
  updateHud()
}

// ---------- Bewegen ----------
const held = { up: false, down: false, left: false, right: false }
function moveSteve(dx, dz) {
  const nx = clamp(steveX + dx, 0.6, GRID - 0.6)
  if (!cellSolid(nx, steveZ)) steveX = nx
  const nz = clamp(steveZ + dz, 0.6, GRID - 0.6)
  if (!cellSolid(steveX, nz)) steveZ = nz
}
function updatePlayer(dt) {
  let vx = (held.right ? 1 : 0) - (held.left ? 1 : 0)
  let vz = (held.down ? 1 : 0) - (held.up ? 1 : 0)
  const u = player.userData
  if (vx !== 0 || vz !== 0) {
    const len = Math.hypot(vx, vz)
    vx /= len
    vz /= len
    moveSteve(vx * STEVE_SPEED * dt, vz * STEVE_SPEED * dt)
    player.rotation.y = Math.atan2(vx, -vz)
    walkPhase += dt * 11
    const sw = Math.sin(walkPhase) * 0.6
    u.lLeg.rotation.x = sw
    u.rLeg.rotation.x = -sw
    u.lArm.rotation.x = -sw
    u.rArm.rotation.x = sw
    player.position.set(steveX, Math.abs(Math.sin(walkPhase)) * 0.06, steveZ)
  } else {
    u.lLeg.rotation.x *= 0.7
    u.rLeg.rotation.x *= 0.7
    u.lArm.rotation.x *= 0.7
    u.rArm.rotation.x *= 0.7
    player.position.set(steveX, 0, steveZ)
  }
  if (invuln > 0) {
    invuln -= dt
    player.visible = Math.floor(invuln * 10) % 2 === 0
    if (invuln <= 0) player.visible = true
  }
}
function updateCreepers(dt) {
  for (const c of creepers) {
    c.timer -= dt
    if (c.timer <= 0) {
      c.heading = Math.random() < 0.35 ? Math.atan2(steveZ - c.z, steveX - c.x) : Math.random() * 6.28
      c.timer = 1 + Math.random() * 1.6
    }
    const dx = Math.cos(c.heading) * CREEPER_SPEED * dt
    const dz = Math.sin(c.heading) * CREEPER_SPEED * dt
    const nx = clamp(c.x + dx, 0.6, GRID - 0.6)
    const nz = clamp(c.z + dz, 0.6, GRID - 0.6)
    if (!cellSolid(nx, nz)) {
      c.x = nx
      c.z = nz
    } else {
      c.timer = 0
    }
    c.mesh.position.set(c.x, 0, c.z)
    c.mesh.rotation.y = Math.atan2(dx, -dz)
  }
}
function checkCollisions() {
  for (const d of diamonds) {
    if (d.collected) continue
    const dx = d.x - steveX
    const dz = d.z - steveZ
    if (dx * dx + dz * dz < 0.45 * 0.45) {
      d.collected = true
      d.mesh.visible = false
      score += 100
      sfx.coin()
      updateHud()
      if (diamonds.every((q) => q.collected)) {
        roundClear()
        return
      }
    }
  }
  if (invuln <= 0) {
    for (const c of creepers) {
      const dx = c.x - steveX
      const dz = c.z - steveZ
      if (dx * dx + dz * dz < 0.6 * 0.6) {
        hit()
        break
      }
    }
  }
}
function roundClear() {
  score += 250
  round += 1
  sfx.win()
  showToast('RONDE ' + round)
  buildRound()
}
function hit() {
  lives -= 1
  sfx.bonk()
  invuln = 1.3
  steveX = START.x
  steveZ = START.z
  player.position.set(steveX, 0, steveZ)
  updateHud()
  if (lives <= 0) showGameOver()
}

// ---------- Camera ----------
const camLook = new THREE.Vector3(START.x, 1.2, START.z)
function followCam(dt) {
  const k = Math.min(1, dt * 4)
  camera.position.x += (steveX - camera.position.x) * k
  camera.position.z += (steveZ + 13 - camera.position.z) * k
  camera.position.y += (11 - camera.position.y) * k
  const k2 = Math.min(1, dt * 6)
  camLook.x += (steveX - camLook.x) * k2
  camLook.y += (1.2 - camLook.y) * k2
  camLook.z += (steveZ - camLook.z) * k2
  camera.lookAt(camLook)
}
function setOverviewCam() {
  camera.position.set(GRID / 2 - 1, 21, GRID + 5)
  camera.lookAt(GRID / 2 - 1, 1, GRID / 2 - 1)
}
function setCreatorCam() {
  camera.position.set(0, 1.7, 4.2)
  camera.lookAt(0, 1.25, 0)
}

// ---------- HUD ----------
function heartIcon(full) {
  return (
    '<svg viewBox="0 0 24 24" class="icon"><path d="M12 21s-7-4.6-9.3-9C1 8.5 2.6 5 6 5c2 0 3.2 1.2 4 2.3C10.8 6.2 12 5 14 5c3.4 0 5 3.5 3.3 7-2.3 4.4-9.3 9-9.3 9z" fill="' +
    (full ? '#ff5b5b' : '#3a3f4b') +
    '"/></svg>'
  )
}
const diamondIcon =
  '<svg viewBox="0 0 24 24" class="icon"><path d="M6 3h12l4 6-10 12L2 9z" fill="#36d6e7" stroke="#1a9fb0" stroke-width="1.5"/></svg>'
function updateHud() {
  let h = ''
  for (let i = 0; i < MAX_HEARTS; i++) h += heartIcon(i < lives)
  hud.hearts.innerHTML = h
  const got = diamonds.filter((d) => d.collected).length
  hud.diamonds.innerHTML = diamondIcon + '<span>' + got + '/' + totalDiamonds + '</span>'
  hud.score.textContent = String(score).padStart(5, '0')
  hud.level.textContent = 'RONDE ' + round
}

// ---------- Schermen ----------
function hideAllScreens() {
  $('intro').classList.remove('show')
  $('creator').classList.remove('show')
  $('gameover').classList.remove('show')
}
function setSceneVisible(v) {
  ground.visible = v
  worldGroup.visible = v
  roundGroup.visible = v
}
function setChrome(v) {
  // HUD + bedieningsknoppen alleen tijdens het spelen tonen
  document.getElementById('hud').style.visibility = v ? 'visible' : 'hidden'
  document.getElementById('controls').style.visibility = v ? 'visible' : 'hidden'
}
function showIntro() {
  status = 'intro'
  setSceneVisible(true)
  setChrome(false)
  player.visible = false
  setOverviewCam()
  hideAllScreens()
  $('introHi').textContent = topScore()
  $('intro').classList.add('show')
}
function startGame() {
  resumeAudio()
  sfx.start()
  status = 'playing'
  setSceneVisible(true)
  setChrome(true)
  hideAllScreens()
  score = 0
  lives = MAX_HEARTS
  round = 1
  setCharacter(playerCfg)
  buildRound()
}
function showCreator() {
  resumeAudio()
  status = 'creator'
  setSceneVisible(false)
  setChrome(false)
  hideAllScreens()
  $('creator').classList.add('show')
  buildCreatorUI()
  player.visible = true
  player.position.set(0, 0, 0)
  player.rotation.y = 0
  setCreatorCam()
}
function exitCreator() {
  saveCfg(playerCfg)
  showIntro()
}
function showGameOver() {
  status = 'gameover'
  sfx.gameover()
  pendingScore = score
  setSceneVisible(true)
  setChrome(false)
  player.visible = false
  setOverviewCam()
  $('finalScore').textContent = score
  const box = $('initialsBox')
  if (qualifies(score)) {
    box.classList.add('show')
    $('initialsInput').value = ''
    setTimeout(() => $('initialsInput').focus(), 120)
  } else {
    box.classList.remove('show')
  }
  renderHiTable(getTop())
  hideAllScreens()
  $('gameover').classList.add('show')
}
function renderHiTable(top) {
  const t = $('hiTable')
  if (!top.length) {
    t.innerHTML = '<tr><td colspan="3">Nog geen scores</td></tr>'
    return
  }
  t.innerHTML = top
    .map((r, i) => '<tr><td>' + (i + 1) + '</td><td>' + r.name + '</td><td>' + r.score + '</td></tr>')
    .join('')
}

// ---------- Popje-maker UI ----------
function buildCreatorUI() {
  const rows = $('creatorRows')
  rows.innerHTML = ''
  for (const part of ['skin', 'shirt', 'pants', 'hair', 'hat']) {
    const row = document.createElement('div')
    row.className = 'creator-row'
    const lab = document.createElement('span')
    lab.className = 'creator-label'
    lab.textContent = PART_LABELS[part]
    row.appendChild(lab)
    const sw = document.createElement('div')
    sw.className = 'swatches'
    OPTIONS[part].forEach((val, idx) => {
      const b = document.createElement('button')
      b.className = 'swatch'
      if (part === 'hat' && idx === 0) {
        b.classList.add('none')
        b.textContent = 'geen'
      } else {
        b.style.background = val
      }
      if (idx === playerCfg[part]) b.classList.add('sel')
      b.onclick = () => {
        playerCfg[part] = idx
        setCharacter(playerCfg)
        player.position.set(0, 0, 0)
        ;[...sw.children].forEach((c) => c.classList.remove('sel'))
        b.classList.add('sel')
      }
      sw.appendChild(b)
    })
    row.appendChild(sw)
    rows.appendChild(row)
  }
}

// ---------- Toast ----------
let toastTimer = null
function showToast(text) {
  const el = $('toast')
  el.textContent = text
  el.classList.add('show')
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => el.classList.remove('show'), 1200)
}

// ---------- Geluid aan/uit ----------
function speakerIcon(on) {
  const base = '<svg viewBox="0 0 24 24"><path d="M5 9v6h4l5 4V5L9 9H5z" fill="currentColor"/>'
  return on
    ? base + '<path d="M16 8.5a4 4 0 010 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
    : base + '<path d="M16 9.5l5 5M21 9.5l-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
}
function updateMuteBtn() {
  muteBtn.innerHTML = speakerIcon(sfx.enabled)
}
muteBtn.addEventListener('click', () => {
  sfx.enabled = !sfx.enabled
  updateMuteBtn()
})

// ---------- Bediening ----------
const KEYMAP = {
  ArrowUp: 'up', w: 'up', W: 'up',
  ArrowDown: 'down', s: 'down', S: 'down',
  ArrowLeft: 'left', a: 'left', A: 'left',
  ArrowRight: 'right', d: 'right', D: 'right',
}
window.addEventListener(
  'keydown',
  (e) => {
    if (document.activeElement && document.activeElement.tagName === 'INPUT') return
    const dir = KEYMAP[e.key]
    if (dir) {
      e.preventDefault()
      held[dir] = true
    }
  },
  { passive: false }
)
window.addEventListener('keyup', (e) => {
  const dir = KEYMAP[e.key]
  if (dir) held[dir] = false
})
document.querySelectorAll('.dpad-btn').forEach((btn) => {
  const dir = btn.dataset.dir
  btn.innerHTML =
    '<svg viewBox="0 0 24 24" style="transform:rotate(' +
    { up: 0, right: 90, down: 180, left: 270 }[dir] +
    'deg)"><path d="M12 5l8 12H4z" fill="currentColor"/></svg>'
  const on = (e) => {
    e.preventDefault()
    resumeAudio()
    held[dir] = true
  }
  const off = () => {
    held[dir] = false
  }
  btn.addEventListener('pointerdown', on)
  btn.addEventListener('pointerup', off)
  btn.addEventListener('pointerleave', off)
  btn.addEventListener('pointercancel', off)
})
window.addEventListener('pointerup', () => {
  held.up = held.down = held.left = held.right = false
})

// ---------- Knoppen ----------
$('btnPlay').addEventListener('click', startGame)
$('btnCreator').addEventListener('click', showCreator)
$('btnCreatorDone').addEventListener('click', exitCreator)
$('btnRestart').addEventListener('click', showIntro)
$('btnSaveScore').addEventListener('click', () => {
  let name = ($('initialsInput').value || 'AAA').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3)
  if (!name) name = 'AAA'
  const top = addScore(name, pendingScore)
  renderHiTable(top)
  $('initialsBox').classList.remove('show')
})

// ---------- Schermgrootte ----------
function resize() {
  const stage = canvas.parentElement
  const w = stage.clientWidth
  const h = stage.clientHeight
  if (w === 0 || h === 0) return
  renderer.setSize(w, h, false)
  camera.aspect = w / h
  camera.updateProjectionMatrix()
}
window.addEventListener('resize', resize)
window.addEventListener('orientationchange', resize)

// ---------- Spel-loop ----------
let last = performance.now()
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000)
  last = now
  if (status === 'playing') {
    updatePlayer(dt)
    updateCreepers(dt)
    checkCollisions()
    world.update(dt)
    for (const d of diamonds) {
      if (d.collected) continue
      d.mesh.rotation.y += dt * 2.2
      d.mesh.position.y = d.baseY + Math.sin(now * 0.003 + d.phase) * 0.15
    }
    followCam(dt)
  } else if (status === 'creator') {
    player.rotation.y += dt * 0.8
  } else {
    world.update(dt)
  }
  renderer.render(scene, camera)
  requestAnimationFrame(frame)
}

// ---------- Start ----------
function init() {
  resize()
  updateMuteBtn()
  showIntro()
  requestAnimationFrame(frame)
}
init()
