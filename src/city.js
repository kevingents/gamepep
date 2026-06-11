// Steden van Nederland als speelwereld, opgebouwd uit blokken.
// Een algemene stad-bouwer (straten, huizen, bomen, auto's, water) plus
// herkenningspunten per stad met naambordjes en weetjes om van te leren.
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

const matCache = {}
const matOf = (c) => (matCache[c] || (matCache[c] = new THREE.MeshLambertMaterial({ color: c })))

const ROADS = [7, 14, 21, 28, 35]
const onRoad = (v) => ROADS.indexOf(v) !== -1
const START = { x: 21.5, z: 24.5 } // op straat, vrij van gebouwen, voor elke stad

function makeLabel(text, scale = 1) {
  const fs = 34
  const c = document.createElement('canvas')
  let ctx = c.getContext('2d')
  ctx.font = 'bold ' + fs + 'px Trebuchet MS, Arial, sans-serif'
  c.width = Math.ceil(ctx.measureText(text).width) + 30
  c.height = fs + 24
  ctx = c.getContext('2d')
  ctx.font = 'bold ' + fs + 'px Trebuchet MS, Arial, sans-serif'
  const w = c.width
  const h = c.height
  const r = 12
  ctx.fillStyle = 'rgba(18,26,38,0.86)'
  ctx.beginPath()
  ctx.moveTo(r, 0)
  ctx.arcTo(w, 0, w, h, r)
  ctx.arcTo(w, h, 0, h, r)
  ctx.arcTo(0, h, 0, 0, r)
  ctx.arcTo(0, 0, w, 0, r)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = '#ffe066'
  ctx.lineWidth = 3
  ctx.stroke()
  ctx.fillStyle = '#ffe066'
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'center'
  ctx.fillText(text, w / 2, h / 2 + 2)
  const tex = new THREE.CanvasTexture(c)
  tex.minFilter = THREE.LinearFilter
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }))
  spr.renderOrder = 999
  const a = c.width / c.height
  spr.scale.set(0.95 * scale * a, 0.95 * scale, 1)
  return spr
}

// ---------- Herkenningspunten ----------
function buildLandmark(ctx, lm) {
  const { box, cyl, cone, solidRect, group, animated } = ctx
  const x = lm.x
  const z = lm.z
  const o = lm.opts || {}
  switch (lm.type) {
    case 'church': {
      solidRect(Math.floor(x) - 1, Math.floor(z) - 1, 3, 3)
      box('#9aa0a8', 3.4, 3.2, 3, x, 0, z)
      cone('#6f7780', 2.4, 1.3, x, 3.2, z, 4)
      const th = o.tower || 7
      box('#aab0b8', 2, th, 2, x, 0, z)
      cone(o.spire || '#3f7d6e', 1.5, 3.2, x, th, z, 4)
      box('#ffd700', 0.3, 0.6, 0.3, x, th + 3.2, z)
      break
    }
    case 'tower': {
      solidRect(Math.floor(x) - 1, Math.floor(z) - 1, 2, 2)
      const h = o.h || 10
      if (o.style === 'modern') {
        cyl('#d7d2c4', 0.7, h, x, 0, z, 12)
        cyl('#9aa6b2', 1.6, 1.4, x, h - 2.4, z, 12)
        cyl('#cfd6df', 0.5, 2, x, h, z, 10)
      } else {
        box('#b9b0a0', 2, h, 2, x, 0, z)
        box('#cfc6b4', 2.2, 0.5, 2.2, x, h - 0.5, z)
        cone(o.spire || '#7a6a55', 1.5, 3, x, h, z, 4)
        box('#ffd700', 0.25, 0.5, 0.25, x, h + 3, z)
      }
      break
    }
    case 'windmill': {
      solidRect(Math.floor(x) - 1, Math.floor(z) - 1, 2, 2)
      cyl('#7a8089', 1.3, 1.0, x, 0, z)
      box('#efe7d6', 1.8, 3.2, 1.8, x, 1.0, z)
      box('#b23a2e', 2.1, 0.7, 2.1, x, 4.2, z)
      cone('#8a2f25', 1.5, 1.2, x, 4.9, z)
      const sails = new THREE.Group()
      const arm = new THREE.BoxGeometry(0.18, 2.8, 0.45)
      arm.translate(0, 1.5, 0)
      for (let i = 0; i < 4; i++) {
        const a = new THREE.Mesh(arm, matOf('#f2efe6'))
        a.rotation.x = (i * Math.PI) / 2
        a.castShadow = true
        sails.add(a)
      }
      sails.position.set(x - 1.05, 4.0, z)
      group.add(sails)
      animated.push(sails)
      break
    }
    case 'gate': {
      cyl('#9c4b2e', 0.9, 4.2, x - 1.3, 0, z)
      cone('#6f3320', 1.1, 1.3, x - 1.3, 4.2, z)
      cyl('#9c4b2e', 0.9, 4.2, x + 1.3, 0, z)
      cone('#6f3320', 1.1, 1.3, x + 1.3, 4.2, z)
      box('#9c4b2e', 3, 1.2, 1, x, 3.2, z)
      solidRect(Math.floor(x) - 2, Math.floor(z), 1, 1)
      solidRect(Math.floor(x) + 1, Math.floor(z), 1, 1)
      break
    }
    case 'station': {
      solidRect(Math.floor(x) - 3, Math.floor(z) - 1, 7, 2)
      box('#b8623a', 7, 2.6, 2, x, 0, z)
      box('#7a3f24', 7.2, 0.4, 2.2, x, 2.6, z)
      box('#a85636', 1.3, 3.8, 1.3, x, 0, z)
      box('#fff7e0', 0.7, 0.7, 0.1, x, 2.9, z - 1.0)
      cone('#5a2f1c', 1.1, 1.2, x, 3.8, z, 4)
      break
    }
    case 'school': {
      solidRect(Math.floor(x) - 1, Math.floor(z) - 1, 3, 2)
      box('#cf7a3a', 3, 2.4, 2, x, 0, z)
      box('#8f5024', 3.2, 0.4, 2.2, x, 2.4, z)
      box('#c84b3a', 3, 0.9, 2, x, 2.8, z)
      box('#bfe4ff', 0.5, 0.5, 0.1, x - 0.8, 1.2, z - 1.01)
      box('#bfe4ff', 0.5, 0.5, 0.1, x + 0.8, 1.2, z - 1.01)
      box('#3a6ff7', 0.6, 1.0, 0.12, x, 0, z - 1.02)
      box('#dddddd', 0.08, 2.6, 0.08, x + 1.8, 0, z)
      box('#ffd166', 0.9, 0.5, 0.06, x + 2.2, 2.5, z)
      break
    }
    case 'palace': {
      const w = o.w || 6
      solidRect(Math.floor(x) - ((w / 2) | 0), Math.floor(z) - 1, w, 3)
      box(o.color || '#cdbb94', w, 2.8, 3, x, 0, z)
      box('#b8a47e', w + 0.3, 0.4, 3.3, x, 2.8, z)
      for (let i = 0; i < w; i++) box('#e8dcc0', 0.18, 2.4, 0.18, x - w / 2 + 0.6 + i, 0, z - 1.45)
      if (o.cupola) {
        box('#9aa0a8', 1, 1, 1, x, 3.2, z)
        cone(o.spire || '#3f7d6e', 0.8, 1.6, x, 4.2, z, 8)
      }
      if (o.towers) {
        for (const sx of [-w / 2 + 0.6, w / 2 - 0.6]) {
          box(o.color || '#cdbb94', 1, 4.2, 1, x + sx, 0, z + 1)
          cone('#7a6a55', 0.8, 1.4, x + sx, 4.2, z + 1, 4)
        }
      }
      break
    }
    case 'museum': {
      const col = o.color || '#b06a3a'
      solidRect(Math.floor(x) - 2, Math.floor(z) - 1, 5, 3)
      box(col, 5, 2.8, 3, x, 0, z)
      box('#5a3320', 5.2, 0.5, 3.2, x, 2.8, z)
      for (const sx of [-1.8, 1.8]) {
        box(col, 1, 4.2, 1, x + sx, 0, z - 0.8)
        cone(o.spire || '#3f5e7d', 0.8, 1.6, x + sx, 4.2, z - 0.8, 4)
      }
      box('#3a2a1c', 1.2, 1.6, 0.2, x, 0, z - 1.5)
      break
    }
    case 'bridge': {
      solidRect(Math.floor(x), Math.floor(z) - 2, 1, 4)
      box('#cfd6df', 1.4, 0.3, 6, x, 0.2, z)
      const py = new THREE.Mesh(new THREE.BoxGeometry(0.4, 7, 0.4), matOf('#eef2f6'))
      py.position.set(x, 3.5, z - 1)
      py.rotation.x = 0.25
      py.castShadow = true
      group.add(py)
      for (let i = 0; i < 4; i++) box('#dfe6ee', 0.06, 0.06, 1.6 + i * 0.6, x, 6 - i * 0.9, z + 0.4 + i * 0.7)
      break
    }
    case 'archhall': {
      solidRect(Math.floor(x) - 2, Math.floor(z) - 1, 5, 2)
      box('#d8d2c6', 1, 5, 2, x - 2, 0, z)
      box('#d8d2c6', 1, 5, 2, x + 2, 0, z)
      box('#d8d2c6', 5, 1, 2, x, 5, z)
      box('#e8a23a', 3, 3, 0.2, x, 1, z)
      break
    }
    case 'cubes': {
      solidRect(Math.floor(x) - 1, Math.floor(z) - 1, 3, 2)
      for (const [cx, cz] of [[-1.4, 0], [0, 0.4], [1.4, 0]]) {
        box('#8a8f98', 0.25, 2, 0.25, x + cx, 0, z + cz)
        const cube = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.3, 1.3), matOf(o.color || '#e8c54a'))
        cube.position.set(x + cx, 2.7, z + cz)
        cube.rotation.set(0.6, 0.785, 0)
        cube.castShadow = true
        group.add(cube)
      }
      break
    }
    case 'greenhouse': {
      for (const [gx, gz] of [[-1.5, 0], [0, 0], [1.5, 0], [-1.5, 1.4], [0, 1.4], [1.5, 1.4]]) {
        box('#bfe9d4', 1.3, 1.0, 1.2, x + gx, 0, z + gz)
        cone('#d6f0ff', 1.0, 0.5, x + gx, 1.0, z + gz, 4)
      }
      solidRect(Math.floor(x) - 2, Math.floor(z) - 1, 4, 3)
      break
    }
    case 'miniature': {
      const cols = ['#c0563f', '#3f7d6e', '#caa23a', '#5a6bb0', '#b9774a', '#a85a8f']
      let i = 0
      for (const [mx, mz] of [[-1.5, -1], [-0.5, 0.5], [0.5, -0.8], [1.5, 0.3], [0, 1.2], [-1.2, 1], [1.2, 1.3]]) {
        const hh = 0.5 + (i % 3) * 0.35
        box(cols[i % cols.length], 0.6, hh, 0.6, x + mx, 0, z + mz)
        cone('#7a3f24', 0.45, 0.35, x + mx, hh, z + mz, 4)
        i++
      }
      solidRect(Math.floor(x) - 2, Math.floor(z) - 2, 4, 4)
      break
    }
    case 'beach': {
      box('#f0dca0', 8, 0.06, 7, x, 0, z)
      box('#3aa0d8', 8, 0.1, 4, x, 0, z + 5.5)
      for (let i = 0; i < 5; i++) box('#8a6240', 0.3, 0.6, 0.3, x - 2 + i, 0, z + 4)
      box('#a9784f', 5, 0.2, 1.2, x, 0.6, z + 4.5)
      solidRect(Math.floor(x) - 4, Math.floor(z) + 4, 8, 4)
      break
    }
    case 'square': {
      box('#bdb6a8', 6, 0.06, 6, x, 0, z)
      box('#8a8f98', 0.4, 1.6, 0.4, x, 0, z)
      box('#b9a06a', 0.5, 0.9, 0.3, x, 1.6, z)
      break
    }
    case 'canal': {
      box('#3aa0d8', 1, 0.12, 9, x, 0, z)
      solidRect(Math.floor(x), Math.floor(z) - 4, 1, 9)
      break
    }
    case 'stadium': {
      // voetbalstadion: ovaal van tribunes, groen veld, lichtmasten
      solidRect(Math.floor(x) - 3, Math.floor(z) - 2, 7, 5)
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2
        box('#8a9098', 1.1, 1.6 + (i % 2) * 0.35, 1.1, x + Math.cos(a) * 3, 0, z + Math.sin(a) * 2.2)
      }
      box('#3f8a2e', 4.2, 0.08, 2.6, x, 0, z)
      box('#ffffff', 0.1, 0.06, 2.0, x, 0.08, z)
      for (const [lx, lz] of [[-3.4, -2.6], [3.4, -2.6], [-3.4, 2.6], [3.4, 2.6]]) {
        box('#cfd6df', 0.14, 3.2, 0.14, x + lx, 0, z + lz)
        box('#fff7c0', 0.55, 0.3, 0.14, x + lx, 3.2, z + lz)
      }
      break
    }
    case 'ferriswheel': {
      // reuzenrad op de pier, met gekleurde bakjes (draait)
      solidRect(Math.floor(x) - 1, Math.floor(z) - 1, 2, 2)
      box('#a9784f', 5, 0.25, 1.8, x + 2.5, 0.4, z) // pier-dek naar het strand
      box('#9aa0a8', 0.25, 3.4, 0.25, x - 0.9, 0, z)
      box('#9aa0a8', 0.25, 3.4, 0.25, x + 0.9, 0, z)
      const wheel = new THREE.Group()
      const cabCols = ['#e63946', '#ffd166', '#3a6ff7', '#4caf50', '#9b5de5', '#ff7ab6', '#ff8c42', '#00b4d8']
      for (let i = 0; i < 4; i++) {
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.12, 4.6, 0.12), matOf('#dfe6ee'))
        spoke.rotation.z = (i / 4) * Math.PI
        wheel.add(spoke)
      }
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2
        const cab = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.45), matOf(cabCols[i]))
        cab.position.set(Math.cos(a) * 2.3, Math.sin(a) * 2.3, 0)
        wheel.add(cab)
      }
      wheel.position.set(x, 3.3, z)
      wheel.userData = { ax: 'z', sp: 0.25 }
      wheel.traverse((o) => {
        if (o.isMesh) o.castShadow = true
      })
      group.add(wheel)
      animated.push(wheel)
      break
    }
    case 'home': {
      // jullie eigen huis: baksteen, trapgevel, witte kozijnen, rode deur
      solidRect(Math.floor(x) - 1, Math.floor(z), 2, 1)
      box('#8a4632', 1.8, 2.6, 0.95, x, 0, z)
      box('#3c3744', 1.84, 0.2, 0.99, x, 0, z)
      box('#8a4632', 1.8, 0.3, 0.5, x, 2.6, z - 0.1)
      box('#8a4632', 1.2, 0.3, 0.5, x, 2.9, z - 0.1)
      box('#8a4632', 0.6, 0.3, 0.5, x, 3.2, z - 0.1)
      for (const wx of [-0.5, 0.5]) {
        for (const wy of [0.85, 1.85]) {
          box('#f4f1e8', 0.5, 0.5, 0.04, x + wx, wy - 0.06, z - 0.49)
          box('#bfe4ff', 0.38, 0.38, 0.05, x + wx, wy, z - 0.5)
        }
      }
      box('#f4f1e8', 0.4, 0.85, 0.04, x, 0, z - 0.49)
      box('#9c1f2e', 0.3, 0.75, 0.05, x, 0, z - 0.5)
      box('#ffd700', 0.14, 0.1, 0.03, x, 1.0, z - 0.52) // het huisnummer
      box('#3f8a2e', 0.45, 0.18, 0.16, x - 0.5, 0.52, z - 0.56) // bloembak
      box('#e63946', 0.35, 0.1, 0.12, x - 0.5, 0.7, z - 0.56)
      box('#3f8a2e', 0.45, 0.18, 0.16, x + 0.5, 0.52, z - 0.56)
      box('#ffd166', 0.35, 0.1, 0.12, x + 0.5, 0.7, z - 0.56)
      break
    }
    // 'label' (en onbekend): alleen een naambordje, geen gebouw
  }
}

export function buildCity(group, GRID, city) {
  const solids = new Set()
  const reserved = new Set()
  const buckets = {}
  const animated = []
  const cars = []

  const addGeo = (c, g) => (buckets[c] || (buckets[c] = [])).push(g)
  const box = (c, w, h, d, x, y, z) => {
    const g = new THREE.BoxGeometry(w, h, d)
    g.translate(x, y + h / 2, z)
    addGeo(c, g)
  }
  const cyl = (c, r, h, x, y, z, s = 8) => {
    const g = new THREE.CylinderGeometry(r, r, h, s)
    g.translate(x, y + h / 2, z)
    addGeo(c, g)
  }
  const cone = (c, r, h, x, y, z, s = 8) => {
    const g = new THREE.ConeGeometry(r, h, s)
    g.translate(x, y + h / 2, z)
    addGeo(c, g)
  }
  const solidRect = (x0, z0, w, d) => {
    for (let x = x0; x < x0 + w; x++) for (let z = z0; z < z0 + d; z++) solids.add(x + ',' + z)
  }
  const reserveRect = (x0, z0, w, d) => {
    for (let x = x0; x < x0 + w; x++) for (let z = z0; z < z0 + d; z++) reserved.add(x + ',' + z)
  }
  const label = (t, x, y, z, s) => {
    const sp = makeLabel(t, s)
    sp.position.set(x, y, z)
    group.add(sp)
  }
  const ctx = { box, cyl, cone, solidRect, reserveRect, group, animated }

  // De stad-data is ontworpen voor een 40-veld; schaal mee naar de echte grootte.
  const S = GRID / 40
  const STEP = 14 // grotere blokken = ruimere stad, plek voor parken en bossen
  const ROADS = []
  for (let r = STEP; r < GRID - 2; r += STEP) ROADS.push(r)
  const roadSet = new Set(ROADS)
  const onRoad = (v) => roadSet.has(v)
  const nearRoad = (v) => roadSet.has(v) || roadSet.has(v - 1) || roadSet.has(v + 1)
  // afstand tot dichtstbijzijnde weg per as (weg/stoep/blok herkennen)
  const distAxis = new Array(GRID)
  for (let v = 0; v < GRID; v++) {
    let d = 99
    for (const L of ROADS) d = Math.min(d, Math.abs(v - L))
    distAxis[v] = d
  }
  const isRoadCell = (x, z) => distAxis[x] <= 1 || distAxis[z] <= 1
  const isSideCell = (x, z) => !isRoadCell(x, z) && (distAxis[x] === 2 || distAxis[z] === 2)

  // stabiele willekeur per stad
  let citySeed = 0
  for (let i = 0; i < city.key.length; i++) citySeed = (citySeed * 31 + city.key.charCodeAt(i)) | 0
  let seed = (Math.abs(citySeed) % 9000) + 11
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }
  function blockType(bi, bj) {
    let h = (bi * 374761393 + bj * 668265263 + citySeed * 2654435761) | 0
    h = ((h ^ (h >> 13)) * 1274126177) | 0
    const r = ((h ^ (h >> 16)) >>> 0) / 4294967295
    if (r < 0.52) return 'res'
    if (r < 0.7) return 'park'
    if (r < 0.82) return 'forest'
    if (r < 0.92) return 'water'
    return 'plaza'
  }

  // basis-bouwstenen voor water (1 cel water = niet beloopbaar)
  const water = (x, z) => {
    if (x < 0 || z < 0 || x >= GRID || z >= GRID) return
    box('#3aa0d8', 1, 0.12, 1, x + 0.5, 0, z + 0.5)
    solids.add(x + ',' + z)
  }
  const deckCell = (x, z) => box('#9a6a3e', 1.1, 0.07, 1.1, x + 0.5, 0.04, z + 0.5)

  // Grachten (watertjes) met bruggen waar de wegen kruisen. De leuningen staan
  // langs de zijkanten (in de looprichting). Sommige bruggen zijn ophaalbruggen
  // die open en dicht gaan, met een bootje dat eronderdoor vaart.
  const drawbridges = []
  function fixedBridgeX(c, R) {
    // kanaal loopt langs z (kolom x=c); je loopt langs x over de brug
    box('#9a6a3e', 1.6, 0.08, 3.2, c + 0.5, 0.04, R + 0.5)
    box('#6f4a2e', 1.6, 0.32, 0.14, c + 0.5, 0.12, R - 0.95)
    box('#6f4a2e', 1.6, 0.32, 0.14, c + 0.5, 0.12, R + 1.95)
  }
  function fixedBridgeZ(c, R) {
    // kanaal loopt langs x (rij z=c); je loopt langs z over de brug
    box('#9a6a3e', 3.2, 0.08, 1.6, R + 0.5, 0.04, c + 0.5)
    box('#6f4a2e', 0.14, 0.32, 1.6, R - 0.95, 0.12, c + 0.5)
    box('#6f4a2e', 0.14, 0.32, 1.6, R + 1.95, 0.12, c + 0.5)
  }
  function makeDrawbridge(c, R, axis) {
    const wood = matOf('#9a6a3e')
    const dark = matOf('#5a3a22')
    const g = new THREE.Group()
    const cells =
      axis === 'x'
        ? [c + ',' + (R - 1), c + ',' + R, c + ',' + (R + 1)]
        : [R - 1 + ',' + c, R + ',' + c, R + 1 + ',' + c]
    // water loopt onder de brug door (zichtbaar als hij open staat)
    for (const k of cells) {
      const [gx, gz] = k.split(',').map(Number)
      box('#3aa0d8', 1, 0.12, 1, gx + 0.5, 0, gz + 0.5)
    }
    // wegdek dat omhoog klapt (pivot aan een kant)
    const deck =
      axis === 'x'
        ? new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.12, 2.9).translate(0.9, 0, 0), wood)
        : new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.12, 1.8).translate(0, 0, 0.9), wood)
    deck.castShadow = true
    if (axis === 'x') deck.position.set(c - 0.4, 0.16, R + 0.5)
    else deck.position.set(R + 0.5, 0.16, c - 0.4)
    // hijswerk: twee palen + bovenbalk + balansarm met contragewicht
    const postGeo = new THREE.BoxGeometry(0.22, 3.4, 0.22)
    const p1 = new THREE.Mesh(postGeo, dark)
    const p2 = new THREE.Mesh(postGeo, dark)
    let beam
    if (axis === 'x') {
      p1.position.set(c - 0.5, 1.7, R - 0.85)
      p2.position.set(c - 0.5, 1.7, R + 1.85)
      beam = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 3.0), dark)
      beam.position.set(c - 0.5, 3.4, R + 0.5)
    } else {
      p1.position.set(R - 0.85, 1.7, c - 0.5)
      p2.position.set(R + 1.85, 1.7, c - 0.5)
      beam = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.22, 0.22), dark)
      beam.position.set(R + 0.5, 3.4, c - 0.5)
    }
    const arm = new THREE.Group()
    const armBeam =
      axis === 'x'
        ? new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.14, 2.6).translate(1.0, 0, 0), dark)
        : new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.14, 2.0).translate(0, 0, 1.0), dark)
    const cw = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), dark)
    if (axis === 'x') cw.position.set(-0.45, 0, 0)
    else cw.position.set(0, 0, -0.45)
    arm.add(armBeam, cw)
    if (axis === 'x') arm.position.set(c - 0.5, 3.3, R + 0.5)
    else arm.position.set(R + 0.5, 3.3, c - 0.5)
    // bootje dat tijdens het openstaan langsvaart
    const boat = new THREE.Group()
    const hull = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.35, 2.0), matOf('#7a4a2a'))
    hull.position.y = 0.22
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.4, 0.7), matOf('#f2efe6'))
    cabin.position.set(0, 0.55, -0.25)
    boat.add(hull, cabin)
    boat.visible = false
    if (axis === 'z') boat.rotation.y = Math.PI / 2
    g.add(deck, p1, p2, beam, arm, boat)
    group.add(g)
    drawbridges.push({ deck, arm, boat, axis, c, R, cells, t: (c * 7 + R) % 12, blocked: false })
  }
  // ---- Plattegrond-bouwstenen: rivieren, grachten, ringen, vijvers, zee ----
  function riverV(fx, w, bridges) {
    for (let z = 4; z < GRID; z++) {
      const cx = Math.round(fx(z))
      if (bridges.some((R) => z >= R - 1 && z <= R + 1)) continue
      for (let x = Math.max(0, cx - (w >> 1)), n = 0; n < w && x < GRID; x++, n++) water(x, z)
    }
    for (const R of bridges) {
      const cx = Math.round(fx(R))
      box('#9a6a3e', w + 2, 0.09, 3.2, cx + 0.5, 0.04, R + 0.5)
      box('#6f4a2e', w + 2, 0.32, 0.14, cx + 0.5, 0.13, R - 0.95)
      box('#6f4a2e', w + 2, 0.32, 0.14, cx + 0.5, 0.13, R + 1.95)
    }
  }
  function riverH(fz, w, bridges) {
    for (let x = 0; x < GRID; x++) {
      const cz = Math.round(fz(x))
      if (bridges.some((R) => x >= R - 1 && x <= R + 1)) continue
      for (let z = Math.max(4, cz - (w >> 1)), n = 0; n < w && z < GRID; z++, n++) water(x, z)
    }
    for (const R of bridges) {
      const cz = Math.round(fz(R))
      box('#9a6a3e', 3.2, 0.09, w + 2, R + 0.5, 0.04, cz + 0.5)
      box('#6f4a2e', 0.14, 0.32, w + 2, R - 0.95, 0.13, cz + 0.5)
      box('#6f4a2e', 0.14, 0.32, w + 2, R + 1.95, 0.13, cz + 0.5)
    }
  }
  function canalV(c, z0, z1, drawRoad) {
    for (let z = Math.max(4, z0); z <= Math.min(GRID - 2, z1); z++) {
      if (nearRoad(z)) continue
      water(c, z)
    }
    for (const R of ROADS) {
      if (R < z0 || R > z1) continue
      if (R === drawRoad) makeDrawbridge(c, R, 'x')
      else fixedBridgeX(c, R)
    }
  }
  function canalH(c, x0, x1, drawRoad) {
    for (let x = Math.max(1, x0); x <= Math.min(GRID - 2, x1); x++) {
      if (nearRoad(x)) continue
      water(x, c)
    }
    for (const R of ROADS) {
      if (R < x0 || R > x1) continue
      if (R === drawRoad) makeDrawbridge(c, R, 'z')
      else fixedBridgeZ(c, R)
    }
  }
  function ringArc(cx, cz, r) {
    for (let x = Math.max(1, Math.floor(cx - r - 1)); x <= Math.min(GRID - 2, Math.ceil(cx + r + 1)); x++) {
      for (let z = Math.max(4, Math.floor(cz)); z <= Math.min(GRID - 2, Math.ceil(cz + r + 1)); z++) {
        const d = Math.hypot(x + 0.5 - cx, z + 0.5 - cz)
        if (Math.abs(d - r) >= 0.55) continue
        if (distAxis[x] <= 1 || distAxis[z] <= 1) deckCell(x, z)
        else water(x, z)
      }
    }
  }
  function rectRing(x0, z0, x1, z1) {
    for (let x = x0; x <= x1; x++)
      for (const z of [z0, z1]) {
        if (distAxis[x] <= 1 || distAxis[z] <= 1) deckCell(x, z)
        else water(x, z)
      }
    for (let z = z0; z <= z1; z++)
      for (const x of [x0, x1]) {
        if (distAxis[x] <= 1 || distAxis[z] <= 1) deckCell(x, z)
        else water(x, z)
      }
  }
  function bigPond(cx, cz, rx, rz) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++)
      for (let z = Math.floor(cz - rz); z <= Math.ceil(cz + rz); z++) {
        const nx = (x + 0.5 - cx) / rx
        const nz = (z + 0.5 - cz) / rz
        if (nx * nx + nz * nz <= 1 && distAxis[x] > 1 && distAxis[z] > 1) water(x, z)
      }
  }
  function bandWater(side, w) {
    if (side === 'north') for (let z = 0; z < w; z++) for (let x = 0; x < GRID; x++) water(x, z)
    if (side === 'west') for (let x = 0; x < w; x++) for (let z = 0; z < GRID; z++) water(x, z)
  }

  // De plattegrond per stad - herkenbaar van de echte kaart
  if (city.key === 'haarlem') {
    riverV((z) => GRID * 0.72 + Math.sin(z * 0.05) * 5, 4, [ROADS[3], ROADS[7]]) // het Spaarne
    canalV(Math.round(GRID * 0.56), Math.round(GRID * 0.1), Math.round(GRID * 0.6), ROADS[2]) // gracht in het centrum
  } else if (city.key === 'uithoorn') {
    riverH((x) => GRID * 0.82 + Math.sin(x * 0.04) * 5, 4, [ROADS[4], ROADS[8]]) // de Amstel
    canalV(Math.round(GRID * 0.3), Math.round(GRID * 0.35), Math.round(GRID * 0.8), ROADS[5])
  } else if (city.key === 'amsterdam') {
    bandWater('north', 8) // het IJ
    const rcx = GRID * 0.49
    const rcz = GRID * 0.27
    for (const r of [GRID * 0.19, GRID * 0.25, GRID * 0.31]) ringArc(rcx, rcz, r) // de grachtengordel
    canalV(Math.round(GRID * 0.66), Math.round(rcz), Math.round(GRID * 0.85), ROADS[6])
  } else if (city.key === 'rotterdam') {
    riverH((x) => GRID * 0.63 + Math.sin(x * 0.025) * 6, 9, [ROADS[3], ROADS[6]]) // de Nieuwe Maas
    canalV(Math.round(GRID * 0.72), Math.round(GRID * 0.76), GRID - 6, ROADS[8]) // de Oude Haven
  } else if (city.key === 'utrecht') {
    rectRing(Math.round(GRID * 0.3), Math.round(GRID * 0.3), Math.round(GRID * 0.66), Math.round(GRID * 0.66)) // de singel
    canalV(Math.round(GRID * 0.47), Math.round(GRID * 0.3), Math.round(GRID * 0.66), ROADS[5]) // de Oudegracht
  } else if (city.key === 'denhaag') {
    bandWater('west', 4) // de Noordzee
    box('#f0dca0', 3, 0.06, GRID, 5.5, 0, GRID / 2) // het strand
    reserveRect(4, 0, 3, GRID)
    bigPond(GRID * 0.49, GRID * 0.43, 7, 3.5) // de Hofvijver
    canalH(Math.round(GRID * 0.78), Math.round(GRID * 0.3), Math.round(GRID * 0.85), ROADS[6])
  }

  // ---- Spoorlijn met rijdende trein (in Amsterdam net onder het IJ, zoals echt) ----
  const trackRow = city.key === 'amsterdam' ? 10 : 1
  const trackMid = trackRow + 1.5
  for (let x = 0; x < GRID; x++) {
    solids.add(x + ',' + trackRow)
    solids.add(x + ',' + (trackRow + 1))
    solids.add(x + ',' + (trackRow + 2))
  }
  box('#8a8478', GRID, 0.05, 1.6, GRID / 2, 0, trackMid) // grindbed
  for (let x = 1; x < GRID - 1; x += 1) box('#6f4a2e', 0.5, 0.05, 0.95, x + 0.5, 0.02, trackMid) // bielzen
  box('#4a4a50', GRID, 0.06, 0.09, GRID / 2, 0.06, trackMid - 0.32) // rails
  box('#4a4a50', GRID, 0.06, 0.09, GRID / 2, 0.06, trackMid + 0.32)
  function makeWagon(len, isLoco) {
    const w = new THREE.Group()
    const body = new THREE.Mesh(new THREE.BoxGeometry(len, 0.8, 0.95), matOf('#ffc917')) // NS-geel
    body.position.y = 0.62
    body.castShadow = true
    const band = new THREE.Mesh(new THREE.BoxGeometry(len * 0.99, 0.3, 0.97), matOf('#003082')) // NS-blauw
    band.position.y = 0.32
    w.add(body, band)
    for (let i = -1; i <= 1; i++) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.28, 0.97), matOf('#bfe4ff'))
      win.position.set((i * len) / 3.4, 0.76, 0)
      w.add(win)
    }
    if (isLoco) {
      const nose = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.62, 0.9), matOf('#003082'))
      nose.position.set(len / 2 + 0.2, 0.5, 0)
      w.add(nose)
    }
    return w
  }
  const train = new THREE.Group()
  const loco = makeWagon(2.6, true)
  const wag1 = makeWagon(2.3, false)
  const wag2 = makeWagon(2.3, false)
  wag1.position.x = -2.7
  wag2.position.x = -5.2
  train.add(loco, wag1, wag2)
  train.position.set(GRID / 2, 0.1, trackMid)
  group.add(train)
  let trainPos = GRID / 2
  let trainDir = 1

  // Straten + stoepen + wegmarkering
  for (const R of ROADS) {
    box('#3a3f46', 3, 0.04, GRID, R + 0.5, 0, GRID / 2)
    box('#3a3f46', GRID, 0.04, 3, GRID / 2, 0, R + 0.5)
    for (const d of [-2, 2]) {
      box('#9aa0a8', 1, 0.05, GRID, R + d + 0.5, 0.005, GRID / 2) // stoep
      box('#9aa0a8', GRID, 0.05, 1, GRID / 2, 0.005, R + d + 0.5)
    }
    for (let t = 1; t < GRID; t += 2) {
      box('#e8c54a', 0.12, 0.05, 0.5, R + 0.5, 0.012, t + 0.25)
      box('#e8c54a', 0.5, 0.05, 0.12, t + 0.25, 0.012, R + 0.5)
    }
  }

  // Herkenningspunten
  const landmarks = []
  for (const lm of city.landmarks) {
    const lx = lm.x * S
    const lz = lm.z * S
    reserveRect(Math.floor(lx) - 2, Math.floor(lz) - 2, 5, 5)
    buildLandmark(ctx, { ...lm, x: lx, z: lz })
    label(lm.label || lm.name, lx, lm.labelY || 6, lz, lm.labelScale || 1.1)
    landmarks.push({ name: lm.name, x: lx, z: lz, fact: lm.fact })
  }

  // Bouwstenen
  const palette = city.palette
  const greens = ['#4f9e35', '#3f8a2e', '#5aa83f', '#469a36']
  const roofCols = ['#8a4a3a', '#5a5a5a', '#7a3f24', '#3f4e5e', '#6e3b4a']
  function house(x, z) {
    if (x < 1 || z < 1 || x >= GRID - 1 || z >= GRID - 1) return
    const k = x + ',' + z
    if (solids.has(k) || reserved.has(k)) return
    solids.add(k)
    const col = palette[(rnd() * palette.length) | 0]
    const tall = rnd() < (city.tall || 0.15) // Rotterdam veel hoogbouw, Amsterdam smal en hoog
    const h = tall ? 3.2 + rnd() * 3.6 : 1.5 + rnd() * 1.3
    box(col, 0.92, h, 0.92, x + 0.5, 0, z + 0.5)
    box('#3c3744', 0.96, 0.22, 0.96, x + 0.5, 0, z + 0.5) // plint
    // ramen: 1 of 2 kolommen, met witte kozijnen
    const twoCols = rnd() < 0.55
    const rows = Math.max(1, Math.min(6, Math.floor(h / 0.95)))
    const colsX = twoCols ? [-0.21, 0.21] : [0]
    for (let r = 0; r < rows; r++) {
      const wy = 0.78 + r * 0.9
      if (wy > h - 0.35) break
      for (const wx of colsX) {
        box('#f4f1e8', twoCols ? 0.3 : 0.42, 0.4, 0.03, x + 0.5 + wx, wy - 0.05, z + 0.025) // kozijn
        box('#bfe4ff', twoCols ? 0.22 : 0.32, 0.3, 0.04, x + 0.5 + wx, wy, z + 0.03) // glas
      }
    }
    // deur met kozijn en een stoepje
    const doorCol = ['#3a2a1c', '#7a1f2b', '#1f4d3a', '#2b3a6e'][(rnd() * 4) | 0]
    box('#f4f1e8', 0.34, 0.76, 0.03, x + 0.5, 0, z + 0.035)
    box(doorCol, 0.26, 0.68, 0.05, x + 0.5, 0, z + 0.04)
    box('#9aa0a8', 0.4, 0.07, 0.18, x + 0.5, 0, z - 0.06)
    // dak: vijf varianten (plat, trapgevel, zadeldak, puntdak, klokgevel)
    const roofCol = roofCols[(rnd() * roofCols.length) | 0]
    const st = rnd()
    if (tall || st > 0.78) {
      box('#5a5a5a', 0.98, 0.14, 0.98, x + 0.5, h, z + 0.5)
      box('#6e6e72', 0.6, 0.1, 0.6, x + 0.5, h + 0.14, z + 0.5)
    } else if (st > 0.56) {
      box(col, 0.92, 0.32, 0.5, x + 0.5, h, z + 0.2)
      box(col, 0.6, 0.32, 0.5, x + 0.5, h + 0.32, z + 0.2)
      box(col, 0.3, 0.32, 0.5, x + 0.5, h + 0.64, z + 0.2)
    } else if (st > 0.36) {
      box(roofCol, 0.98, 0.3, 0.78, x + 0.5, h, z + 0.5)
      box(roofCol, 0.98, 0.28, 0.4, x + 0.5, h + 0.3, z + 0.5)
    } else if (st > 0.16) {
      cone(roofCol, 0.78, 0.8, x + 0.5, h, z + 0.5, 4)
    } else {
      box(col, 0.7, 0.3, 0.5, x + 0.5, h, z + 0.2)
      box(col, 0.42, 0.28, 0.5, x + 0.5, h + 0.3, z + 0.2)
      box(col, 0.2, 0.24, 0.5, x + 0.5, h + 0.58, z + 0.2)
    }
    if (rnd() < 0.3) box('#7a4538', 0.16, 0.5, 0.16, x + 0.18, h - 0.05, z + 0.7) // schoorsteen
  }
  function tree(x, z) {
    const k = x + ',' + z
    if (solids.has(k) || reserved.has(k)) return
    solids.add(k)
    box('#7a5230', 0.3, 1.0, 0.3, x + 0.5, 0, z + 0.5)
    box(greens[(rnd() * greens.length) | 0], 1.0 + rnd() * 0.3, 1.1, 1.0 + rnd() * 0.3, x + 0.5, 1.0, z + 0.5)
  }
  function pond(x, z) {
    const k = x + ',' + z
    if (solids.has(k) || reserved.has(k)) return
    solids.add(k)
    box('#3aa0d8', 1, 0.1, 1, x + 0.5, 0, z + 0.5)
  }

  // Bomen op de stoep
  for (const R of ROADS) {
    for (let t = 4; t < GRID - 3; t += 3) {
      if (distAxis[t] >= 3 && rnd() < 0.5) tree(R - 2, t)
      if (distAxis[t] >= 3 && rnd() < 0.5) tree(R + 2, t)
    }
  }

  // Blokken vullen: huizen aan de straat, en blokken als park / bos / vijver / plein
  for (let x = 1; x < GRID - 1; x++) {
    for (let z = 1; z < GRID - 1; z++) {
      if (isRoadCell(x, z) || isSideCell(x, z)) continue
      const k = x + ',' + z
      if (solids.has(k) || reserved.has(k)) continue
      const facesStreet = distAxis[x] === 3 || distAxis[z] === 3
      const bi = Math.floor(x / STEP)
      const bj = Math.floor(z / STEP)
      const type = blockType(bi, bj)
      const cx = bi * STEP + STEP / 2
      const cz = bj * STEP + STEP / 2
      const dd = (x + 0.5 - cx) * (x + 0.5 - cx) + (z + 0.5 - cz) * (z + 0.5 - cz)
      if (type === 'res') {
        if (facesStreet) {
          if (rnd() > 0.25) house(x, z)
        } else if (rnd() < 0.06) tree(x, z)
      } else if (type === 'park') {
        if (dd < STEP * STEP * 0.032) pond(x, z)
        else if (rnd() < 0.18) tree(x, z)
      } else if (type === 'forest') {
        if (rnd() < 0.48) tree(x, z)
      } else if (type === 'water') {
        if (dd < STEP * STEP * 0.1) pond(x, z)
        else if (rnd() < 0.1) tree(x, z)
      } else {
        box('#bdb6a8', 1, 0.05, 1, x + 0.5, 0, z + 0.5)
        if (Math.abs(x + 0.5 - cx) < 0.9 && Math.abs(z + 0.5 - cz) < 0.9) {
          box('#8a8f98', 0.4, 1.6, 0.4, x + 0.5, 0, z + 0.5)
          box('#b9a06a', 0.5, 0.9, 0.3, x + 0.5, 1.6, z + 0.5)
        }
      }
    }
  }

  // Auto's
  function makeCar(color) {
    const g = new THREE.Group()
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.3, 1.3), matOf(color))
    body.position.y = 0.3
    body.castShadow = true
    const cab = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.28, 0.7), matOf('#cfe8ff'))
    cab.position.set(0, 0.55, -0.05)
    const wheelGeo = new THREE.BoxGeometry(0.18, 0.22, 0.28)
    for (const [wx, wz] of [[-0.34, 0.4], [0.34, 0.4], [-0.34, -0.4], [0.34, -0.4]]) {
      const w = new THREE.Mesh(wheelGeo, matOf('#1a1a1f'))
      w.position.set(wx, 0.15, wz)
      g.add(w)
    }
    g.add(body, cab)
    return g
  }
  const carColors = ['#e63946', '#3a6ff7', '#f4a93a', '#2a2f3a', '#ffffff', '#5cb85c', '#9b5de5', '#d23f8f']
  let ci = 0
  for (let i = 0; i < ROADS.length; i += 2) {
    const R = ROADS[i]
    const c1 = makeCar(carColors[ci++ % carColors.length])
    group.add(c1)
    cars.push({ mesh: c1, axis: 'z', fixed: R + 0.5, pos: rnd() * GRID, dir: rnd() < 0.5 ? 1 : -1, speed: 3.0 })
    const c2 = makeCar(carColors[ci++ % carColors.length])
    group.add(c2)
    cars.push({ mesh: c2, axis: 'x', fixed: R + 0.5, pos: rnd() * GRID, dir: rnd() < 0.5 ? 1 : -1, speed: 3.0 })
  }

  // Statische blokken samenvoegen (snel op mobiel)
  for (const color in buckets) {
    const merged = mergeGeometries(buckets[color], false)
    if (!merged) continue
    const m = new THREE.Mesh(merged, matOf(color))
    m.castShadow = true
    m.receiveShadow = true
    group.add(m)
  }

  return {
    solids,
    landmarks,
    start: city.start || START,
    drawbridges,
    train,
    update(dt) {
      for (const s of animated) s.rotation[s.userData.ax || 'x'] += dt * (s.userData.sp || 0.7)
      for (const car of cars) {
        car.pos += car.dir * car.speed * dt
        if (car.pos > GRID - 1) {
          car.pos = GRID - 1
          car.dir = -1
        } else if (car.pos < 1) {
          car.pos = 1
          car.dir = 1
        }
        if (car.axis === 'z') {
          car.mesh.position.set(car.fixed, 0, car.pos)
          car.mesh.rotation.y = car.dir > 0 ? 0 : Math.PI
        } else {
          car.mesh.position.set(car.pos, 0, car.fixed)
          car.mesh.rotation.y = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2
        }
      }
      // ophaalbruggen: dicht -> open (weg geblokkeerd) -> bootje vaart door -> dicht
      const T1 = 9
      const T2 = 2.2
      const T3 = 6
      const T4 = 2.2
      const TT = T1 + T2 + T3 + T4
      for (const b of drawbridges) {
        b.t = (b.t + dt) % TT
        let a = 0
        if (b.t < T1) a = 0
        else if (b.t < T1 + T2) a = (b.t - T1) / T2
        else if (b.t < T1 + T2 + T3) a = 1
        else a = 1 - (b.t - T1 - T2 - T3) / T4
        const ang = a * 1.15
        if (b.axis === 'x') {
          b.deck.rotation.z = ang
          b.arm.rotation.z = ang * 0.92
        } else {
          b.deck.rotation.x = -ang
          b.arm.rotation.x = -ang * 0.92
        }
        const blocked = a > 0.03
        if (blocked !== b.blocked) {
          b.blocked = blocked
          for (const k of b.cells) {
            if (blocked) solids.add(k)
            else solids.delete(k)
          }
        }
        const openStart = T1 + T2
        if (b.t >= openStart - 0.4 && b.t <= openStart + T3 + 0.4) {
          const p = Math.min(1, Math.max(0, (b.t - openStart + 0.4) / (T3 + 0.8)))
          const off = -8 + 16 * p
          b.boat.visible = true
          if (b.axis === 'x') b.boat.position.set(b.c + 0.5, 0.02, b.R + 0.5 + off)
          else b.boat.position.set(b.R + 0.5 + off, 0.02, b.c + 0.5)
        } else b.boat.visible = false
      }
      // trein rijdt heen en weer over het spoor
      trainPos += trainDir * 7 * dt
      if (trainPos > GRID - 6) {
        trainPos = GRID - 6
        trainDir = -1
      } else if (trainPos < 6) {
        trainPos = 6
        trainDir = 1
      }
      train.position.x = trainPos
      train.scale.x = trainDir
    },
  }
}

// ---------- De steden ----------
const HOUSE_NL = ['#c0563f', '#3f7d6e', '#caa23a', '#5a6bb0', '#b9774a', '#7a9a52', '#a85a8f', '#c98a3a']

export const CITIES = [
  {
    key: 'haarlem',
    name: 'Haarlem',
    palette: HOUSE_NL,
    start: START,
    landmarks: [
      { name: 'Grote Kerk', type: 'church', x: 19.5, z: 19.5, opts: { tower: 7, spire: '#3f7d6e' }, labelY: 11.5, labelScale: 1.2, fact: 'De Grote Kerk staat op de Grote Markt en heeft een wereldberoemd orgel. Mozart speelde erop toen hij nog maar 10 jaar oud was!' },
      { name: 'Het Spaarne', type: 'label', x: 28, z: 24, labelY: 1.8, fact: 'Het Spaarne is de rivier van Haarlem. Hij slingert dwars door de stad, met bruggen eroverheen.' },
      { name: 'Molen De Adriaan', type: 'windmill', x: 33, z: 9, labelY: 7.2, fact: 'Molen De Adriaan staat aan het Spaarne. Vroeger werd er onder andere tabak en verf gemaakt.' },
      { name: 'Amsterdamse Poort', type: 'gate', x: 26, z: 13, labelY: 6.4, fact: 'De Amsterdamse Poort is meer dan 600 jaar oud. Hij staat vlak bij het Spaarne, net als in het echt.' },
      { name: 'Lange Herenvest 16', type: 'home', x: 27.5, z: 14.5, labelY: 5.0, labelScale: 1.2, fact: 'Dit is jullie huis aan de Lange Herenvest, vlak bij de Amsterdamse Poort en het Spaarne. Zwaai maar naar de buren!' },
      { name: 'Station Haarlem', type: 'station', x: 19.5, z: 6, labelY: 5.6, fact: 'Vanaf Haarlem reed in 1839 de allereerste trein van Nederland!' },
      { name: 'Veronicaschool', type: 'school', x: 9, z: 31, labelY: 5.8, labelScale: 1.3, fact: 'Dit is jouw school! Hier leer je lezen, rekenen en spelen met al je vriendjes.' },
      { name: 'Grote Markt', type: 'square', x: 30, z: 30, labelY: 3.2, fact: 'Op de Grote Markt is vaak markt. Hier staat ook het standbeeld van Laurens Janszoon Coster.' },
    ],
  },
  {
    key: 'uithoorn',
    name: 'Uithoorn',
    palette: HOUSE_NL,
    start: START,
    landmarks: [
      { name: 'Thamerkerk', type: 'church', x: 19.5, z: 30, opts: { tower: 6, spire: '#7a3f24' }, labelY: 10.5, fact: 'De Thamerkerk is een oud kerkje aan de Amstel. Het staat er al honderden jaren.' },
      { name: 'De Amstel', type: 'label', x: 28, z: 33, labelY: 1.6, fact: 'De Amstel is de rivier die van Uithoorn helemaal naar Amsterdam stroomt.' },
      { name: 'Bloemenkas', type: 'greenhouse', x: 9, z: 12, labelY: 3.0, fact: 'Rond Uithoorn staan veel kassen. Daar groeien bloemen die over de hele wereld worden verkocht.' },
      { name: 'De Schans', type: 'square', x: 30, z: 12, labelY: 3.2, fact: 'De Schans is het oude hart van Uithoorn, vroeger met een gracht eromheen.' },
      { name: 'Station', type: 'station', x: 19.5, z: 6, labelY: 5.6, fact: 'Vroeger reed er een stoomtreintje door Uithoorn: de "Bello"!' },
    ],
  },
  {
    key: 'amsterdam',
    name: 'Amsterdam',
    palette: ['#7a4a32', '#8a5a3a', '#6a4028', '#9a6a44', '#5a3a26', '#a87a52'],
    tall: 0.25,
    start: START,
    landmarks: [
      { name: 'Koninklijk Paleis', type: 'palace', x: 19.5, z: 19.5, opts: { w: 6, color: '#cdbb94', cupola: true }, labelY: 6.0, fact: 'Op de Dam staat het Koninklijk Paleis. Soms werkt of woont de koning hier.' },
      { name: 'Rijksmuseum', type: 'museum', x: 19.5, z: 31, opts: { color: '#b06a3a' }, labelY: 6.0, fact: 'In het Rijksmuseum hangt het beroemde schilderij De Nachtwacht van Rembrandt.' },
      { name: 'Centraal Station', type: 'station', x: 19.5, z: 4.2, labelY: 5.6, fact: 'Amsterdam Centraal is een groot, prachtig station aan het IJ. Achter het station vaart de pont over het water.' },
      { name: 'Westertoren', type: 'tower', x: 6.5, z: 19.5, opts: { h: 11, spire: '#2f6fae' }, labelY: 14.5, fact: 'De Westertoren is de hoogste kerktoren van Amsterdam, met een blauwe kroon bovenop.' },
      { name: 'Grachtengordel', type: 'label', x: 22.5, z: 17.5, labelY: 2.0, fact: 'De grachtengordel zijn drie halve ringen van grachten om het centrum. Ze staan op de werelderfgoedlijst!' },
    ],
  },
  {
    key: 'rotterdam',
    name: 'Rotterdam',
    palette: ['#8a9098', '#9aa0a8', '#7a8088', '#aab0b8', '#6a7078', '#b8bec6'],
    tall: 0.4,
    start: START,
    landmarks: [
      { name: 'Erasmusbrug', type: 'bridge', x: 14, z: 26.7, labelY: 8.5, fact: 'De Erasmusbrug over de Nieuwe Maas heet ook "De Zwaan", omdat hij op een witte zwaan lijkt.' },
      { name: 'De Kuip', type: 'stadium', x: 17, z: 34, labelY: 5.0, labelScale: 1.2, fact: 'De Kuip is het beroemde stadion van Feyenoord, aan de zuidkant van de Maas.' },
      { name: 'Euromast', type: 'tower', x: 6.5, z: 19.5, opts: { h: 13, style: 'modern' }, labelY: 16.0, fact: 'De Euromast is een hoge toren. Vanaf boven zie je de hele stad en de grote haven.' },
      { name: 'Markthal', type: 'archhall', x: 31, z: 19.5, labelY: 7.0, fact: 'De Markthal is een grote hal vol eten, met een reuzenschildering van fruit op het plafond.' },
      { name: 'Kubuswoningen', type: 'cubes', x: 19.5, z: 12, opts: { color: '#e8c54a' }, labelY: 5.5, fact: 'De kubuswoningen zijn huizen die schuin op hun punt staan, net dobbelstenen.' },
      { name: 'Het Witte Huis', type: 'tower', x: 31, z: 21, opts: { h: 9, spire: '#eeeeee' }, labelY: 12.5, fact: 'Het Witte Huis aan de noordkant van de Maas was lang geleden het hoogste kantoor van heel Europa.' },
    ],
  },
  {
    key: 'utrecht',
    name: 'Utrecht',
    palette: HOUSE_NL,
    start: START,
    landmarks: [
      { name: 'Domtoren', type: 'tower', x: 19.5, z: 19.5, opts: { h: 15, spire: '#7a6a55' }, labelY: 19.0, labelScale: 1.2, fact: 'De Domtoren staat vlak naast de Oudegracht en is de hoogste kerktoren van Nederland: meer dan 112 meter!' },
      { name: 'Nijntje Museum', type: 'museum', x: 9, z: 31, opts: { color: '#ff8c42', spire: '#e63946' }, labelY: 6.0, fact: 'In Utrecht is een museum over Nijntje, het tekenkonijntje van Dick Bruna.' },
      { name: 'Centraal Station', type: 'station', x: 19.5, z: 6, labelY: 5.6, fact: 'Utrecht Centraal is het drukste treinstation van Nederland, midden in het land.' },
      { name: 'De Oudegracht', type: 'label', x: 18.2, z: 22, labelY: 2.0, fact: 'De Oudegracht loopt dwars door het centrum, binnen de singel. Bij het water liggen werven met oude kelders.' },
    ],
  },
  {
    key: 'denhaag',
    name: 'Den Haag',
    palette: HOUSE_NL,
    start: START,
    landmarks: [
      { name: 'Binnenhof', type: 'palace', x: 19.5, z: 19.5, opts: { w: 6, color: '#b89a6a', towers: true }, labelY: 6.2, fact: 'In het Binnenhof maken de regering en de Tweede Kamer de regels voor heel Nederland. Ervoor ligt de Hofvijver.' },
      { name: 'Vredespaleis', type: 'palace', x: 9, z: 12, opts: { w: 5, color: '#a8552e', cupola: true, spire: '#7a3f24' }, labelY: 6.2, fact: 'In het Vredespaleis praten landen met elkaar om ruzie en oorlog te voorkomen.' },
      { name: 'Madurodam', type: 'miniature', x: 30, z: 12, labelY: 3.0, fact: 'Madurodam is een minipark met heel Nederland in het klein, waar je doorheen kunt lopen.' },
      { name: 'Scheveningen', type: 'label', x: 2.2, z: 24, labelY: 3.0, fact: 'Scheveningen is het strand van Den Haag, aan de Noordzee. Je kunt er zwemmen en zandkastelen bouwen.' },
      { name: 'De Pier', type: 'ferriswheel', x: 1.5, z: 15, labelY: 7.5, fact: 'Op de pier van Scheveningen staat een reuzenrad. Vanuit de bakjes kijk je over de zee!' },
      { name: 'De Hofvijver', type: 'label', x: 19.6, z: 15.8, labelY: 1.8, fact: 'De Hofvijver is de vijver naast het Binnenhof. Hij ligt er al honderden jaren!' },
    ],
  },
]
