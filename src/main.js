import './style.css'
import * as THREE from 'three'
import { sfx, resumeAudio } from './sfx.js'
import { buildCity, CITIES } from './city.js'
import { makeCharacter, loadCfg, saveCfg, PARTS } from './character.js'
import { refresh, cachedTop, cachedTopScore, qualifies, submit } from './scores.js'
import { joinRoom, leaveRoom, sendState, sendFx, sendTag, makeCode, inRoom } from './multiplayer.js'

// =====================================================================
//  Diamant Haarlem - een 3D arcade-game in Minecraft-stijl.
//  Loop met je eigen popje door Haarlem, pak alle diamanten, ontwijk
//  de creepers, haal een highscore. Speelt zich af in Haarlem met
//  herkenningspunten zoals de Grote Kerk, Molen De Adriaan en de
//  Veronicaschool.
// =====================================================================

const GRID = 40
const MAX_HEARTS = 3
const STEVE_SPEED = 5.4
const TURN_SPEED = 2.4
const CREEPER_SPEED = 1.9
const BASE_DIAMONDS = 6
const BASE_CREEPERS = 2
const BASE_KIDS = 4
const START = { x: 21.5, z: 24.5 } // op de straat naast de Grote Markt
const START_YAW = 0 // kijk naar het noorden, de stad in
const TAG_TIME = 60
const HIDE_TIME = 90
const POWERS = {
  radar: { dur: 8, cd: 14, t: 0, cool: 0 },
  speed: { dur: 5, cd: 12, t: 0, cool: 0 },
  giant: { dur: 6, cd: 15, t: 0, cool: 0 },
}
const POWER_KEYS = ['radar', 'speed', 'giant']
let soundCool = 0
const MODE_LABEL = { diamond: 'DIAMANTEN', tag: 'TIKKERTJE', hide: 'VERSTOPPEN' }

// ---------- DOM ----------
const canvas = document.getElementById('game')
const hud = {
  level: document.getElementById('level'),
  hearts: document.getElementById('hearts'),
  timer: document.getElementById('timer'),
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
sun.shadow.mapSize.set(2048, 2048)
const sd = GRID * 0.62
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
let cityIndex = loadCity()
let world = buildCity(worldGroup, GRID, CITIES[cityIndex])
const roundGroup = new THREE.Group()
scene.add(roundGroup)

function loadCity() {
  try {
    const i = parseInt(localStorage.getItem('haarlem_stad') || '0', 10)
    return i >= 0 && i < CITIES.length ? i : 0
  } catch (e) {
    return 0
  }
}
function saveCity(i) {
  try {
    localStorage.setItem('haarlem_stad', String(i))
  } catch (e) {}
}
const cityKey = () => CITIES[cityIndex].key
function buildCurrentCity() {
  for (const child of [...worldGroup.children]) {
    worldGroup.remove(child)
    child.traverse((o) => {
      if (o.isMesh && o.geometry) o.geometry.dispose()
    })
  }
  world = buildCity(worldGroup, GRID, CITIES[cityIndex])
  shownFacts = new Set()
}

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

// podium onder het popje in het maak-scherm
const podium = new THREE.Mesh(
  new THREE.CylinderGeometry(1.1, 1.35, 0.25, 28),
  new THREE.MeshLambertMaterial({ color: 0x2a3650 })
)
podium.position.set(0, -0.125, 0)
podium.receiveShadow = true
podium.visible = false
scene.add(podium)

// radar-baken: lichtbundel boven het dichtstbijzijnde doel
const radarBeacon = new THREE.Mesh(
  new THREE.BoxGeometry(0.35, 7, 0.35),
  new THREE.MeshBasicMaterial({ color: 0xff3b6b, transparent: true, opacity: 0.85 })
)
radarBeacon.visible = false
scene.add(radarBeacon)

// ---------- Spelstatus ----------
let status = 'intro' // 'intro' | 'creator' | 'playing' | 'gameover'
let score = 0
let lives = MAX_HEARTS
let round = 1
let steveX = START.x
let steveZ = START.z
let walkPhase = 0
let yaw = Math.PI // kijkrichting (radialen); PI = naar het zuiden
let faceX = 0
let faceZ = -1
let invuln = 0
let pendingScore = 0
let mode = 'diamond' // 'diamond' | 'tag' | 'hide'
let diamonds = []
let creepers = []
let npcs = []
let totalDiamonds = 0
let totalKids = 0
let timeLeft = 0
// multiplayer
const mpId = 'p' + Math.floor(Math.random() * 1e9).toString(36)
let mpPlayers = {} // id -> { name, cfg, mesh, tag, x, z, tx, tz, yaw, phase, points }
let currentIt = null
let myPoints = 0
let mpCode = null
let mpCitySynced = false
let stateThrottle = 0
let tagCool = 0
const itMarker = new THREE.Mesh(
  new THREE.ConeGeometry(0.45, 0.8, 4),
  new THREE.MeshBasicMaterial({ color: 0xff2e63 })
)
itMarker.visible = false
scene.add(itMarker)
let playerName = loadName()
let nameTag = null
let shownFacts = new Set()
const FACT_RADIUS = 2.7

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

// vriendjes-popjes (NPC's) voor tikkertje en verstoppertje
function randomCfg() {
  const c = {}
  for (const p of PARTS) c[p.key] = (Math.random() * p.options.length) | 0
  return c
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
  npcs = []
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
function hiddenCell(taken) {
  for (let tries = 0; tries < 400; tries++) {
    const c = freeCell(taken)
    if (!c) return null
    const cx = Math.floor(c.x)
    const cz = Math.floor(c.z)
    if (cellSolid(cx + 1, cz) || cellSolid(cx - 1, cz) || cellSolid(cx, cz + 1) || cellSolid(cx, cz - 1)) return c
    taken.delete(cx + ',' + cz)
  }
  return freeCell(taken)
}
function buildRound() {
  clearRound()
  const taken = new Set()
  if (mode === 'diamond') {
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
  } else {
    totalKids = BASE_KIDS + (round - 1)
    for (let i = 0; i < totalKids; i++) {
      const c = mode === 'hide' ? hiddenCell(taken) : freeCell(taken)
      if (!c) continue
      const m = makeCharacter(randomCfg())
      m.position.set(c.x, 0, c.z)
      roundGroup.add(m)
      npcs.push({ mesh: m, x: c.x, z: c.z, heading: Math.random() * 6.28, timer: 0, phase: 0, caught: false })
    }
    timeLeft = mode === 'tag' ? TAG_TIME : HIDE_TIME
  }
  steveX = START.x
  steveZ = START.z
  player.position.set(steveX, 0, steveZ)
  player.rotation.y = 0
  player.visible = false // first person: je eigen popje zie je niet
  invuln = 0
  yaw = START_YAW
  faceX = Math.sin(yaw)
  faceZ = -Math.cos(yaw)
  camera.fov = 70
  camera.updateProjectionMatrix()
  firstPersonCam()
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
  // tank-besturing: links/rechts = draaien, omhoog = vooruit, omlaag = achteruit
  const turn = (held.right ? 1 : 0) - (held.left ? 1 : 0)
  const fwd = (held.up ? 1 : 0) - (held.down ? 1 : 0)
  yaw += turn * TURN_SPEED * dt
  faceX = Math.sin(yaw)
  faceZ = -Math.cos(yaw)
  const u = player.userData
  if (fwd !== 0) {
    const boost = (POWERS.speed.t > 0 ? 1.95 : 1) * (POWERS.giant.t > 0 ? 1.45 : 1)
    const sp = STEVE_SPEED * boost * dt * (fwd > 0 ? 1 : 0.6) // achteruit iets langzamer
    moveSteve(faceX * fwd * sp, faceZ * fwd * sp)
    walkPhase += dt * 11
    const sw = Math.sin(walkPhase) * 0.6
    u.lLeg.rotation.x = sw
    u.rLeg.rotation.x = -sw
    u.lArm.rotation.x = -sw
    u.rArm.rotation.x = sw
  } else {
    u.lLeg.rotation.x *= 0.7
    u.rLeg.rotation.x *= 0.7
    u.lArm.rotation.x *= 0.7
    u.rArm.rotation.x *= 0.7
  }
  player.position.set(steveX, 0, steveZ)
  player.rotation.y = yaw
  if (invuln > 0) invuln -= dt
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
function updateNPCs(dt) {
  for (const n of npcs) {
    if (n.caught) continue
    if (mode === 'tag') {
      const dx = n.x - steveX
      const dz = n.z - steveZ
      const dist = Math.hypot(dx, dz)
      let mvx, mvz
      if (dist < 6 && dist > 0.001) {
        mvx = dx / dist
        mvz = dz / dist // wegrennen van de speler
      } else {
        n.timer -= dt
        if (n.timer <= 0) {
          n.heading = Math.random() * 6.28
          n.timer = 1 + Math.random() * 1.5
        }
        mvx = Math.cos(n.heading)
        mvz = Math.sin(n.heading)
      }
      const sp = STEVE_SPEED * 0.62 * dt
      const nx = clamp(n.x + mvx * sp, 0.6, GRID - 0.6)
      if (!cellSolid(nx, n.z)) n.x = nx
      const nz = clamp(n.z + mvz * sp, 0.6, GRID - 0.6)
      if (!cellSolid(n.x, nz)) n.z = nz
      n.mesh.rotation.y = Math.atan2(mvx, -mvz)
      n.phase += dt * 10
      const sw = Math.sin(n.phase) * 0.6
      n.mesh.userData.lLeg.rotation.x = sw
      n.mesh.userData.rLeg.rotation.x = -sw
      n.mesh.userData.lArm.rotation.x = -sw
      n.mesh.userData.rArm.rotation.x = sw
      n.mesh.position.set(n.x, Math.abs(Math.sin(n.phase)) * 0.05, n.z)
    } else {
      n.phase += dt * 2
      n.mesh.position.y = Math.abs(Math.sin(n.phase)) * 0.03
    }
  }
}
function checkCollisions() {
  if (mode === 'diamond') {
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
  } else {
    for (const n of npcs) {
      if (n.caught) continue
      const dx = n.x - steveX
      const dz = n.z - steveZ
      if (dx * dx + dz * dz < 0.7 * 0.7) {
        n.caught = true
        n.mesh.visible = false
        score += mode === 'tag' ? 150 : 200
        sfx.coin()
        showToast(mode === 'tag' ? 'Getikt!' : 'Gevonden!')
        updateHud()
        if (npcs.every((q) => q.caught)) {
          roundClear()
          return
        }
      }
    }
  }
}
function roundClear() {
  round += 1
  score += mode === 'diamond' ? 250 : 300
  sfx.win()
  showToast('RONDE ' + round)
  buildRound()
}

// ---------- Power-ups + scheet/boer ----------
function activatePower(key) {
  if (status !== 'playing') return
  const p = POWERS[key]
  if (p.cool > 0 || p.t > 0) return
  p.t = p.dur
  p.cool = p.cd
  resumeAudio()
  sfx.power()
  // (later: ook naar je vriendjes sturen)
}
function nearestTarget() {
  const arr =
    mode === 'mp'
      ? Object.values(mpPlayers)
      : mode === 'diamond'
        ? diamonds.filter((d) => !d.collected)
        : npcs.filter((n) => !n.caught)
  let best = null
  let bd = Infinity
  for (const t of arr) {
    const dx = t.x - steveX
    const dz = t.z - steveZ
    const d = dx * dx + dz * dz
    if (d < bd) {
      bd = d
      best = t
    }
  }
  return best
}
function updateRadar() {
  let show = false
  if (status === 'playing' && POWERS.radar.t > 0) {
    const t = nearestTarget()
    if (t) {
      radarBeacon.position.set(t.x, 3.4, t.z)
      show = true
    }
  }
  radarBeacon.visible = show
}
function updateActionButtons() {
  for (const k of POWER_KEYS) {
    const b = actionBtns[k]
    if (!b) continue
    b.classList.toggle('cooling', POWERS[k].cool > 0)
    b.classList.toggle('active', POWERS[k].t > 0)
  }
}
function playSocial(which) {
  if (soundCool > 0) return
  soundCool = 0.7
  resumeAudio()
  if (which === 'fart') sfx.fart()
  else sfx.burp()
  if (inRoom()) sendFx(which) // naar je vriendjes
}

// ---------- Multiplayer ----------
function mpProfile() {
  return { id: mpId, name: playerName || 'Speler', cfg: playerCfg, city: cityKey() }
}
function startMultiplayer(code, isCreator) {
  resumeAudio()
  mpCode = code
  mpCitySynced = isCreator
  currentIt = isCreator ? mpId : null
  myPoints = 0
  clearRemotes()
  if (isCreator) buildCurrentCity()
  mode = 'mp'
  status = 'playing'
  setSceneVisible(true)
  setChrome(true)
  hideAllScreens()
  hideFact()
  shownFacts = new Set()
  setCharacter(playerCfg)
  clearRound()
  steveX = START.x
  steveZ = START.z
  yaw = START_YAW
  faceX = Math.sin(yaw)
  faceZ = -Math.cos(yaw)
  player.visible = false
  for (const k of POWER_KEYS) {
    POWERS[k].t = 0
    POWERS[k].cool = 0
  }
  soundCool = 0
  tagCool = 1
  radarBeacon.visible = false
  camera.fov = 70
  camera.updateProjectionMatrix()
  firstPersonCam()
  $('mpCode').textContent = 'Code: ' + code
  $('mpbar').style.display = 'flex'
  document.getElementById('hud').style.display = 'none'
  updateScoreboard()
  joinRoom(code, mpProfile(), { onState: mpOnState, onFx: mpOnFx, onTag: mpOnTag, onPresence: mpOnPresence }).then((ok) => {
    if (!ok) showToast('Verbinden mislukt - check je internet')
  })
}
function stopMultiplayer() {
  leaveRoom()
  clearRemotes()
  mpCode = null
  mode = 'diamond'
  $('mpbar').style.display = 'none'
  document.getElementById('hud').style.display = ''
  showIntro()
}
function clearRemotes() {
  for (const id in mpPlayers) removeRemote(id)
  mpPlayers = {}
  itMarker.visible = false
}
function addRemote(meta) {
  const mesh = makeCharacter(meta.cfg || {})
  mesh.position.set(START.x, 0, START.z)
  scene.add(mesh)
  const tag = makeTagSprite(meta.name || 'Speler')
  scene.add(tag)
  mpPlayers[meta.id] = { name: meta.name || 'Speler', mesh, tag, x: START.x, z: START.z, tx: START.x, tz: START.z, yaw: 0, phase: 0, points: 0 }
}
function removeRemote(id) {
  const rp = mpPlayers[id]
  if (!rp) return
  scene.remove(rp.mesh)
  scene.remove(rp.tag)
  delete mpPlayers[id]
}
function updateRemote(rp, dt) {
  const k = Math.min(1, dt * 10)
  const ox = rp.x
  const oz = rp.z
  rp.x += (rp.tx - rp.x) * k
  rp.z += (rp.tz - rp.z) * k
  const moved = Math.hypot(rp.x - ox, rp.z - oz)
  rp.mesh.position.set(rp.x, 0, rp.z)
  rp.mesh.rotation.y = rp.yaw
  const u = rp.mesh.userData
  if (moved > 0.002) {
    rp.phase += dt * 11
    const sw = Math.sin(rp.phase) * 0.6
    u.lLeg.rotation.x = sw
    u.rLeg.rotation.x = -sw
    u.lArm.rotation.x = -sw
    u.rArm.rotation.x = sw
  }
  rp.tag.position.set(rp.x, 2.9, rp.z)
}
function mpOnState(p) {
  if (!p || p.id === mpId) return
  const rp = mpPlayers[p.id]
  if (!rp) return
  rp.tx = p.x
  rp.tz = p.z
  rp.yaw = p.yaw
  if (p.it) currentIt = p.id
}
function mpOnFx(p) {
  if (!p || p.id === mpId) return
  if (p.kind === 'fart') sfx.fart()
  else sfx.burp()
  const rp = mpPlayers[p.id]
  showToast((rp ? rp.name : 'Iemand') + (p.kind === 'fart' ? ' deed een scheet!' : ' liet een boer!'))
}
function mpOnTag(p) {
  if (!p) return
  currentIt = p.to
  if (p.from === mpId) myPoints += 1
  else if (mpPlayers[p.from]) mpPlayers[p.from].points += 1
  const fromName = p.from === mpId ? playerName || 'Jij' : mpPlayers[p.from] ? mpPlayers[p.from].name : 'Iemand'
  const toName = p.to === mpId ? playerName || 'jou' : mpPlayers[p.to] ? mpPlayers[p.to].name : 'iemand'
  showToast(fromName + ' tikte ' + toName + '!')
  tagCool = 1.5
  updateScoreboard()
}
function mpOnPresence(state) {
  const present = {}
  for (const key in state) {
    for (const meta of state[key]) {
      if (!meta || !meta.id) continue
      present[meta.id] = meta
      if (meta.id === mpId) continue
      if (!mpPlayers[meta.id]) addRemote(meta)
    }
  }
  for (const id in mpPlayers) if (!present[id]) removeRemote(id)
  if (!mpCitySynced) {
    for (const id in present) {
      if (id === mpId) continue
      if (present[id].city) {
        adoptCity(present[id].city)
        mpCitySynced = true
        break
      }
    }
  }
  updateScoreboard()
}
function adoptCity(ck) {
  const idx = CITIES.findIndex((c) => c.key === ck)
  if (idx >= 0 && idx !== cityIndex) {
    cityIndex = idx
    buildCurrentCity()
  }
}
function updateScoreboard() {
  const rows = [{ name: (playerName || 'Jij') + ' (jij)', points: myPoints, it: currentIt === mpId }]
  for (const id in mpPlayers) rows.push({ name: mpPlayers[id].name, points: mpPlayers[id].points, it: currentIt === id })
  rows.sort((a, b) => b.points - a.points)
  $('scoreboard').innerHTML = rows
    .map((r) => '<div class="sb-row' + (r.it ? ' it' : '') + '">' + (r.it ? '(TIK) ' : '') + r.name + ' <b>' + r.points + '</b></div>')
    .join('')
}
function updateMultiplayer(dt) {
  stateThrottle -= dt
  if (stateThrottle <= 0) {
    stateThrottle = 0.08
    sendState({ x: +steveX.toFixed(2), z: +steveZ.toFixed(2), yaw: +yaw.toFixed(2), it: currentIt === mpId })
  }
  for (const id in mpPlayers) updateRemote(mpPlayers[id], dt)
  if (tagCool > 0) tagCool -= dt
  if (currentIt === mpId && tagCool <= 0) {
    for (const id in mpPlayers) {
      const rp = mpPlayers[id]
      const dx = rp.x - steveX
      const dz = rp.z - steveZ
      if (dx * dx + dz * dz < 0.95 * 0.95) {
        sendTag(id)
        mpOnTag({ from: mpId, to: id })
        break
      }
    }
  }
  if (currentIt && currentIt !== mpId && mpPlayers[currentIt]) {
    const rp = mpPlayers[currentIt]
    itMarker.visible = true
    itMarker.position.set(rp.x, 3.3, rp.z)
    itMarker.rotation.y += dt * 2
  } else {
    itMarker.visible = false
  }
}
function showLobby() {
  resumeAudio()
  status = 'lobby'
  setSceneVisible(true)
  setChrome(false)
  player.visible = false
  setOverviewCam()
  hideAllScreens()
  hideFact()
  $('roomInput').value = ''
  $('lobby').classList.add('show')
}
function hit() {
  lives -= 1
  sfx.bonk()
  invuln = 1.3
  steveX = START.x
  steveZ = START.z
  yaw = START_YAW
  faceX = Math.sin(yaw)
  faceZ = -Math.cos(yaw)
  player.position.set(steveX, 0, steveZ)
  showHitFlash()
  updateHud()
  if (lives <= 0) showGameOver()
}
let hitTimer = null
function showHitFlash() {
  const el = $('hitflash')
  el.classList.add('show')
  if (hitTimer) clearTimeout(hitTimer)
  hitTimer = setTimeout(() => el.classList.remove('show'), 350)
}

// ---------- Camera ----------
// First person: de camera staat op ooghoogte op de speler en kijkt mee in de
// looprichting, zodat je echt door de straten van Haarlem loopt.
function firstPersonCam() {
  const eye = POWERS.giant.t > 0 ? 4.8 : 1.6 // als reus kijk je over de huizen heen
  const dip = POWERS.giant.t > 0 ? 2.4 : 0.4
  camera.position.set(steveX, eye, steveZ)
  camera.lookAt(steveX + faceX * 2, eye - dip, steveZ + faceZ * 2)
}
function setOverviewCam() {
  camera.fov = 55
  camera.updateProjectionMatrix()
  camera.position.set(GRID / 2, 13, GRID + 9)
  camera.lookAt(GRID / 2, 2, GRID / 2)
}
function setCreatorCam() {
  // kader het hele popje groot in de open ruimte boven het keuzepaneel
  camera.fov = 46
  camera.updateProjectionMatrix()
  camera.position.set(0, 1.35, 5.4)
  camera.lookAt(0, 0.7, 0)
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
const kidIcon =
  '<svg viewBox="0 0 24 24" class="icon"><circle cx="12" cy="7" r="3.4" fill="#ffd166"/><path d="M5 21c0-4 3.4-6.5 7-6.5s7 2.5 7 6.5z" fill="#36d6e7"/></svg>'
function fmtTime(t) {
  const s = Math.max(0, Math.ceil(t))
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0')
}
function updateHud() {
  const isD = mode === 'diamond'
  hud.hearts.style.display = isD ? 'flex' : 'none'
  hud.timer.style.display = isD ? 'none' : 'flex'
  if (isD) {
    let h = ''
    for (let i = 0; i < MAX_HEARTS; i++) h += heartIcon(i < lives)
    hud.hearts.innerHTML = h
    const got = diamonds.filter((d) => d.collected).length
    hud.diamonds.innerHTML = diamondIcon + '<span>' + got + '/' + totalDiamonds + '</span>'
  } else {
    const got = npcs.filter((n) => n.caught).length
    hud.diamonds.innerHTML = kidIcon + '<span>' + got + '/' + totalKids + '</span>'
    hud.timer.textContent = fmtTime(timeLeft)
  }
  hud.score.textContent = String(score).padStart(5, '0')
  hud.level.textContent = MODE_LABEL[mode] + ' R' + round
}

// ---------- Schermen ----------
function hideAllScreens() {
  $('intro').classList.remove('show')
  $('creator').classList.remove('show')
  $('gameover').classList.remove('show')
  $('cityscreen').classList.remove('show')
  $('lobby').classList.remove('show')
}
function setSceneVisible(v) {
  ground.visible = v
  worldGroup.visible = v
  roundGroup.visible = v
}
function setChrome(v) {
  // HUD + bedieningsknoppen alleen tijdens het spelen tonen
  const vis = v ? 'visible' : 'hidden'
  document.getElementById('hud').style.visibility = vis
  document.getElementById('controls').style.visibility = vis
  document.getElementById('actions').style.visibility = vis
}
function showIntro() {
  status = 'intro'
  setSceneVisible(true)
  setChrome(false)
  $('mpbar').style.display = 'none'
  document.getElementById('hud').style.display = ''
  player.visible = false
  setOverviewCam()
  hideAllScreens()
  hideFact()
  $('introHi').textContent = cachedTopScore()
  $('introGreeting').textContent = playerName ? 'Hoi, ' + playerName + '!' : ''
  $('introCity').textContent = CITIES[cityIndex].name
  $('intro').classList.add('show')
  refresh(cityKey()).then(() => {
    if (status === 'intro') $('introHi').textContent = cachedTopScore()
  })
}
function showCityPicker() {
  resumeAudio()
  status = 'citypick'
  setSceneVisible(true)
  setChrome(false)
  player.visible = false
  setOverviewCam()
  hideAllScreens()
  hideFact()
  buildCityButtons()
  $('cityscreen').classList.add('show')
}
function buildCityButtons() {
  const wrap = $('cityButtons')
  wrap.innerHTML = ''
  CITIES.forEach((c, i) => {
    const b = document.createElement('button')
    b.className = 'arcade-btn' + (i === cityIndex ? '' : ' alt')
    b.textContent = c.name.toUpperCase()
    b.onclick = () => {
      cityIndex = i
      saveCity(i)
      buildCurrentCity()
      showIntro()
    }
    wrap.appendChild(b)
  })
}
function startGame(m) {
  mode = m || 'diamond'
  if (inRoom()) {
    leaveRoom()
    clearRemotes()
  }
  $('mpbar').style.display = 'none'
  document.getElementById('hud').style.display = ''
  resumeAudio()
  sfx.start()
  status = 'playing'
  setSceneVisible(true)
  setChrome(true)
  hideAllScreens()
  hideFact()
  shownFacts = new Set()
  score = 0
  lives = MAX_HEARTS
  round = 1
  for (const k of POWER_KEYS) {
    POWERS[k].t = 0
    POWERS[k].cool = 0
  }
  soundCool = 0
  radarBeacon.visible = false
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
  $('nameInput').value = playerName
  buildCreatorUI()
  player.visible = true
  player.position.set(0, 0, 0)
  player.rotation.y = Math.PI // begin met je gezicht naar de camera
  setCreatorCam()
}
function exitCreator() {
  playerName = ($('nameInput').value || '').trim().slice(0, 10)
  saveName(playerName)
  saveCfg(playerCfg)
  updateNameTag()
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
  hideFact()
  $('finalScore').textContent = score
  const box = $('initialsBox')
  if (qualifies(score)) {
    box.classList.add('show')
    $('initialsInput').value = playerName
    setTimeout(() => $('initialsInput').focus(), 120)
  } else {
    box.classList.remove('show')
  }
  renderHiTable(cachedTop())
  refresh(cityKey()).then(() => {
    if (status === 'gameover') renderHiTable(cachedTop())
  })
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
  for (const part of PARTS) {
    const row = document.createElement('div')
    row.className = 'creator-row'
    const lab = document.createElement('span')
    lab.className = 'creator-label'
    lab.textContent = part.label
    row.appendChild(lab)
    const sw = document.createElement('div')
    sw.className = 'swatches'
    part.options.forEach((val, idx) => {
      const b = document.createElement('button')
      b.className = 'swatch'
      if (part.type === 'text') {
        b.classList.add('txt')
        b.textContent = val
      } else if (val === 'geen') {
        b.classList.add('none')
        b.textContent = 'geen'
      } else {
        b.style.background = val
      }
      if (idx === playerCfg[part.key]) b.classList.add('sel')
      b.onclick = () => {
        playerCfg[part.key] = idx
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

// ---------- Naam ----------
function loadName() {
  try {
    return localStorage.getItem('haarlem_naam') || ''
  } catch (e) {
    return ''
  }
}
function saveName(n) {
  try {
    localStorage.setItem('haarlem_naam', n)
  } catch (e) {}
}
function makeTagSprite(text) {
  const fs = 30
  const c = document.createElement('canvas')
  let x = c.getContext('2d')
  x.font = 'bold ' + fs + 'px Trebuchet MS, Arial, sans-serif'
  c.width = Math.ceil(x.measureText(text).width) + 24
  c.height = fs + 18
  x = c.getContext('2d')
  x.font = 'bold ' + fs + 'px Trebuchet MS, Arial, sans-serif'
  const w = c.width
  const h = c.height
  const r = 10
  x.fillStyle = 'rgba(255,79,163,0.92)'
  x.beginPath()
  x.moveTo(r, 0)
  x.arcTo(w, 0, w, h, r)
  x.arcTo(w, h, 0, h, r)
  x.arcTo(0, h, 0, 0, r)
  x.arcTo(0, 0, w, 0, r)
  x.closePath()
  x.fill()
  x.fillStyle = '#fff'
  x.textAlign = 'center'
  x.textBaseline = 'middle'
  x.fillText(text, w / 2, h / 2 + 1)
  const tex = new THREE.CanvasTexture(c)
  tex.minFilter = THREE.LinearFilter
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }))
  spr.renderOrder = 998
  const a = c.width / c.height
  spr.scale.set(0.55 * a, 0.55, 1)
  return spr
}
function updateNameTag() {
  if (nameTag) {
    scene.remove(nameTag)
    nameTag = null
  }
  if (playerName) {
    nameTag = makeTagSprite(playerName)
    scene.add(nameTag)
  }
}

// ---------- Haarlem-weetje ----------
let factTimer = null
function showFact(name, text) {
  $('factName').textContent = name
  $('factText').textContent = text
  $('factcard').classList.add('show')
  sfx.fact()
  if (factTimer) clearTimeout(factTimer)
  factTimer = setTimeout(() => $('factcard').classList.remove('show'), 6500)
}
function hideFact() {
  $('factcard').classList.remove('show')
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
$('btnDiamond').addEventListener('click', () => startGame('diamond'))
$('btnTag').addEventListener('click', () => startGame('tag'))
$('btnHide').addEventListener('click', () => startGame('hide'))
$('btnCreator').addEventListener('click', showCreator)
$('btnCity').addEventListener('click', showCityPicker)
$('btnCityBack').addEventListener('click', showIntro)
$('btnCreatorDone').addEventListener('click', exitCreator)
$('btnRestart').addEventListener('click', showIntro)
$('btnSaveScore').addEventListener('click', () => {
  let name = ($('initialsInput').value || '').trim().slice(0, 10)
  if (!name) name = 'SPELER'
  playerName = name
  saveName(name)
  updateNameTag()
  submit(name, pendingScore, cityKey()).then((top) => renderHiTable(top))
  $('initialsBox').classList.remove('show')
})
$('nameInput').addEventListener('input', (e) => {
  playerName = e.target.value.trim().slice(0, 10)
  updateNameTag()
})

// power-up + scheet/boer knoppen
const actionBtns = { radar: $('btnRadar'), speed: $('btnSpeed'), giant: $('btnGiant') }
$('btnRadar').addEventListener('click', () => activatePower('radar'))
$('btnSpeed').addEventListener('click', () => activatePower('speed'))
$('btnGiant').addEventListener('click', () => activatePower('giant'))
$('btnFart').addEventListener('click', () => playSocial('fart'))
$('btnBurp').addEventListener('click', () => playSocial('burp'))

// multiplayer
$('btnMulti').addEventListener('click', showLobby)
$('btnMakeRoom').addEventListener('click', () => startMultiplayer(makeCode(), true))
$('btnJoinRoom').addEventListener('click', () => {
  const code = ($('roomInput').value || '').trim().toUpperCase()
  if (code.length >= 3) startMultiplayer(code, false)
})
$('btnLobbyBack').addEventListener('click', showIntro)
$('btnStop').addEventListener('click', stopMultiplayer)

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
  world.update(dt) // molenwieken + auto's draaien altijd
  if (status === 'playing') {
    updatePlayer(dt)
    if (mode === 'mp') {
      updateMultiplayer(dt)
    } else if (mode === 'diamond') {
      updateCreepers(dt)
      checkCollisions()
    } else {
      updateNPCs(dt)
      checkCollisions()
    }
    for (const k of POWER_KEYS) {
      const p = POWERS[k]
      if (p.t > 0) p.t -= dt
      if (p.cool > 0) p.cool -= dt
    }
    if (soundCool > 0) soundCool -= dt
    updateActionButtons()
    if (status === 'playing' && (mode === 'tag' || mode === 'hide')) {
      timeLeft -= dt
      hud.timer.textContent = fmtTime(timeLeft)
      if (timeLeft <= 0) {
        if (mode === 'tag') showToast('Te laat! De kinderen kregen een punt')
        showGameOver()
      }
    }
    if (status === 'playing') {
      for (const d of diamonds) {
        if (d.collected) continue
        d.mesh.rotation.y += dt * 2.2
        d.mesh.position.y = d.baseY + Math.sin(now * 0.003 + d.phase) * 0.15
      }
      for (const lm of world.landmarks) {
        if (shownFacts.has(lm.name)) continue
        const dx = lm.x - steveX
        const dz = lm.z - steveZ
        if (dx * dx + dz * dz < FACT_RADIUS * FACT_RADIUS) {
          shownFacts.add(lm.name)
          showFact(lm.name, lm.fact)
          break // maar één weetje tegelijk
        }
      }
      firstPersonCam()
    }
  } else if (status === 'creator') {
    player.rotation.y += dt * 0.8
  }
  podium.visible = status === 'creator'
  updateRadar()
  if (nameTag) {
    const show = player.visible && (status === 'playing' || status === 'creator')
    nameTag.visible = show
    if (show) nameTag.position.set(player.position.x, player.position.y + 2.9, player.position.z)
  }
  renderer.render(scene, camera)
  requestAnimationFrame(frame)
}

// ---------- Start ----------
function init() {
  resize()
  updateMuteBtn()
  updateNameTag()
  showIntro()
  requestAnimationFrame(frame)
}
init()
