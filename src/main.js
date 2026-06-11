import './style.css'
import * as THREE from 'three'
import { sfx, resumeAudio } from './sfx.js'

// =====================================================================
//  Diamant Wereld - een 3D open blokkenwereld in Minecraft-stijl.
//  Loop met Steve rond, pak alle diamanten, ontwijk de creepers.
//  Bediening: knoppen onderin of pijltjes/WASD ingedrukt houden = lopen.
// =====================================================================

// ---------- Instellingen (hier makkelijk aanpassen) ----------
const GRID = 16 // grootte van het speelveld (blokken)
const MAX_HEARTS = 3 // aantal levens
const STEVE_SPEED = 4.4 // hoe snel Steve loopt
const CREEPER_SPEED = 1.7 // hoe snel de creepers lopen (lager = makkelijker)
const BASE_DIAMONDS = 5 // diamanten in ronde 1
const BASE_CREEPERS = 2 // creepers in ronde 1

// ---------- Elementen ----------
const canvas = document.getElementById('game')
const overlay = document.getElementById('overlay')
const muteBtn = document.getElementById('mute')
const hud = {
  level: document.getElementById('level'),
  hearts: document.getElementById('hearts'),
  diamonds: document.getElementById('diamonds'),
}

// ---------- Texturen (klein, blok-stijl) ----------
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
    for (let i = 0; i < 18; i++) {
      g.fillRect((Math.random() * s) | 0, (Math.random() * s) | 0, 1, 2)
    }
    g.strokeStyle = 'rgba(0,0,0,0.14)'
    g.strokeRect(0.5, 0.5, s - 1, s - 1)
  },
  GRID
)

const dirtTex = makeTexture(
  16,
  (g, s) => {
    g.fillStyle = '#8a5a33'
    g.fillRect(0, 0, s, s)
    g.fillStyle = '#754a28'
    for (let i = 0; i < 22; i++) {
      g.fillRect((Math.random() * s) | 0, (Math.random() * s) | 0, 2, 1)
    }
    g.fillStyle = '#6fb43e'
    g.fillRect(0, 0, s, 3) // grassrandje bovenaan
  },
  GRID
)

const creeperTex = makeTexture(16, (g, s) => {
  g.fillStyle = '#54b455'
  g.fillRect(0, 0, s, s)
  g.fillStyle = '#46a047'
  for (let i = 0; i < 16; i++) {
    g.fillRect((Math.random() * s) | 0, (Math.random() * s) | 0, 2, 2)
  }
  g.fillStyle = '#15230e'
  g.fillRect(3, 5, 3, 3) // linkeroog
  g.fillRect(10, 5, 3, 3) // rechteroog
  g.fillRect(6, 8, 4, 5) // neus/mond
  g.fillRect(4, 11, 2, 2)
  g.fillRect(10, 11, 2, 2)
})

// ---------- Materialen ----------
const mat = {
  grass: new THREE.MeshLambertMaterial({ map: grassTex }),
  dirt: new THREE.MeshLambertMaterial({ map: dirtTex }),
  skin: new THREE.MeshLambertMaterial({ color: 0xe0a878 }),
  shirt: new THREE.MeshLambertMaterial({ color: 0x18a3a3 }),
  leg: new THREE.MeshLambertMaterial({ color: 0x34408c }),
  hair: new THREE.MeshLambertMaterial({ color: 0x5a3a22 }),
  eye: new THREE.MeshLambertMaterial({ color: 0x20202c }),
  creeper: new THREE.MeshLambertMaterial({ map: creeperTex }),
  trunk: new THREE.MeshLambertMaterial({ color: 0x7a5230 }),
  leaves: new THREE.MeshLambertMaterial({ color: 0x4f9e35 }),
  rock: new THREE.MeshLambertMaterial({ color: 0x8a8f98 }),
  diamond: new THREE.MeshStandardMaterial({
    color: 0x40dcea,
    emissive: 0x0c7f8c,
    metalness: 0.3,
    roughness: 0.25,
  }),
}

// Box met origin aan de onderkant (handig om op de grond te zetten / te draaien)
function pillarGeo(w, h, d) {
  const g = new THREE.BoxGeometry(w, h, d)
  g.translate(0, h / 2, 0)
  return g
}

// ---------- Three.js basis ----------
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x9fd6ff)
scene.fog = new THREE.Fog(0x9fd6ff, GRID * 1.3, GRID * 2.8)

const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200)
camera.position.set(GRID / 2, 10, GRID / 2 + 13)

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap

// Licht
scene.add(new THREE.AmbientLight(0xbfd4ff, 0.6))
const sun = new THREE.DirectionalLight(0xfff2dc, 1.0)
sun.position.set(GRID * 0.7, GRID * 1.4, GRID * 0.3)
sun.castShadow = true
sun.shadow.mapSize.set(1024, 1024)
const sd = GRID * 0.85
sun.shadow.camera.left = -sd
sun.shadow.camera.right = sd
sun.shadow.camera.top = sd
sun.shadow.camera.bottom = -sd
sun.shadow.camera.near = 1
sun.shadow.camera.far = GRID * 4
sun.target.position.set(GRID / 2, 0, GRID / 2)
scene.add(sun, sun.target)

// Grond (1 groot blok: gras bovenop, aarde aan de zijkanten)
const groundMats = [mat.dirt, mat.dirt, mat.grass, mat.dirt, mat.dirt, mat.dirt]
const ground = new THREE.Mesh(new THREE.BoxGeometry(GRID, 1, GRID), groundMats)
ground.position.set(GRID / 2, -0.5, GRID / 2)
ground.receiveShadow = true
scene.add(ground)

// Container voor alles dat per ronde verandert
const dynamic = new THREE.Group()
scene.add(dynamic)

// ---------- Steve ----------
function makeSteve() {
  const g = new THREE.Group()
  const legGeo = pillarGeo(0.28, 0.7, 0.32)
  const lLeg = new THREE.Mesh(legGeo, mat.leg)
  const rLeg = new THREE.Mesh(legGeo, mat.leg)
  lLeg.position.set(-0.16, 0.7, 0)
  rLeg.position.set(0.16, 0.7, 0)
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.4), mat.shirt)
  body.position.set(0, 1.05, 0)
  const armGeo = pillarGeo(0.22, 0.7, 0.3)
  const lArm = new THREE.Mesh(armGeo, mat.skin)
  const rArm = new THREE.Mesh(armGeo, mat.skin)
  lArm.position.set(-0.46, 1.4, 0)
  rArm.position.set(0.46, 1.4, 0)
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), mat.skin)
  head.position.set(0, 1.75, 0)
  const hairTop = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.18, 0.64), mat.hair)
  hairTop.position.set(0, 2.0, 0)
  const hairBack = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.5, 0.16), mat.hair)
  hairBack.position.set(0, 1.78, -0.25)
  const eyeGeo = new THREE.BoxGeometry(0.12, 0.12, 0.04)
  const lEye = new THREE.Mesh(eyeGeo, mat.eye)
  const rEye = new THREE.Mesh(eyeGeo, mat.eye)
  lEye.position.set(-0.14, 1.78, -0.31)
  rEye.position.set(0.14, 1.78, -0.31)
  g.add(lLeg, rLeg, body, lArm, rArm, head, hairTop, hairBack, lEye, rEye)
  g.traverse((o) => {
    if (o.isMesh) o.castShadow = true
  })
  g.userData = { lLeg, rLeg, lArm, rArm }
  return g
}

const steve = makeSteve()
scene.add(steve)
let steveX = GRID / 2
let steveZ = GRID / 2
let walkPhase = 0

// ---------- Spelstatus ----------
let round = 1
let hearts = MAX_HEARTS
let status = 'start' // 'start' | 'playing' | 'won' | 'lost'
let invuln = 0
let diamonds = [] // { mesh, x, z, baseY, phase, collected }
let creepers = [] // { mesh, x, z, heading, timer }
let totalDiamonds = 0
const solid = new Set() // cellen waar je niet doorheen kunt ("cx,cz")

const cellKey = (cx, cz) => cx + ',' + cz

function clearDynamic() {
  for (const child of [...dynamic.children]) {
    dynamic.remove(child)
    child.traverse((o) => {
      if (o.isMesh && o.geometry) o.geometry.dispose()
    })
  }
  diamonds = []
  creepers = []
  solid.clear()
}

function freeCell(taken) {
  // kies een vrije cel, niet te dicht bij het midden (de startplek)
  for (let tries = 0; tries < 200; tries++) {
    const cx = 1 + ((Math.random() * (GRID - 2)) | 0)
    const cz = 1 + ((Math.random() * (GRID - 2)) | 0)
    const k = cellKey(cx, cz)
    const nearCenter = Math.abs(cx + 0.5 - GRID / 2) < 2 && Math.abs(cz + 0.5 - GRID / 2) < 2
    if (!nearCenter && !taken.has(k) && !solid.has(k)) {
      taken.add(k)
      return { cx, cz, x: cx + 0.5, z: cz + 0.5 }
    }
  }
  return null
}

function makeTree(x, z) {
  const g = new THREE.Group()
  const trunk = new THREE.Mesh(pillarGeo(0.4, 1.1, 0.4), mat.trunk)
  const leaves = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.1, 1.2), mat.leaves)
  leaves.position.y = 1.55
  g.add(trunk, leaves)
  g.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true
      o.receiveShadow = true
    }
  })
  g.position.set(x, 0, z)
  return g
}

function makeRock(x, z) {
  const m = new THREE.Mesh(pillarGeo(0.9, 0.9, 0.9), mat.rock)
  m.castShadow = true
  m.receiveShadow = true
  m.position.set(x, 0, z)
  return m
}

function makeDiamond() {
  const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.32), mat.diamond)
  m.scale.set(1, 1.4, 1)
  m.castShadow = true
  return m
}

function makeCreeper() {
  const g = new THREE.Group()
  const body = new THREE.Mesh(pillarGeo(0.7, 1.4, 0.7), mat.creeper)
  body.castShadow = true
  g.add(body)
  const footGeo = pillarGeo(0.28, 0.22, 0.3)
  const offs = [
    [-0.18, 0.22],
    [0.18, 0.22],
    [-0.18, -0.22],
    [0.18, -0.22],
  ]
  for (const [fx, fz] of offs) {
    const f = new THREE.Mesh(footGeo, mat.creeper)
    f.position.set(fx, 0, fz)
    f.castShadow = true
    g.add(f)
  }
  body.position.y = 0.24
  return g
}

function buildWorld() {
  clearDynamic()
  const taken = new Set()

  // Bomen en rotsen (obstakels om omheen te lopen)
  const decoCount = 7 + round
  for (let i = 0; i < decoCount; i++) {
    const c = freeCell(taken)
    if (!c) continue
    solid.add(cellKey(c.cx, c.cz))
    dynamic.add(Math.random() < 0.6 ? makeTree(c.x, c.z) : makeRock(c.x, c.z))
  }

  // Diamanten
  totalDiamonds = BASE_DIAMONDS + (round - 1) * 2
  for (let i = 0; i < totalDiamonds; i++) {
    const c = freeCell(taken)
    if (!c) continue
    const m = makeDiamond()
    m.position.set(c.x, 0.9, c.z)
    dynamic.add(m)
    diamonds.push({ mesh: m, x: c.x, z: c.z, baseY: 0.9, phase: Math.random() * 6.28, collected: false })
  }

  // Creepers
  const creeperCount = BASE_CREEPERS + (round - 1)
  for (let i = 0; i < creeperCount; i++) {
    const c = freeCell(taken)
    if (!c) continue
    const m = makeCreeper()
    m.position.set(c.x, 0, c.z)
    dynamic.add(m)
    creepers.push({ mesh: m, x: c.x, z: c.z, heading: Math.random() * 6.28, timer: 0 })
  }

  // Steve terug naar het midden
  steveX = GRID / 2
  steveZ = GRID / 2
  steve.position.set(steveX, 0, steveZ)
  steve.visible = true
  invuln = 0
  // camera meteen goed richten op Steve (ook vóór de eerste loop-frame)
  camera.position.set(steveX, 10, steveZ + 13)
  camLook.set(steveX, 1.2, steveZ)
  camera.lookAt(camLook)
  updateHud()
}

// ---------- Bewegen ----------
const held = { up: false, down: false, left: false, right: false }

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v
}

function cellSolid(x, z) {
  return solid.has(cellKey(Math.floor(x), Math.floor(z)))
}

function moveSteve(dx, dz) {
  const nx = clamp(steveX + dx, 0.6, GRID - 0.6)
  if (!cellSolid(nx, steveZ)) steveX = nx
  const nz = clamp(steveZ + dz, 0.6, GRID - 0.6)
  if (!cellSolid(steveX, nz)) steveZ = nz
}

function updatePlayer(dt) {
  let vx = (held.right ? 1 : 0) - (held.left ? 1 : 0)
  let vz = (held.down ? 1 : 0) - (held.up ? 1 : 0)
  const u = steve.userData
  if (vx !== 0 || vz !== 0) {
    const len = Math.hypot(vx, vz)
    vx /= len
    vz /= len
    moveSteve(vx * STEVE_SPEED * dt, vz * STEVE_SPEED * dt)
    steve.rotation.y = Math.atan2(vx, -vz)
    walkPhase += dt * 11
    const sw = Math.sin(walkPhase) * 0.6
    u.lLeg.rotation.x = sw
    u.rLeg.rotation.x = -sw
    u.lArm.rotation.x = -sw
    u.rArm.rotation.x = sw
    steve.position.set(steveX, Math.abs(Math.sin(walkPhase)) * 0.06, steveZ)
  } else {
    u.lLeg.rotation.x *= 0.7
    u.rLeg.rotation.x *= 0.7
    u.lArm.rotation.x *= 0.7
    u.rArm.rotation.x *= 0.7
    steve.position.set(steveX, 0, steveZ)
  }

  // onkwetsbaar even na een tik -> Steve knippert
  if (invuln > 0) {
    invuln -= dt
    steve.visible = Math.floor(invuln * 10) % 2 === 0
    if (invuln <= 0) steve.visible = true
  }
}

function updateCreepers(dt) {
  for (const c of creepers) {
    c.timer -= dt
    if (c.timer <= 0) {
      if (Math.random() < 0.35) {
        c.heading = Math.atan2(steveZ - c.z, steveX - c.x) // soms richting Steve
      } else {
        c.heading = Math.random() * 6.28
      }
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
      c.timer = 0 // loopt tegen iets aan -> kies nieuwe richting
    }
    c.mesh.position.set(c.x, 0, c.z)
    c.mesh.rotation.y = Math.atan2(dx, -dz)
  }
}

function checkCollisions() {
  // diamanten oppakken
  for (const d of diamonds) {
    if (d.collected) continue
    const dx = d.x - steveX
    const dz = d.z - steveZ
    if (dx * dx + dz * dz < 0.45 * 0.45) {
      d.collected = true
      d.mesh.visible = false
      sfx.coin()
      updateHud()
      if (diamonds.every((q) => q.collected)) {
        win()
        return
      }
    }
  }
  // creeper-botsing
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

function hit() {
  hearts -= 1
  sfx.bonk()
  invuln = 1.3
  steveX = GRID / 2
  steveZ = GRID / 2
  steve.position.set(steveX, 0, steveZ)
  updateHud()
  if (hearts <= 0) lose()
}

function win() {
  status = 'won'
  sfx.win()
  showOverlay('Goed gedaan!', 'Je hebt alle diamanten gevonden!', 'Volgende ronde', () => {
    round += 1
    hearts = MAX_HEARTS
    buildWorld()
    status = 'playing'
    hideOverlay()
  })
}

function lose() {
  status = 'lost'
  showOverlay('Oeps!', 'De creepers hebben je te pakken. Probeer het nog een keer!', 'Opnieuw', () => {
    hearts = MAX_HEARTS
    buildWorld()
    status = 'playing'
    hideOverlay()
  })
}

// ---------- Camera volgt Steve ----------
const camLook = new THREE.Vector3(GRID / 2, 1.2, GRID / 2)
function updateCamera(dt) {
  const k = Math.min(1, dt * 4)
  camera.position.x += (steveX - camera.position.x) * k
  camera.position.z += (steveZ + 13 - camera.position.z) * k
  camera.position.y += (10 - camera.position.y) * k
  camLook.x += (steveX - camLook.x) * Math.min(1, dt * 6)
  camLook.z += (steveZ - camLook.z) * Math.min(1, dt * 6)
  camera.lookAt(camLook)
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
  for (let i = 0; i < MAX_HEARTS; i++) h += heartIcon(i < hearts)
  hud.hearts.innerHTML = h
  const got = diamonds.filter((d) => d.collected).length
  hud.diamonds.innerHTML = diamondIcon + '<span>' + got + '/' + totalDiamonds + '</span>'
  hud.level.textContent = 'Ronde ' + round
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
// veiligheidsnet: laat je los buiten een knop, stop dan met lopen
window.addEventListener('pointerup', () => {
  held.up = held.down = held.left = held.right = false
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
  }
  // diamanten draaien en zweven (ook op het startscherm, ziet er leuk uit)
  for (const d of diamonds) {
    if (d.collected) continue
    d.mesh.rotation.y += dt * 2.2
    d.mesh.position.y = d.baseY + Math.sin(now * 0.003 + d.phase) * 0.15
  }
  updateCamera(dt)
  renderer.render(scene, camera)
  requestAnimationFrame(frame)
}

// ---------- Start ----------
function init() {
  resize()
  updateMuteBtn()
  buildWorld() // wereld alvast tonen achter het startscherm
  status = 'start'
  showOverlay(
    'Diamant Wereld',
    'Loop met Steve door de wereld en pak alle diamanten. Pas op voor de creepers! Houd de knoppen ingedrukt om te lopen.',
    'Spelen',
    () => {
      round = 1
      hearts = MAX_HEARTS
      buildWorld()
      status = 'playing'
      hideOverlay()
    }
  )
  requestAnimationFrame(frame)
}

init()
