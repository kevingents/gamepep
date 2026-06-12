import './style.css'
import * as THREE from 'three'
import { sfx, resumeAudio } from './sfx.js'
import { buildCity, CITIES } from './city.js'
import { makeCharacter, loadCfg, saveCfg, PARTS } from './character.js'
import { refresh, cachedTop, cachedTopScore, qualifies, submit } from './scores.js'
import { joinRoom, leaveRoom, sendState, sendFx, sendTag, makeCode, inRoom } from './multiplayer.js'
import { createSky } from './sky.js'
import { getPid, fetchHouses, claimHouse, ringBell, fetchRings } from './social.js'
import { nextQuestion } from './edu.js'
import { ADDONS, FLY_KEYS, SPEED_KEYS, getCoins, addCoins, getOwned, owns, buy, getActive, setActive } from './store.js'

// =====================================================================
//  Diamant Haarlem - een 3D arcade-game in Minecraft-stijl.
//  Loop met je eigen popje door Haarlem, pak alle diamanten, ontwijk
//  de creepers, haal een highscore. Speelt zich af in Haarlem met
//  herkenningspunten zoals de Grote Kerk, Molen De Adriaan en de
//  Veronicaschool.
// =====================================================================

const GRID = 160
const ROAD_STEP = 14
const MAX_HEARTS = 3
const STEVE_SPEED = 6.0
const TURN_SPEED = 2.4
const CREEPER_SPEED = 2.1
const BASE_DIAMONDS = 10
const BASE_CREEPERS = 3
const BASE_KIDS = 5
const START = (() => {
  // een straat-kruising dicht bij het centrum (kruisingen zijn altijd vrij)
  const r1 = Math.round((GRID * 0.5) / ROAD_STEP) * ROAD_STEP
  const r2 = Math.round((GRID * 0.62) / ROAD_STEP) * ROAD_STEP
  return { x: r1 + 0.5, z: r2 + 0.5 }
})()
const START_YAW = 0 // kijk naar het noorden, de stad in
const TAG_TIME = 60
const HIDE_TIME = 90
const CHAR_SCALE = 0.62 // popjes zijn kleiner dan de huizen (kind-formaat)
const POWERS = {
  radar: { dur: 8, t: 0, count: 0, color: 0x36d6e7 },
  speed: { dur: 5, t: 0, count: 0, color: 0xffd166 },
  giant: { dur: 6, t: 0, count: 0, color: 0xff4fa3 },
}
const POWER_KEYS = ['radar', 'speed', 'giant']
const POWER_NAME = { radar: 'een radar', speed: 'supersnel', giant: 'een reus' }
const POWER_FOUND = { radar: 'Radar gevonden!', speed: 'Supersnel gevonden!', giant: 'Reus gevonden!' }
let powerups = [] // op te pakken items in de wereld
let soundCool = 0
const IS_TOUCH = 'ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0
let hintShown = false
const MODE_LABEL = { diamond: 'DIAMANTEN', tag: 'TIKKERTJE', hide: 'VERSTOPPEN', baby: 'EETBABY' }

// ---------- DOM ----------
const canvas = document.getElementById('game')
const hud = {
  level: document.getElementById('level'),
  hearts: document.getElementById('hearts'),
  timer: document.getElementById('timer'),
  score: document.getElementById('score'),
  diamonds: document.getElementById('diamonds'),
  coins: document.getElementById('coins'),
}
const coinIcon =
  '<svg viewBox="0 0 24 24" class="icon"><circle cx="12" cy="12" r="9" fill="#ffd700" stroke="#b8992a" stroke-width="2"/><text x="12" y="16" font-size="11" font-weight="bold" text-anchor="middle" fill="#8a6a00">€</text></svg>'
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
scene.fog = new THREE.Fog(0x9fd6ff, GRID * 1.2, GRID * 3.4)

const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200)
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap

const amb = new THREE.AmbientLight(0xbfd4ff, 0.62)
scene.add(amb)
const sun = new THREE.DirectionalLight(0xfff2dc, 1.0)
sun.position.set(GRID / 2 + 30, 60, GRID / 2 + 18)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
const sd = 28 // schaduw-gebied rond de speler (blijft scherp in een grote stad)
sun.shadow.camera.left = -sd
sun.shadow.camera.right = sd
sun.shadow.camera.top = sd
sun.shadow.camera.bottom = -sd
sun.shadow.camera.near = 1
sun.shadow.camera.far = 140
sun.shadow.bias = -0.0004
sun.target.position.set(GRID / 2, 0, GRID / 2)
scene.add(sun, sun.target)
function updateSunShadow(cx, cz) {
  sun.position.set(cx + 30, 60, cz + 18)
  sun.target.position.set(cx, 0, cz)
  sun.target.updateMatrixWorld()
}

const groundMats = [mat.dirt, mat.dirt, mat.grass, mat.dirt, mat.dirt, mat.dirt]
const ground = new THREE.Mesh(new THREE.BoxGeometry(GRID, 1, GRID), groundMats)
ground.position.set(GRID / 2, -0.5, GRID / 2)
ground.receiveShadow = true
scene.add(ground)

// lucht en weer: wolken, vogels, vliegtuig, af en toe regen
const sky = createSky(scene, GRID, sun, amb)
let isRaining = false
sky.onRain = (r) => {
  isRaining = r
  if (r && sfx.enabled) sfx.rainStart()
  if (!r) sfx.rainStop()
}

// ---------- Haarlem ----------
const worldGroup = new THREE.Group()
scene.add(worldGroup)
let cityIndex = loadCity()
let world = buildCity(worldGroup, GRID, CITIES[cityIndex])
Object.assign(START, world.start) // elke stad heeft zijn eigen startplek (Haarlem: de Grote Markt)
const roundGroup = new THREE.Group()
scene.add(roundGroup)

// ---------- Huisjes van de klas: kies een huis in het spel en bel bij elkaar aan ----------
// (geen echte adressen - alleen spel-coordinaten, veilig voor kinderen)
const myPid = getPid()
const housesGroup = new THREE.Group()
scene.add(housesGroup)
let houseByCell = new Map()
let myHouseHere = false
let nearHouse = null
let bellScanT = 0
async function refreshHouses() {
  const rows = await fetchHouses(CITIES[cityIndex].key)
  houseByCell = new Map()
  myHouseHere = false
  for (const child of [...housesGroup.children]) housesGroup.remove(child)
  for (const h of rows) {
    houseByCell.set(h.cx + ',' + h.cz, h)
    if (h.pid === myPid) myHouseHere = true
    const tag = makeTagSprite(h.name || 'Iemand')
    tag.position.set(h.cx + 0.5, 2.3, h.cz + 0.5)
    housesGroup.add(tag)
  }
}
function scanBell() {
  nearHouse = null
  if (status === 'playing' && world.houses) {
    const px = Math.floor(steveX)
    const pz = Math.floor(steveZ)
    let best = null
    let bd = 99
    for (let ox = -1; ox <= 1; ox++)
      for (let oz = -1; oz <= 1; oz++) {
        const k = px + ox + ',' + (pz + oz)
        if (!world.houses.has(k)) continue
        const d = Math.abs(ox) + Math.abs(oz)
        if (d < bd) {
          bd = d
          best = k
        }
      }
    if (best) nearHouse = { key: best, owner: houseByCell.get(best) || null }
  }
  const btn = $('btnBell')
  if (!nearHouse) {
    btn.style.display = 'none'
    return
  }
  const o = nearHouse.owner
  btn.style.display = 'block'
  if (o && o.pid === myPid) btn.textContent = 'JOUW HUIS'
  else if (o) btn.textContent = 'BEL AAN BIJ ' + (o.name || '?').toUpperCase()
  else btn.textContent = myHouseHere ? 'VERHUIS HIERHEEN' : 'WOON HIER'
}
// sta je bij de school? toon de knop om een spel/quiz/winkel te kiezen
function scanSchool() {
  const btn = $('btnSchool')
  if (status !== 'playing' || mode !== 'vrij') {
    nearSchool = false
    btn.style.display = 'none'
    return
  }
  const school = world.landmarks.find((l) => l.name === 'Veronicaschool')
  if (!school) {
    btn.style.display = 'none'
    return
  }
  const dx = school.x - steveX
  const dz = school.z - steveZ
  nearSchool = dx * dx + dz * dz < 6 * 6
  btn.style.display = nearSchool ? 'block' : 'none'
}
async function checkRings() {
  const rows = await fetchRings(myPid)
  if (rows.length) {
    resumeAudio()
    sfx.doorbell()
    const names = [...new Set(rows.map((r) => r.from_name))].join(', ')
    showToast('Ding dong! ' + names + (rows.length > 1 ? ' belden' : ' belde') + ' aan bij jouw huis!')
  }
}
setInterval(checkRings, 25000)

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

// instellingen (lichte modus, muziek, geluid)
let lichtMode = false
let musicMode = 1 // 0 = uit, 1 = vrolijk, 2 = feestje
let footTimer = 0
function loadSettings() {
  try {
    lichtMode = localStorage.getItem('haarlem_licht') === '1'
    const m = localStorage.getItem('haarlem_muziek')
    musicMode = m === null ? 1 : Math.max(0, Math.min(2, parseInt(m, 10) || 0))
    sfx.enabled = localStorage.getItem('haarlem_geluid') !== '0'
  } catch (e) {}
}
function saveSettings() {
  try {
    localStorage.setItem('haarlem_licht', lichtMode ? '1' : '0')
    localStorage.setItem('haarlem_muziek', String(musicMode))
    localStorage.setItem('haarlem_geluid', sfx.enabled ? '1' : '0')
  } catch (e) {}
}
function applyQuality() {
  renderer.setPixelRatio(lichtMode ? 1 : Math.min(window.devicePixelRatio || 1, 2))
  renderer.shadowMap.enabled = !lichtMode
  sun.castShadow = !lichtMode
  resize()
}
function startMusicMaybe() {
  if (musicMode > 0 && sfx.enabled) sfx.musicStart(musicMode === 2 ? 'feest' : 'vrolijk')
}
function buildCurrentCity() {
  for (const child of [...worldGroup.children]) {
    worldGroup.remove(child)
    child.traverse((o) => {
      if (o.isMesh && o.geometry) o.geometry.dispose()
    })
  }
  world = buildCity(worldGroup, GRID, CITIES[cityIndex])
  Object.assign(START, world.start)
  spawnAmbients() // nieuwe passanten, katten en honden in de nieuwe stad
  refreshHouses() // naambordjes van de klas in deze stad
  shownFacts = new Set()
}

// ---------- Speler-popje ----------
let playerCfg = loadCfg()
let player = null
let activeAddons = getActive()
function setCharacter(cfg) {
  const pos = player ? player.position.clone() : null
  const ry = player ? player.rotation.y : 0
  const sc = player ? player.scale.x : 1
  const vis = player ? player.visible : true
  if (player) scene.remove(player)
  activeAddons = getActive()
  player = makeCharacter(cfg, activeAddons)
  if (pos) player.position.copy(pos)
  player.rotation.y = ry
  player.scale.setScalar(sc)
  player.visible = vis
  scene.add(player)
}
function canFly() {
  return activeAddons.some((k) => FLY_KEYS.includes(k))
}
function hasSpeedShoes() {
  return activeAddons.some((k) => SPEED_KEYS.includes(k))
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
let mode = 'diamond' // 'vrij' | 'diamond' | 'tag' | 'hide' | 'baby' | 'mp'
let tagLimit = TAG_TIME // gekozen tikkertje-tijd (0 = zonder tijd)
let coinPickups = [] // gouden muntjes om op te rapen
let coins = getCoins() // spaarpot voor de winkel
let flyH = 0 // vlieghoogte (alleen met vleugels)
let flyHeld = false
let nearSchool = false
// echt tikkertje: rollen wisselen - tik jij iemand, dan is dat kind 'm en jaagt op jou
let itIsPlayer = true
let myTags = 0
let kidTags = 0
let targetTags = 5
let spTagCool = 0
let diamonds = []
let creepers = []
let npcs = []
let secrets = [] // geheime plekken: verstopte schatten + gouden diamant
// de eetbaby June: vang eten en breng het snel, anders huilt ze steeds harder
let june = null
let juneTag = null
let juneX = 0
let juneZ = 0
let foods = []
let carrying = null
let hunger = 0
let feeds = 0
let cryTimer = 0
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

// de boef: zodra een kind 'm is, krijgt het een boevenpak (streepjes + masker)
function makeBoef() {
  const g = new THREE.Group()
  const skin = new THREE.MeshLambertMaterial({ color: 0xe0a878 })
  const black = new THREE.MeshLambertMaterial({ color: 0x16161e })
  const white = new THREE.MeshLambertMaterial({ color: 0xf2f2f2 })
  const hang = (w, h, d) => new THREE.BoxGeometry(w, h, d).translate(0, -h / 2, 0)
  const lLeg = new THREE.Mesh(hang(0.3, 0.8, 0.34), black)
  const rLeg = new THREE.Mesh(hang(0.3, 0.8, 0.34), black)
  lLeg.position.set(-0.17, 0.8, 0)
  rLeg.position.set(0.17, 0.8, 0)
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.72, 0.42), white)
  body.position.set(0, 1.16, 0)
  g.add(body)
  for (const sy of [0.94, 1.18, 1.42]) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.12, 0.44), black)
    stripe.position.set(0, sy, 0)
    g.add(stripe)
  }
  const lArm = new THREE.Mesh(hang(0.22, 0.72, 0.3), white)
  const rArm = new THREE.Mesh(hang(0.22, 0.72, 0.3), white)
  lArm.position.set(-0.47, 1.52, 0)
  rArm.position.set(0.47, 1.52, 0)
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.62, 0.62), skin)
  head.position.set(0, 1.86, 0)
  const mask = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.16, 0.66), black) // het boevenmasker
  mask.position.set(0, 1.9, 0)
  const lEye = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.04), white)
  const rEye = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.04), white)
  lEye.position.set(-0.14, 1.9, -0.34)
  rEye.position.set(0.14, 1.9, -0.34)
  const muts = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.22, 0.66), black)
  muts.position.set(0, 2.22, 0)
  g.add(lLeg, rLeg, lArm, rArm, head, mask, lEye, rEye, muts)
  g.traverse((o) => {
    if (o.isMesh) o.castShadow = true
  })
  g.userData = { lLeg, rLeg, lArm, rArm }
  return g
}
function setNpcLook(n, boef) {
  const old = n.mesh
  const fresh = boef ? makeBoef() : makeCharacter(n.cfg)
  fresh.scale.setScalar(CHAR_SCALE)
  fresh.position.copy(old.position)
  fresh.rotation.y = old.rotation.y
  roundGroup.add(fresh)
  roundGroup.remove(old)
  n.mesh = fresh
}

// niemand loopt door muren: check een blokje rondom (net als de speler)
function areaFree(x, z, r) {
  return !cellSolid(x - r, z - r) && !cellSolid(x + r, z - r) && !cellSolid(x - r, z + r) && !cellSolid(x + r, z + r)
}

// ---------- Passanten, katten en honden (sfeer in de stad) ----------
let ambients = []
let chatGlobalCool = 0
const GREETS = ['Hoi!', 'Goedemorgen!', 'Mooi weer, he?', 'Wat een leuk popje ben jij!', 'Ik ga even naar de markt', 'Pas op voor de boef!', 'Tot ziens!', 'Heb je de trein al gezien?']
const JOKES = [
  'Wat is geel en kan niet zwemmen? Een shovel!',
  'Hoe noem je een vlieg zonder vleugels? Een loop!',
  'Wat zegt een slak op een schildpad? Huuui, wat gaan we snel!',
  'Waarom nam de banaan zonnebrand mee? Anders zou hij pellen!',
  'Wat zegt de ene muur tegen de andere? We zien elkaar op de hoek!',
  'Welke vis kan niet zwemmen? Een zaagvis in de boom!',
]
function secretTip() {
  const open = secrets.filter((s) => !s.taken)
  if (!open.length) return null
  const s = open[(Math.random() * open.length) | 0]
  const dx = s.x - steveX
  const dz = s.z - steveZ
  const richting = Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 'het oosten' : 'het westen') : (dz > 0 ? 'het zuiden' : 'het noorden')
  const ver = Math.hypot(dx, dz) > 40 ? 'heel ver' : 'niet zo ver'
  const wat = s.kind === 'gold' ? 'iets gouds zien glimmen' : 'een schatkist gezien'
  return 'Psst... ik heb ' + wat + ', ' + ver + ' naar ' + richting + '!'
}
function makeBubble(text) {
  const fs = 24
  const pad = 14
  const tmp = document.createElement('canvas').getContext('2d')
  tmp.font = 'bold ' + fs + 'px Trebuchet MS, Arial, sans-serif'
  const words = text.split(' ')
  const lines = ['']
  for (const w of words) {
    const probe = (lines[lines.length - 1] + ' ' + w).trim()
    if (tmp.measureText(probe).width > 280 && lines[lines.length - 1]) lines.push(w)
    else lines[lines.length - 1] = probe
  }
  const width = Math.ceil(Math.max(...lines.map((l) => tmp.measureText(l).width)) + pad * 2)
  const height = lines.length * (fs + 6) + pad * 2 - 6
  const c = document.createElement('canvas')
  c.width = width
  c.height = height
  const g2 = c.getContext('2d')
  g2.font = 'bold ' + fs + 'px Trebuchet MS, Arial, sans-serif'
  const r = 12
  g2.fillStyle = 'rgba(255,255,255,0.96)'
  g2.beginPath()
  g2.moveTo(r, 0)
  g2.arcTo(width, 0, width, height, r)
  g2.arcTo(width, height, 0, height, r)
  g2.arcTo(0, height, 0, 0, r)
  g2.arcTo(0, 0, width, 0, r)
  g2.closePath()
  g2.fill()
  g2.strokeStyle = '#2a2f3a'
  g2.lineWidth = 3
  g2.stroke()
  g2.fillStyle = '#1b2230'
  g2.textAlign = 'center'
  g2.textBaseline = 'middle'
  lines.forEach((l, i) => g2.fillText(l, width / 2, pad + 4 + i * (fs + 6) + fs / 2 - 6))
  const tex = new THREE.CanvasTexture(c)
  tex.minFilter = THREE.LinearFilter
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }))
  spr.renderOrder = 1000
  const bh = 0.42 * lines.length + 0.18
  spr.scale.set((bh * width) / height, bh, 1)
  return spr
}
function walkerSay(a) {
  let txt = null
  const r = Math.random()
  if (r < 0.3) txt = secretTip()
  if (!txt && r < 0.65) txt = JOKES[(Math.random() * JOKES.length) | 0]
  if (!txt) txt = GREETS[(Math.random() * GREETS.length) | 0]
  if (a.bubble) scene.remove(a.bubble)
  a.bubble = makeBubble(txt)
  a.bubble.position.set(a.x, 1.8, a.z)
  scene.add(a.bubble)
  a.bubbleT = 4.5
  sfx.chat()
}
function makeCat() {
  const cols = [0x1c1c24, 0xf2f2f2, 0xd98a3d, 0x8a8f98]
  const m = new THREE.MeshLambertMaterial({ color: cols[(Math.random() * cols.length) | 0] })
  const g = new THREE.Group()
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.18, 0.55), m)
  body.position.y = 0.2
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.18, 0.18), m)
  head.position.set(0, 0.32, -0.32)
  const e1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.04), m)
  const e2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.04), m)
  e1.position.set(-0.06, 0.45, -0.32)
  e2.position.set(0.06, 0.45, -0.32)
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 0.05), m)
  tail.position.set(0, 0.38, 0.3)
  tail.rotation.x = 0.5
  for (const [px, pz] of [[-0.1, -0.18], [0.1, -0.18], [-0.1, 0.18], [0.1, 0.18]]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.06), m)
    p.position.set(px, 0.06, pz)
    g.add(p)
  }
  g.add(body, head, e1, e2, tail)
  g.traverse((o) => {
    if (o.isMesh) o.castShadow = true
  })
  g.userData = { tail }
  return g
}
function makeDog() {
  const cols = [0x8a5a33, 0x3c3744, 0xd9c49a, 0xb9774a]
  const m = new THREE.MeshLambertMaterial({ color: cols[(Math.random() * cols.length) | 0] })
  const g = new THREE.Group()
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.75), m)
  body.position.y = 0.32
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.28, 0.28), m)
  head.position.set(0, 0.55, -0.45)
  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.14), new THREE.MeshLambertMaterial({ color: 0x2b2b33 }))
  snout.position.set(0, 0.48, -0.62)
  const o1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.05), m)
  const o2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.05), m)
  o1.position.set(-0.16, 0.6, -0.42)
  o2.position.set(0.16, 0.6, -0.42)
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.28, 0.06), m)
  tail.position.set(0, 0.5, 0.4)
  tail.rotation.x = 0.7
  for (const [px, pz] of [[-0.13, -0.25], [0.13, -0.25], [-0.13, 0.25], [0.13, 0.25]]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.18, 0.09), m)
    p.position.set(px, 0.09, pz)
    g.add(p)
  }
  g.add(body, head, snout, o1, o2, tail)
  g.traverse((o) => {
    if (o.isMesh) o.castShadow = true
  })
  g.userData = { tail }
  return g
}
function spawnAmbients() {
  for (const a of ambients) {
    scene.remove(a.mesh)
    if (a.bubble) scene.remove(a.bubble)
  }
  ambients = []
  const taken = new Set()
  for (let i = 0; i < 30; i++) {
    const c = freeCell(taken)
    if (!c) continue
    const mesh = makeCharacter(randomCfg())
    mesh.scale.setScalar(CHAR_SCALE)
    mesh.position.set(c.x, 0, c.z)
    scene.add(mesh)
    ambients.push({ kind: 'mens', mesh, x: c.x, z: c.z, heading: Math.random() * 6.28, timer: 0, phase: Math.random() * 6, speed: 1.1 + Math.random() * 0.5, sndCool: 0, chatCool: Math.random() * 10, bubble: null, bubbleT: 0 })
  }
  for (let i = 0; i < 8; i++) {
    const c = freeCell(taken)
    if (!c) continue
    const isCat = i % 2 === 0
    const mesh = isCat ? makeCat() : makeDog()
    mesh.position.set(c.x, 0, c.z)
    scene.add(mesh)
    ambients.push({ kind: isCat ? 'kat' : 'hond', mesh, x: c.x, z: c.z, heading: Math.random() * 6.28, timer: 0, phase: Math.random() * 6, speed: isCat ? 1.9 : 2.3, sndCool: 0, chatCool: 0, bubble: null, bubbleT: 0 })
  }
}
function updateAmbients(dt) {
  if (chatGlobalCool > 0) chatGlobalCool -= dt
  for (const a of ambients) {
    // even blijven staan tijdens het praten, met je gezicht naar de speler
    if (a.bubbleT > 0) {
      a.bubbleT -= dt
      if (a.bubbleT <= 0 && a.bubble) {
        scene.remove(a.bubble)
        a.bubble = null
      } else if (a.bubble) {
        a.bubble.position.set(a.x, 1.8, a.z)
        a.mesh.rotation.y = Math.atan2(steveX - a.x, -(steveZ - a.z))
        continue
      }
    }
    a.timer -= dt
    if (a.timer <= 0) {
      a.heading = Math.random() * 6.28
      a.timer = 1.5 + Math.random() * 3
    }
    const dx = Math.cos(a.heading) * a.speed * dt
    const dz = Math.sin(a.heading) * a.speed * dt
    const nx = clamp(a.x + dx, 1, GRID - 1)
    const nz = clamp(a.z + dz, 1, GRID - 1)
    if (areaFree(nx, nz, 0.3)) {
      a.x = nx
      a.z = nz
      a.mesh.rotation.y = Math.atan2(dx, -dz)
    } else a.timer = 0
    a.mesh.position.set(a.x, 0, a.z)
    a.phase += dt * 8
    const u = a.mesh.userData
    if (a.kind === 'mens') {
      const sw = Math.sin(a.phase) * 0.5
      if (u.lLeg) {
        u.lLeg.rotation.x = sw
        u.rLeg.rotation.x = -sw
        u.lArm.rotation.x = -sw
        u.rArm.rotation.x = sw
      }
    } else if (u.tail) {
      u.tail.rotation.z = Math.sin(a.phase) * 0.5 // kwispelen
    }
    if (a.chatCool > 0) a.chatCool -= dt
    if (a.sndCool > 0) a.sndCool -= dt
    if (status !== 'playing') continue
    const pdx = a.x - steveX
    const pdz = a.z - steveZ
    const dicht = pdx * pdx + pdz * pdz < 2.4 * 2.4
    if (a.kind === 'mens') {
      // passanten zeggen hoi, vertellen een mop of verklappen een geheim
      if (dicht && a.chatCool <= 0 && chatGlobalCool <= 0) {
        a.chatCool = 20 + Math.random() * 15
        chatGlobalCool = 5
        walkerSay(a)
      }
    } else if (a.sndCool <= 0 && dicht) {
      a.sndCool = 7
      if (a.kind === 'kat') sfx.meow()
      else sfx.woof()
    }
  }
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
  powerups = []
  secrets = []
  foods = []
  june = null
  juneTag = null
  carrying = null
  coinPickups = []
}
function makeCoinMesh() {
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(0.26, 0.26, 0.07, 14),
    new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0x6a5200, metalness: 0.6, roughness: 0.3 })
  )
  m.rotation.x = Math.PI / 2
  m.castShadow = true
  return m
}
function spawnCoins(taken, n) {
  for (let i = 0; i < n; i++) {
    const c = freeCell(taken)
    if (!c) continue
    const holder = new THREE.Group()
    holder.add(makeCoinMesh())
    holder.position.set(c.x, 0.9, c.z)
    roundGroup.add(holder)
    coinPickups.push({ mesh: holder, x: c.x, z: c.z, taken: false, phase: Math.random() * 6.28 })
  }
}

// geheime plekken: een verstopte schatkist of gouden diamant, ver weg
function makeChest() {
  const g = new THREE.Group()
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.32, 0.38), new THREE.MeshLambertMaterial({ color: 0x6e4626 }))
  body.position.y = 0.16
  const lid = new THREE.Mesh(new THREE.BoxGeometry(0.57, 0.14, 0.4), new THREE.MeshLambertMaterial({ color: 0x8a5a33 }))
  lid.position.y = 0.39
  const lock = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.12, 0.05),
    new THREE.MeshStandardMaterial({ color: 0xffd700, emissive: 0x7a5a00, roughness: 0.3 })
  )
  lock.position.set(0, 0.28, 0.21)
  g.add(body, lid, lock)
  g.traverse((o) => {
    if (o.isMesh) o.castShadow = true
  })
  return g
}
function makeGoldDiamond() {
  const m = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.34),
    new THREE.MeshStandardMaterial({ color: 0xffd24a, emissive: 0x8a6a00, metalness: 0.5, roughness: 0.2 })
  )
  m.scale.set(1, 1.4, 1)
  m.castShadow = true
  return m
}
// June: baby-meisje in een kinderstoel, met strikje
function makeJune() {
  const g = new THREE.Group()
  const wood = new THREE.MeshLambertMaterial({ color: 0xb9774a })
  const pink = new THREE.MeshLambertMaterial({ color: 0xff8fc0 })
  const headMat = new THREE.MeshLambertMaterial({ color: 0xffd9b3 })
  const eye = new THREE.MeshLambertMaterial({ color: 0x20202c })
  // kinderstoel
  for (const [px, pz] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.9, 0.09), wood)
    leg.position.set(px, 0.45, pz)
    g.add(leg)
  }
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.09, 0.72), wood)
  seat.position.y = 0.9
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.6, 0.09), wood)
  back.position.set(0, 1.25, 0.32)
  const tray = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.07, 0.4), wood)
  tray.position.set(0, 1.35, -0.42)
  g.add(seat, back, tray)
  // baby June
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.5, 0.4), pink)
  body.position.y = 1.18
  const lArm = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.34, 0.14), pink)
  const rArm = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.34, 0.14), pink)
  lArm.position.set(-0.31, 1.32, -0.05)
  rArm.position.set(0.31, 1.32, -0.05)
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.42, 0.42), headMat)
  head.position.y = 1.68
  const lEye = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.03), eye)
  const rEye = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.03), eye)
  lEye.position.set(-0.1, 1.72, -0.22)
  rEye.position.set(0.1, 1.72, -0.22)
  // strikje
  const bow1 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.1), pink)
  const bow2 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.1), pink)
  bow1.position.set(-0.09, 1.95, 0)
  bow2.position.set(0.09, 1.95, 0)
  g.add(body, lArm, rArm, head, lEye, rEye, bow1, bow2)
  g.traverse((o) => {
    if (o.isMesh) o.castShadow = true
  })
  g.userData = { headMat, lArm, rArm }
  return g
}
function spawnJune() {
  let jx = START.x + 3.5
  let jz = START.z
  outer: for (let r = 3; r < 9; r++) {
    for (const [ox, oz] of [[r, 0], [-r, 0], [0, r], [0, -r]]) {
      const cx = Math.floor(START.x + ox)
      const cz = Math.floor(START.z + oz)
      if (!world.solids.has(cx + ',' + cz)) {
        jx = cx + 0.5
        jz = cz + 0.5
        break outer
      }
    }
  }
  juneX = jx
  juneZ = jz
  june = makeJune()
  june.scale.setScalar(0.75)
  june.position.set(jx, 0, jz)
  roundGroup.add(june)
  juneTag = makeTagSprite('June')
  juneTag.position.set(jx, 2.2, jz)
  roundGroup.add(juneTag)
}
// eten om te vangen: appel, banaan, flesje melk, koekje
const FOOD_TYPES = [
  { key: 'appel', label: 'Appel' },
  { key: 'banaan', label: 'Banaan' },
  { key: 'flesje', label: 'Flesje melk' },
  { key: 'koekje', label: 'Koekje' },
]
function makeFood(key) {
  const g = new THREE.Group()
  if (key === 'appel') {
    const a = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshLambertMaterial({ color: 0xe63946 }))
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.06), new THREE.MeshLambertMaterial({ color: 0x3f8a2e }))
    leaf.position.y = 0.24
    g.add(a, leaf)
  } else if (key === 'banaan') {
    const m = new THREE.MeshLambertMaterial({ color: 0xffd166 })
    const b1 = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.12), m)
    const b2 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.12), m)
    b1.rotation.z = 0.3
    b2.position.set(0.2, 0.1, 0)
    g.add(b1, b2)
  } else if (key === 'flesje') {
    const fles = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.38, 8), new THREE.MeshLambertMaterial({ color: 0xf4f6f8 }))
    const dop = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.12, 8), new THREE.MeshLambertMaterial({ color: 0xff8c42 }))
    dop.position.y = 0.25
    g.add(fles, dop)
  } else {
    const k = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.08, 10), new THREE.MeshLambertMaterial({ color: 0x9a6a3e }))
    g.add(k)
  }
  g.traverse((o) => {
    if (o.isMesh) o.castShadow = true
  })
  return g
}
function spawnFood(taken) {
  const c = freeCell(taken)
  if (!c) return
  const t = FOOD_TYPES[(Math.random() * FOOD_TYPES.length) | 0]
  const mesh = makeFood(t.key)
  mesh.position.set(c.x, 0.85, c.z)
  roundGroup.add(mesh)
  foods.push({ type: t, mesh, x: c.x, z: c.z, baseY: 0.85, phase: Math.random() * 6.28, taken: false, respawnAt: 0 })
}
function spawnSecrets(taken) {
  const SECRETS = [
    { kind: 'chest', points: 300, label: 'Geheime schat gevonden! +300' },
    { kind: 'chest', points: 300, label: 'Geheime schat gevonden! +300' },
    { kind: 'gold', points: 500, label: 'Gouden diamant! +500' },
  ]
  for (const s of SECRETS) {
    let c = null
    for (let tries = 0; tries < 30; tries++) {
      const cand = hiddenCell(taken)
      if (!cand) break
      c = cand
      const ddx = cand.x - START.x
      const ddz = cand.z - START.z
      if (ddx * ddx + ddz * ddz > GRID * 0.22 * (GRID * 0.22)) break // ver genoeg weg
    }
    if (!c) continue
    const mesh = s.kind === 'chest' ? makeChest() : makeGoldDiamond()
    mesh.position.set(c.x, s.kind === 'gold' ? 0.8 : 0, c.z)
    roundGroup.add(mesh)
    secrets.push({ ...s, mesh, x: c.x, z: c.z, taken: false, spin: s.kind === 'gold' })
  }
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
      m.scale.setScalar(0.8)
      m.position.set(c.x, 0, c.z)
      roundGroup.add(m)
      creepers.push({ mesh: m, x: c.x, z: c.z, heading: Math.random() * 6.28, timer: 0 })
    }
  } else if (mode === 'baby') {
    spawnJune()
    for (let i = 0; i < 8; i++) spawnFood(taken)
    hunger = 0.35
    feeds = 0
    carrying = null
    cryTimer = 5
  } else if (mode === 'tag' || mode === 'hide') {
    totalKids = BASE_KIDS + (round - 1)
    for (let i = 0; i < totalKids; i++) {
      let c = null
      if (mode === 'hide') {
        // verstoppers zitten ver weg, dus je moet echt zoeken
        for (let t = 0; t < 25; t++) {
          c = hiddenCell(taken)
          if (!c) break
          const hdx = c.x - START.x
          const hdz = c.z - START.z
          if (hdx * hdx + hdz * hdz > GRID * 0.15 * (GRID * 0.15)) break
        }
      } else c = freeCell(taken)
      if (!c) continue
      const kidCfg = randomCfg()
      const m = makeCharacter(kidCfg)
      m.scale.setScalar(CHAR_SCALE)
      m.position.set(c.x, 0, c.z)
      roundGroup.add(m)
      npcs.push({ mesh: m, cfg: kidCfg, x: c.x, z: c.z, heading: Math.random() * 6.28, timer: 0, phase: 0, caught: false, it: false })
    }
    timeLeft = mode === 'tag' ? tagLimit : Math.max(50, HIDE_TIME - 8 * (round - 1))
    if (mode === 'tag') {
      itIsPlayer = true
      myTags = 0
      kidTags = 0
      targetTags = 4 + round
      spTagCool = 0
    }
  }
  for (let i = 0; i < 6; i++) spawnPowerup(taken)
  spawnSecrets(taken)
  spawnCoins(taken, mode === 'vrij' ? 30 : 14)
  flyH = 0
  steveX = START.x
  steveZ = START.z
  player.position.set(steveX, 0, steveZ)
  player.rotation.y = 0
  player.visible = false // first person: je eigen popje zie je niet
  player.scale.setScalar(CHAR_SCALE)
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
const held = { up: false, down: false, left: false, right: false } // toetsenbord (desktop)
const joyVec = { x: 0, y: 0 } // joystick (mobiel/tablet): x = sturen, y = vooruit/achteruit
function moveSteve(dx, dz) {
  // hoog in de lucht (vliegen) vlieg je over de gebouwen heen
  if (flyH > 2.4) {
    steveX = clamp(steveX + dx, 0.6, GRID - 0.6)
    steveZ = clamp(steveZ + dz, 0.6, GRID - 0.6)
    return
  }
  // de speler heeft een "dikte" (R) zodat je niet in muren/bomen clipt
  const R = 0.34
  const nx = clamp(steveX + dx, 0.6, GRID - 0.6)
  const ex = nx + (dx > 0 ? R : dx < 0 ? -R : 0)
  if (!cellSolid(ex, steveZ) && !cellSolid(ex, steveZ + R) && !cellSolid(ex, steveZ - R)) steveX = nx
  const nz = clamp(steveZ + dz, 0.6, GRID - 0.6)
  const ez = nz + (dz > 0 ? R : dz < 0 ? -R : 0)
  if (!cellSolid(steveX, ez) && !cellSolid(steveX + R, ez) && !cellSolid(steveX - R, ez)) steveZ = nz
}
function updatePlayer(dt) {
  // Sturen: toetsenbord (desktop) of touch (vasthouden + schuiven).
  let turn = (held.right ? 1 : 0) - (held.left ? 1 : 0)
  let fwd = (held.up ? 1 : 0) - (held.down ? 1 : 0)
  if (Math.abs(joyVec.x) > 0.16) turn += joyVec.x
  if (Math.abs(joyVec.y) > 0.16) fwd += -joyVec.y // joystick omhoog = vooruit
  turn = Math.max(-1, Math.min(1, turn))
  fwd = Math.max(-1, Math.min(1, fwd))
  yaw += turn * TURN_SPEED * dt
  faceX = Math.sin(yaw)
  faceZ = -Math.cos(yaw)
  const u = player.userData
  if (fwd !== 0) {
    const boost = (POWERS.speed.t > 0 ? 1.95 : 1) * (POWERS.giant.t > 0 ? 1.45 : 1) * (hasSpeedShoes() ? 1.4 : 1)
    const sp = STEVE_SPEED * boost * dt * (fwd > 0 ? 1 : 0.6) // achteruit iets langzamer
    moveSteve(faceX * fwd * sp, faceZ * fwd * sp)
    footTimer -= dt
    if (footTimer <= 0) {
      sfx.step()
      footTimer = 0.32
    }
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
  // vliegen met de vleugels: knop ingedrukt = omhoog, los = zachtjes dalen
  if (canFly() && flyHeld) flyH = Math.min(14, flyH + dt * 6)
  else flyH = Math.max(0, flyH - dt * 5)
  player.position.set(steveX, flyH, steveZ)
  player.rotation.y = yaw
  if (u.lWing) {
    const flap = Math.sin(performance.now() * 0.02) * (flyH > 0.2 ? 0.8 : 0.18)
    u.lWing.rotation.z = 0.45 + flap
    u.rWing.rotation.z = -0.45 - flap
  }
  if (invuln > 0) invuln -= dt
}
function updateCreepers(dt) {
  for (const c of creepers) {
    c.timer -= dt
    if (c.timer <= 0) {
      c.heading = Math.random() < 0.35 ? Math.atan2(steveZ - c.z, steveX - c.x) : Math.random() * 6.28
      c.timer = 1 + Math.random() * 1.6
    }
    const spd = CREEPER_SPEED * Math.min(2, 1 + 0.12 * (round - 1)) // elke ronde sneller
    const dx = Math.cos(c.heading) * spd * dt
    const dz = Math.sin(c.heading) * spd * dt
    const nx = clamp(c.x + dx, 0.6, GRID - 0.6)
    const nz = clamp(c.z + dz, 0.6, GRID - 0.6)
    if (areaFree(nx, nz, 0.28)) {
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
      let speedF = Math.min(0.95, 0.6 + 0.05 * (round - 1)) // elke ronde snellere kinderen
      if (n.it) {
        // dit kind is 'm en zit JOU achterna!
        speedF = Math.min(0.92, 0.66 + 0.04 * (round - 1))
        mvx = -dx / (dist || 1)
        mvz = -dz / (dist || 1)
      } else if (itIsPlayer && dist < 6 && dist > 0.001) {
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
      const sp = STEVE_SPEED * speedF * dt
      const nx = clamp(n.x + mvx * sp, 0.6, GRID - 0.6)
      if (areaFree(nx, n.z, 0.26)) n.x = nx
      const nz = clamp(n.z + mvz * sp, 0.6, GRID - 0.6)
      if (areaFree(n.x, nz, 0.26)) n.z = nz
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
function earnCoins(n) {
  coins = addCoins(n)
  updateHud()
}
function checkCollisions() {
  for (const cp of coinPickups) {
    if (cp.taken) continue
    const cdx = cp.x - steveX
    const cdz = cp.z - steveZ
    if (cdx * cdx + cdz * cdz < 0.5 * 0.5) {
      cp.taken = true
      cp.mesh.visible = false
      sfx.coin()
      earnCoins(1)
    }
  }
  for (const s of secrets) {
    if (s.taken) continue
    const sdx = s.x - steveX
    const sdz = s.z - steveZ
    if (sdx * sdx + sdz * sdz < 0.6 * 0.6) {
      s.taken = true
      s.mesh.visible = false
      score += s.points
      earnCoins(s.kind === 'gold' ? 20 : 10)
      sfx.win()
      showToast(s.label)
      updateHud()
    }
  }
  if (mode === 'diamond') {
    for (const d of diamonds) {
      if (d.collected) continue
      const dx = d.x - steveX
      const dz = d.z - steveZ
      if (dx * dx + dz * dz < 0.45 * 0.45) {
        d.collected = true
        d.mesh.visible = false
        score += 100
        earnCoins(3)
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
  } else if (mode === 'tag') {
    // echt tikkertje: rollen wisselen
    if (spTagCool <= 0) {
      if (itIsPlayer) {
        for (const n of npcs) {
          const dx = n.x - steveX
          const dz = n.z - steveZ
          if (dx * dx + dz * dz < 0.7 * 0.7) {
            myTags += 1
            score += 150
            sfx.coin()
            n.it = true
            setNpcLook(n, true) // het kind wordt de boef!
            itIsPlayer = false
            spTagCool = 1.5
            showToast('Getikt! Nu is het kind de boef - ren weg!')
            updateHud()
            if (myTags >= targetTags) roundClear()
            break
          }
        }
      } else {
        const it = npcs.find((n) => n.it)
        if (it) {
          const dx = it.x - steveX
          const dz = it.z - steveZ
          if (dx * dx + dz * dz < 0.7 * 0.7) {
            kidTags += 1
            score = Math.max(0, score - 100)
            sfx.bonk()
            showHitFlash()
            it.it = false
            setNpcLook(it, false) // boevenpak weer uit
            itIsPlayer = true
            spTagCool = 1.5
            showToast('De boef heeft je getikt! Nu ben jij hem')
            updateHud()
          }
        }
      }
    }
  } else if (mode === 'baby') {
    if (!carrying) {
      for (const f of foods) {
        if (f.taken) continue
        const dx = f.x - steveX
        const dz = f.z - steveZ
        if (dx * dx + dz * dz < 0.6 * 0.6) {
          f.taken = true
          f.mesh.visible = false
          f.respawnAt = performance.now() + 9000
          carrying = f.type
          sfx.coin()
          showToast(f.type.label + ' gepakt! Snel naar June!')
          updateHud()
          break
        }
      }
    } else {
      const dx = juneX - steveX
      const dz = juneZ - steveZ
      if (dx * dx + dz * dz < 1.3 * 1.3) {
        carrying = null
        feeds += 1
        score += 100
        hunger = Math.max(0.05, hunger - 0.5)
        sfx.babyHappy()
        showToast('Mmm! June heeft gegeten')
        updateHud()
        if (feeds % 5 === 0) roundClear() // elke 5 hapjes een ronde verder (sneller honger)
      }
    }
  } else {
    // verstoppertje: gevonden kinderen tellen mee
    for (const n of npcs) {
      if (n.caught) continue
      const dx = n.x - steveX
      const dz = n.z - steveZ
      if (dx * dx + dz * dz < 0.7 * 0.7) {
        n.caught = true
        n.mesh.visible = false
        score += 200
        sfx.coin()
        showToast('Gevonden!')
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
  if (p.t > 0) return // al actief
  if (p.count <= 0) {
    showToast('Eerst ' + POWER_NAME[key] + ' zoeken!')
    return
  }
  p.count -= 1
  p.t = p.dur
  resumeAudio()
  sfx.power()
  updateActionButtons()
}
function nearestTarget() {
  const arr =
    mode === 'mp'
      ? Object.values(mpPlayers)
      : mode === 'diamond'
        ? diamonds.filter((d) => !d.collected)
        : mode === 'baby'
          ? carrying
            ? [{ x: juneX, z: juneZ }] // met eten in je hand wijst de radar naar June
            : foods.filter((f) => !f.taken)
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
    const p = POWERS[k]
    b.classList.toggle('active', p.t > 0)
    b.classList.toggle('cooling', p.count <= 0 && p.t <= 0) // grijs als je 'm niet hebt
    const badge = b.querySelector('.count')
    if (badge) badge.textContent = p.count > 0 ? String(p.count) : ''
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

// ---------- Power-up-items in de wereld (zoeken + oppakken) ----------
function makePowerupMesh(type) {
  const m = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.34, 0),
    new THREE.MeshStandardMaterial({ color: POWERS[type].color, emissive: POWERS[type].color, emissiveIntensity: 0.55, roughness: 0.3, metalness: 0.2 })
  )
  m.castShadow = true
  return m
}
function spawnPowerup(taken) {
  const c = freeCell(taken)
  if (!c) return
  const type = POWER_KEYS[(Math.random() * POWER_KEYS.length) | 0]
  const mesh = makePowerupMesh(type)
  mesh.position.set(c.x, 1.0, c.z)
  roundGroup.add(mesh)
  powerups.push({ type, mesh, x: c.x, z: c.z, baseY: 1.0, phase: Math.random() * 6.28, taken: false, respawnAt: 0 })
}
function updatePowerups(dt, now) {
  for (const pu of powerups) {
    if (pu.taken) {
      if (now >= pu.respawnAt) {
        const c = freeCell(new Set())
        if (c) {
          pu.x = c.x
          pu.z = c.z
          pu.taken = false
          pu.mesh.visible = true
          pu.mesh.position.set(c.x, pu.baseY, c.z)
        }
      }
      continue
    }
    pu.mesh.rotation.y += dt * 1.8
    pu.mesh.rotation.x += dt * 1.1
    pu.mesh.position.y = pu.baseY + Math.sin(now * 0.003 + pu.phase) * 0.18
    const dx = pu.x - steveX
    const dz = pu.z - steveZ
    if (dx * dx + dz * dz < 0.6 * 0.6) {
      pu.taken = true
      pu.mesh.visible = false
      pu.respawnAt = now + 12000
      POWERS[pu.type].count += 1
      sfx.coin()
      showToast(POWER_FOUND[pu.type])
      updateActionButtons()
    }
  }
}

// ---------- Multiplayer ----------
function mpProfile() {
  return { id: mpId, name: playerName || 'Speler', cfg: playerCfg, city: cityKey() }
}
function startMultiplayer(code, isCreator) {
  resumeAudio()
  startMusicMaybe()
  mpCode = code
  mpCitySynced = isCreator
  currentIt = null // wordt de laagste id (iedereen rekent hetzelfde)
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
  player.scale.setScalar(CHAR_SCALE)
  for (const k of POWER_KEYS) {
    POWERS[k].t = 0
    POWERS[k].count = 0
  }
  const puTaken = new Set()
  for (let i = 0; i < 7; i++) spawnPowerup(puTaken)
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
  maybeHint()
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
  mesh.scale.setScalar(CHAR_SCALE)
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
  rp.tag.position.set(rp.x, 1.95, rp.z)
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
  // wie is 'm? bij onbekend of weggegaan: de laagste id (iedereen rekent hetzelfde)
  if (!currentIt || !present[currentIt]) {
    const ids = Object.keys(present).sort()
    if (ids.length) currentIt = ids[0]
  }
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
function showSettings() {
  resumeAudio()
  status = 'settings'
  setSceneVisible(true)
  setChrome(false)
  $('mpbar').style.display = 'none'
  document.getElementById('hud').style.display = ''
  player.visible = false
  setOverviewCam()
  hideAllScreens()
  hideFact()
  updateSettingsUI()
  $('settings').classList.add('show')
}
function updateSettingsUI() {
  $('btnToggleLight').textContent = 'Lichte modus: ' + (lichtMode ? 'AAN' : 'UIT')
  $('btnToggleMusic').textContent = 'Muziek: ' + ['UIT', 'VROLIJK', 'FEESTJE'][musicMode]
  $('btnToggleSound').textContent = 'Geluid: ' + (sfx.enabled ? 'AAN' : 'UIT')
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
  // ooghoogte van een kind: de huizen en de stad voelen lekker groot
  const eye = (POWERS.giant.t > 0 ? 4.8 : 1.05) + flyH
  const dip = POWERS.giant.t > 0 ? 2.4 : 0.3
  camera.position.set(steveX, eye, steveZ)
  camera.lookAt(steveX + faceX * 2, eye - dip - flyH * 0.25, steveZ + faceZ * 2)
}
function setOverviewCam() {
  camera.fov = 55
  camera.updateProjectionMatrix()
  camera.position.set(GRID / 2, GRID * 0.4, GRID * 0.92)
  camera.lookAt(GRID / 2, 2, GRID / 2)
  updateSunShadow(GRID / 2, GRID / 2)
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
const foodIcon =
  '<svg viewBox="0 0 24 24" class="icon"><circle cx="12" cy="14" r="7" fill="#e63946"/><path d="M12 7c0-2 1.5-3.5 3.5-3.5" fill="none" stroke="#3f8a2e" stroke-width="2" stroke-linecap="round"/></svg>'
function updateHungerBar() {
  const pct = Math.round(hunger * 100)
  const col = hunger > 0.72 ? '#ff5b5b' : hunger > 0.48 ? '#ffb04a' : '#6fe08a'
  hud.timer.innerHTML = '<span class="hbar"><i style="width:' + pct + '%;background:' + col + '"></i></span>'
}
function updateHud() {
  if (hud.coins) hud.coins.innerHTML = coinIcon + '<span>' + coins + '</span>'
  if (mode === 'vrij') {
    hud.hearts.style.display = 'none'
    hud.timer.style.display = 'none'
    hud.diamonds.innerHTML = ''
    hud.score.textContent = ''
    hud.level.textContent = 'VRIJ SPELEN'
    return
  }
  const isD = mode === 'diamond'
  const timed = mode === 'hide' || (mode === 'tag' && tagLimit > 0)
  hud.hearts.style.display = isD || mode === 'baby' ? 'flex' : 'none'
  hud.timer.style.display = timed || mode === 'baby' ? 'flex' : 'none'
  if (mode === 'baby') {
    let h = ''
    for (let i = 0; i < MAX_HEARTS; i++) h += heartIcon(i < lives)
    hud.hearts.innerHTML = h
    hud.diamonds.innerHTML = foodIcon + '<span>' + feeds + '</span>'
    updateHungerBar()
    hud.score.textContent = String(score).padStart(5, '0')
    hud.level.textContent = MODE_LABEL[mode] + ' R' + round
    return
  }
  if (isD) {
    let h = ''
    for (let i = 0; i < MAX_HEARTS; i++) h += heartIcon(i < lives)
    hud.hearts.innerHTML = h
    const got = diamonds.filter((d) => d.collected).length
    hud.diamonds.innerHTML = diamondIcon + '<span>' + got + '/' + totalDiamonds + '</span>'
  } else if (mode === 'tag') {
    hud.diamonds.innerHTML = kidIcon + '<span>' + myTags + '/' + targetTags + '</span>'
    if (timed) hud.timer.textContent = fmtTime(timeLeft)
  } else {
    const got = npcs.filter((n) => n.caught).length
    hud.diamonds.innerHTML = kidIcon + '<span>' + got + '/' + totalKids + '</span>'
    if (timed) hud.timer.textContent = fmtTime(timeLeft)
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
  $('settings').classList.remove('show')
  $('tagscreen').classList.remove('show')
  $('schoolscreen').classList.remove('show')
  $('quizscreen').classList.remove('show')
  $('shopscreen').classList.remove('show')
}
// ---------- Schoolmenu, Schoolquiz en Winkel ----------
function showSchoolMenu() {
  resumeAudio()
  status = 'schoolmenu'
  setChrome(false)
  $('btnSchool').style.display = 'none'
  $('btnFly').style.display = 'none'
  $('btnBell').style.display = 'none'
  hideAllScreens()
  $('schoolscreen').classList.add('show')
}
function resumeRoam() {
  status = 'playing'
  hideAllScreens()
  setChrome(true)
}
let quizQ = null
function showQuiz() {
  resumeAudio()
  status = 'quiz'
  setChrome(false)
  hideAllScreens()
  $('quizscreen').classList.add('show')
  nextQuiz()
}
function nextQuiz() {
  quizQ = nextQuestion()
  $('quizCoins').textContent = coins
  $('quizVraag').textContent = quizQ.vraag
  $('quizUitslag').textContent = ''
  const wrap = $('quizOpts')
  wrap.innerHTML = ''
  quizQ.opties.forEach((opt, i) => {
    const b = document.createElement('button')
    b.className = 'arcade-btn'
    b.textContent = opt
    b.onclick = () => answerQuiz(i, b)
    wrap.appendChild(b)
  })
}
function answerQuiz(i, btn) {
  if (!quizQ) return
  if (i === quizQ.goed) {
    earnCoins(quizQ.beloning)
    sfx.coin()
    $('quizCoins').textContent = coins
    $('quizUitslag').textContent = 'Goed! +' + quizQ.beloning + ' munten'
    $('quizUitslag').style.color = '#6fe08a'
    quizQ = null
    setTimeout(() => {
      if (status === 'quiz') nextQuiz()
    }, 850)
  } else {
    sfx.bonk()
    btn.classList.add('fout')
    $('quizUitslag').textContent = 'Bijna! Probeer nog eens'
    $('quizUitslag').style.color = '#ff8a8a'
  }
}
let shopReturn = 'intro'
function showShop(from) {
  resumeAudio()
  shopReturn = from
  status = 'shop'
  setChrome(false)
  hideAllScreens()
  renderShop()
  $('shopscreen').classList.add('show')
}
function renderShop() {
  $('shopCoins').textContent = coins
  const wrap = $('shopItems')
  wrap.innerHTML = ''
  const aantal = getOwned().length
  const teller = document.createElement('p')
  teller.className = 'arcade-coins'
  teller.style.color = '#9be15d'
  teller.textContent = 'Verzameld: ' + aantal + ' / ' + ADDONS.length
  wrap.appendChild(teller)
  let lastCat = null
  for (const a of ADDONS) {
    if (a.cat !== lastCat) {
      lastCat = a.cat
      const h = document.createElement('div')
      h.className = 'shop-cat'
      h.textContent = a.cat
      wrap.appendChild(h)
    }
    const row = document.createElement('div')
    row.className = 'shop-row'
    const heeft = owns(a.key)
    const aan = getActive().includes(a.key)
    row.innerHTML = '<div class="shop-info"><b>' + a.label + '</b><span>' + a.tip + '</span></div>'
    const btn = document.createElement('button')
    btn.className = 'arcade-btn small-btn'
    if (!heeft) {
      btn.textContent = a.prijs + ' €'
      if (coins < a.prijs) btn.classList.add('cantbuy')
      btn.onclick = () => {
        if (buy(a.key)) {
          coins = getCoins()
          sfx.win()
          setCharacter(playerCfg)
          updateHud()
          renderShop()
        } else showToast('Niet genoeg munten - speel of doe de quiz!')
      }
    } else {
      btn.textContent = aan ? 'AAN' : 'UIT'
      btn.classList.add(aan ? 'on' : 'off')
      btn.onclick = () => {
        setActive(a.key, !aan)
        setCharacter(playerCfg)
        renderShop()
      }
    }
    row.appendChild(btn)
    wrap.appendChild(row)
  }
}
function showTagPicker() {
  resumeAudio()
  status = 'tagpick'
  setSceneVisible(true)
  setChrome(false)
  player.visible = false
  setOverviewCam()
  hideAllScreens()
  hideFact()
  $('tagscreen').classList.add('show')
}
function setSceneVisible(v) {
  ground.visible = v
  worldGroup.visible = v
  roundGroup.visible = v
}
function setChrome(v) {
  // HUD, joystick en actieknoppen alleen tijdens het spelen tonen
  const vis = v ? 'visible' : 'hidden'
  document.getElementById('hud').style.visibility = vis
  document.getElementById('actions').style.visibility = vis
  document.getElementById('joystick').style.visibility = vis
}
function showIntro() {
  status = 'intro'
  setSceneVisible(true)
  setChrome(false)
  sfx.musicStop()
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
function startGame(m, tagSeconds) {
  mode = m || 'diamond'
  if (m === 'tag') tagLimit = tagSeconds === undefined ? TAG_TIME : tagSeconds
  if (inRoom()) {
    leaveRoom()
    clearRemotes()
  }
  $('mpbar').style.display = 'none'
  document.getElementById('hud').style.display = ''
  resumeAudio()
  sfx.start()
  startMusicMaybe()
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
    POWERS[k].count = 0
  }
  soundCool = 0
  radarBeacon.visible = false
  itMarker.visible = false
  setCharacter(playerCfg)
  buildRound()
  maybeHint()
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
  player.scale.setScalar(1) // in de maker zie je je popje groot
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
function maybeHint() {
  if (IS_TOUCH && !hintShown) {
    hintShown = true
    setTimeout(() => showToast('Loop met de joystick linksonder'), 400)
  }
}
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
  if (!sfx.enabled) {
    sfx.musicStop()
    sfx.rainStop()
  } else {
    if (status === 'playing') startMusicMaybe()
    if (isRaining) sfx.rainStart()
  }
  updateMuteBtn()
  saveSettings()
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
// Joystick (telefoon/tablet): duim op de stick, duwen = lopen, opzij = sturen.
const joyEl = $('joystick')
const joyKnob = $('joyKnob')
let joyId = null
function joySet(e) {
  const r = joyEl.getBoundingClientRect()
  let dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2)
  let dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2)
  const len = Math.hypot(dx, dy)
  if (len > 1) {
    dx /= len
    dy /= len
  }
  joyVec.x = dx
  joyVec.y = dy
  joyKnob.style.transform = 'translate(' + dx * 34 + 'px,' + dy * 34 + 'px)'
}
function joyReset() {
  joyId = null
  joyVec.x = 0
  joyVec.y = 0
  joyKnob.style.transform = ''
}
joyEl.addEventListener('pointerdown', (e) => {
  e.preventDefault()
  joyId = e.pointerId
  try {
    joyEl.setPointerCapture(e.pointerId)
  } catch (err) {}
  resumeAudio()
  joySet(e)
})
joyEl.addEventListener('pointermove', (e) => {
  if (e.pointerId === joyId) joySet(e)
})
joyEl.addEventListener('pointerup', (e) => {
  if (e.pointerId === joyId) joyReset()
})
joyEl.addEventListener('pointercancel', (e) => {
  if (e.pointerId === joyId) joyReset()
})

// ---------- Knoppen ----------
$('btnPlay').addEventListener('click', () => startGame('vrij'))
$('btnShop').addEventListener('click', () => showShop('intro'))
$('btnSchool').addEventListener('click', showSchoolMenu)
$('btnSchoolBack').addEventListener('click', resumeRoam)
$('btnQuiz').addEventListener('click', showQuiz)
$('btnQuizStop').addEventListener('click', showSchoolMenu)
$('btnShop2').addEventListener('click', () => showShop('school'))
$('btnShopBack').addEventListener('click', () => (shopReturn === 'school' ? showSchoolMenu() : showIntro()))
{
  const flyBtn = $('btnFly')
  const flyOn = (e) => {
    e.preventDefault()
    flyHeld = true
  }
  const flyOff = () => {
    flyHeld = false
  }
  flyBtn.addEventListener('pointerdown', flyOn)
  flyBtn.addEventListener('pointerup', flyOff)
  flyBtn.addEventListener('pointercancel', flyOff)
  flyBtn.addEventListener('pointerleave', flyOff)
}
$('btnDiamond').addEventListener('click', () => startGame('diamond'))
$('btnTag').addEventListener('click', showTagPicker)
$('btnTagNoTime').addEventListener('click', () => startGame('tag', 0))
$('btnTag1').addEventListener('click', () => startGame('tag', 60))
$('btnTag2').addEventListener('click', () => startGame('tag', 120))
$('btnTag3').addEventListener('click', () => startGame('tag', 180))
$('btnTagBack').addEventListener('click', showIntro)
$('btnHide').addEventListener('click', () => startGame('hide'))
$('btnBaby').addEventListener('click', () => startGame('baby'))
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

// aanbellen of een huis kiezen
$('btnBell').addEventListener('click', async () => {
  if (!nearHouse) return
  resumeAudio()
  const o = nearHouse.owner
  if (o && o.pid !== myPid) {
    sfx.doorbell()
    ringBell(o.pid, playerName || 'Iemand')
    showToast('Ding dong! Je belde aan bij ' + o.name)
    return
  }
  if (o && o.pid === myPid) {
    showToast('Dit is jouw huis!')
    return
  }
  if (!playerName) {
    showToast('Maak eerst je popje en kies een naam!')
    return
  }
  const [hcx, hcz] = nearHouse.key.split(',').map(Number)
  const ok = await claimHouse(myPid, playerName, CITIES[cityIndex].key, hcx, hcz)
  if (ok) {
    sfx.win()
    showToast('Dit is nu jouw huis! Vriendjes kunnen aanbellen')
    refreshHouses()
  } else showToast('Huis kiezen lukt nu even niet')
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

// terug naar start
$('btnHome').addEventListener('click', () => {
  if (inRoom()) stopMultiplayer()
  else showIntro()
})

// instellingen
$('btnSettings').addEventListener('click', showSettings)
$('btnSettingsBack').addEventListener('click', showIntro)
$('btnToggleLight').addEventListener('click', () => {
  lichtMode = !lichtMode
  applyQuality()
  saveSettings()
  updateSettingsUI()
})
$('btnToggleMusic').addEventListener('click', () => {
  musicMode = (musicMode + 1) % 3 // uit -> vrolijk -> feestje
  sfx.musicStop()
  if (status === 'playing') startMusicMaybe()
  saveSettings()
  updateSettingsUI()
})
$('btnToggleSound').addEventListener('click', () => {
  sfx.enabled = !sfx.enabled
  if (!sfx.enabled) {
    sfx.musicStop()
    sfx.rainStop()
  } else {
    if (status === 'playing') startMusicMaybe()
    if (isRaining) sfx.rainStart()
  }
  updateMuteBtn()
  saveSettings()
  updateSettingsUI()
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
  world.update(dt) // molenwieken, auto's, bruggen en trein draaien altijd
  sky.update(dt, camera.position.x, camera.position.z)
  if (status !== 'creator') updateAmbients(dt) // passanten en dieren wandelen rond
  bellScanT -= dt
  if (bellScanT <= 0) {
    bellScanT = 0.3
    scanBell() // sta je bij een huis? toon BEL AAN / WOON HIER
    scanSchool() // sta je bij de school? toon KIES SPEL
    $('btnFly').style.display = status === 'playing' && canFly() ? 'block' : 'none'
  }
  if (status === 'playing') {
    updatePlayer(dt)
    updateSunShadow(steveX, steveZ)
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
    }
    if (soundCool > 0) soundCool -= dt
    updatePowerups(dt, now)
    updateActionButtons()
    if (status === 'playing' && mode === 'tag') {
      if (spTagCool > 0) spTagCool -= dt
      const it = npcs.find((n) => n.it)
      if (!itIsPlayer && it) {
        itMarker.visible = true
        itMarker.position.set(it.x, 2.6, it.z)
        itMarker.rotation.y += dt * 2
      } else itMarker.visible = false
    }
    if (status === 'playing' && mode === 'baby') {
      hunger = Math.min(1, hunger + (0.014 + 0.005 * (round - 1)) * dt) // elke ronde sneller honger
      const stage = hunger > 0.92 ? 3 : hunger > 0.72 ? 2 : hunger > 0.48 ? 1 : 0
      cryTimer -= dt
      if (stage > 0 && cryTimer <= 0) {
        sfx.babyCry(stage) // hoe bozer, hoe harder en vaker
        cryTimer = stage === 1 ? 6 : stage === 2 ? 3.5 : 1.8
      }
      if (june) {
        const u = june.userData
        u.headMat.color.setHex(stage === 0 ? 0xffd9b3 : stage === 1 ? 0xf5b89a : stage === 2 ? 0xe8907a : 0xe06a5a)
        if (stage >= 2) {
          const w = Math.sin(now * 0.02) * 0.8 // boos met de armpjes zwaaien
          u.lArm.rotation.z = w
          u.rArm.rotation.z = -w
        } else {
          u.lArm.rotation.z = 0
          u.rArm.rotation.z = 0
        }
      }
      if (hunger >= 1) {
        lives -= 1
        hunger = 0.55
        sfx.babyCry(3)
        showHitFlash()
        showToast('June huilt heel hard! Snel, eten halen!')
        updateHud()
        if (lives <= 0) showGameOver()
      }
      updateHungerBar()
      for (const f of foods) {
        if (f.taken) {
          if (now >= f.respawnAt) {
            const c = freeCell(new Set())
            if (c) {
              f.x = c.x
              f.z = c.z
              f.taken = false
              f.mesh.visible = true
              f.mesh.position.set(c.x, f.baseY, c.z)
            }
          }
          continue
        }
        f.mesh.rotation.y += dt * 1.5
        f.mesh.position.y = f.baseY + Math.sin(now * 0.003 + f.phase) * 0.12
      }
    }
    if (status === 'playing' && (mode === 'hide' || (mode === 'tag' && tagLimit > 0))) {
      timeLeft -= dt
      hud.timer.textContent = fmtTime(timeLeft)
      if (timeLeft <= 0) {
        if (mode === 'tag') showToast(myTags > kidTags ? 'Tijd om! Jij had de meeste tikken!' : 'Tijd om! De kinderen winnen!')
        showGameOver()
      }
    }
    if (status === 'playing') {
      for (const d of diamonds) {
        if (d.collected) continue
        d.mesh.rotation.y += dt * 2.2
        d.mesh.position.y = d.baseY + Math.sin(now * 0.003 + d.phase) * 0.15
      }
      for (const s of secrets) {
        if (s.taken || !s.spin) continue
        s.mesh.rotation.y += dt * 2.4
        s.mesh.position.y = 0.8 + Math.sin(now * 0.003) * 0.15
      }
      for (const cp of coinPickups) {
        if (cp.taken) continue
        cp.mesh.rotation.y += dt * 3
        cp.mesh.position.y = 0.9 + Math.sin(now * 0.004 + cp.phase) * 0.12
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
    if (show) nameTag.position.set(player.position.x, player.position.y + (status === 'creator' ? 2.9 : 1.9), player.position.z)
  }
  renderer.render(scene, camera)
  requestAnimationFrame(frame)
}

// ---------- Start ----------
function init() {
  loadSettings()
  applyQuality()
  updateMuteBtn()
  updateNameTag()
  spawnAmbients()
  refreshHouses()
  checkRings() // belde er iemand aan terwijl je weg was?
  showIntro()
  requestAnimationFrame(frame)
}
init()
