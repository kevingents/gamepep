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

  // Water (langs de randen, zodat de stad niet wordt doorgesneden)
  for (const w of city.waters || []) {
    box('#3aa0d8', w.w, 0.12, w.d, w.x + w.w / 2, 0, w.z + w.d / 2)
    solidRect(w.x, w.z, w.w, w.d)
  }

  // Straten + markering
  for (const R of ROADS) {
    box('#3a3f46', 1, 0.04, GRID, R + 0.5, 0, GRID / 2)
    box('#3a3f46', GRID, 0.04, 1, GRID / 2, 0, R + 0.5)
  }
  for (const R of ROADS) {
    for (let t = 1; t < GRID; t += 2) {
      box('#e8c54a', 0.12, 0.05, 0.5, R + 0.5, 0.01, t + 0.25)
      box('#e8c54a', 0.5, 0.05, 0.12, t + 0.25, 0.01, R + 0.5)
    }
  }

  // Herkenningspunten eerst (zodat er geen huizen overheen komen)
  const landmarks = []
  for (const lm of city.landmarks) {
    reserveRect(Math.floor(lm.x) - 2, Math.floor(lm.z) - 2, 5, 5)
    buildLandmark(ctx, lm)
    label(lm.label || lm.name, lm.x, lm.labelY || 6, lm.z, lm.labelScale || 1.1)
    landmarks.push({ name: lm.name, x: lm.x, z: lm.z, fact: lm.fact })
  }

  // Huizen langs de straten (een stukje van de weg af)
  const palette = city.palette
  let seed = 7
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }
  function tryHouse(x, z) {
    if (x < 1 || z < 1 || x >= GRID - 1 || z >= GRID - 1) return
    const k = x + ',' + z
    if (solids.has(k) || reserved.has(k)) return
    if (rnd() < 0.24) return
    solids.add(k)
    const col = palette[(rnd() * palette.length) | 0]
    const h = 1.5 + rnd() * 1.0
    box(col, 0.92, h, 0.92, x + 0.5, 0, z + 0.5)
    if (rnd() < 0.55) {
      box(col, 0.92, 0.35, 0.5, x + 0.5, h, z + 0.2)
      box(col, 0.6, 0.35, 0.5, x + 0.5, h + 0.35, z + 0.2)
      box(col, 0.3, 0.35, 0.5, x + 0.5, h + 0.7, z + 0.2)
    } else {
      cone('#7a3f24', 0.75, 0.6, x + 0.5, h, z + 0.5, 4)
    }
    box('#cfeaff', 0.3, 0.3, 0.06, x + 0.5, 1.2, z + 0.03)
    box('#3a2a1c', 0.24, 0.6, 0.06, x + 0.5, 0, z + 0.03)
  }
  for (const R of ROADS) {
    for (let z = 1; z < GRID - 1; z++) {
      if (onRoad(z)) continue
      tryHouse(R - 2, z)
      tryHouse(R + 2, z)
    }
    for (let x = 1; x < GRID - 1; x++) {
      if (onRoad(x)) continue
      tryHouse(x, R - 2)
      tryHouse(x, R + 2)
    }
  }

  // Bomen op de stoep
  function tryTree(x, z) {
    if (x < 1 || z < 1 || x >= GRID - 1 || z >= GRID - 1) return
    const k = x + ',' + z
    if (solids.has(k) || reserved.has(k)) return
    if (rnd() < 0.45) return
    box('#7a5230', 0.3, 1.0, 0.3, x + 0.5, 0, z + 0.5)
    box('#4f9e35', 1.0, 1.1, 1.0, x + 0.5, 1.0, z + 0.5)
  }
  for (const R of ROADS) {
    for (let z = 2; z < GRID - 2; z += 2) {
      tryTree(R - 1, z)
      tryTree(R + 1, z)
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
  for (const R of ROADS) {
    const c1 = makeCar(carColors[ci++ % carColors.length])
    group.add(c1)
    cars.push({ mesh: c1, axis: 'z', fixed: R + 0.5, pos: rnd() * GRID, dir: rnd() < 0.5 ? 1 : -1, speed: 2.6 })
    const c2 = makeCar(carColors[ci++ % carColors.length])
    group.add(c2)
    cars.push({ mesh: c2, axis: 'x', fixed: R + 0.5, pos: rnd() * GRID, dir: rnd() < 0.5 ? 1 : -1, speed: 2.6 })
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
    update(dt) {
      for (const s of animated) s.rotation.x += dt * 0.7
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
    waters: [{ x: 36, z: 0, w: 4, d: 40 }],
    landmarks: [
      { name: 'Grote Kerk', type: 'church', x: 19.5, z: 19.5, opts: { tower: 7, spire: '#3f7d6e' }, labelY: 11.5, labelScale: 1.2, fact: 'De Grote Kerk staat op de Grote Markt en heeft een wereldberoemd orgel. Mozart speelde erop toen hij nog maar 10 jaar oud was!' },
      { name: 'Molen De Adriaan', type: 'windmill', x: 33, z: 9, labelY: 7.2, fact: 'Molen De Adriaan staat aan het Spaarne. Vroeger werd er onder andere tabak en verf gemaakt.' },
      { name: 'Amsterdamse Poort', type: 'gate', x: 6.5, z: 12, labelY: 6.4, fact: 'De Amsterdamse Poort is meer dan 600 jaar oud. Vroeger ging je hier de stad Haarlem binnen.' },
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
    waters: [{ x: 0, z: 36, w: 40, d: 4 }],
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
    start: START,
    waters: [{ x: 36, z: 0, w: 4, d: 40 }],
    landmarks: [
      { name: 'Koninklijk Paleis', type: 'palace', x: 19.5, z: 19.5, opts: { w: 6, color: '#cdbb94', cupola: true }, labelY: 6.0, fact: 'Op de Dam staat het Koninklijk Paleis. Soms werkt of woont de koning hier.' },
      { name: 'Rijksmuseum', type: 'museum', x: 19.5, z: 31, opts: { color: '#b06a3a' }, labelY: 6.0, fact: 'In het Rijksmuseum hangt het beroemde schilderij De Nachtwacht van Rembrandt.' },
      { name: 'Centraal Station', type: 'station', x: 19.5, z: 6, labelY: 5.6, fact: 'Amsterdam Centraal is een groot, prachtig station waar heel veel treinen komen.' },
      { name: 'Westertoren', type: 'tower', x: 6.5, z: 19.5, opts: { h: 11, spire: '#2f6fae' }, labelY: 14.5, fact: 'De Westertoren is de hoogste kerktoren van Amsterdam, met een blauwe kroon bovenop.' },
      { name: 'Grachten', type: 'canal', x: 30, z: 24, labelY: 2.0, fact: 'Amsterdam heeft honderden grachten met bruggen. Je kunt er met een bootje doorheen varen.' },
    ],
  },
  {
    key: 'rotterdam',
    name: 'Rotterdam',
    palette: ['#8a9098', '#9aa0a8', '#7a8088', '#aab0b8', '#6a7078', '#b8bec6'],
    start: START,
    waters: [{ x: 0, z: 36, w: 40, d: 4 }],
    landmarks: [
      { name: 'Erasmusbrug', type: 'bridge', x: 19.5, z: 33, labelY: 8.5, fact: 'De Erasmusbrug heet ook "De Zwaan", omdat hij op een witte zwaan lijkt.' },
      { name: 'Euromast', type: 'tower', x: 6.5, z: 19.5, opts: { h: 13, style: 'modern' }, labelY: 16.0, fact: 'De Euromast is een hoge toren. Vanaf boven zie je de hele stad en de grote haven.' },
      { name: 'Markthal', type: 'archhall', x: 31, z: 19.5, labelY: 7.0, fact: 'De Markthal is een grote hal vol eten, met een reuzenschildering van fruit op het plafond.' },
      { name: 'Kubuswoningen', type: 'cubes', x: 19.5, z: 12, opts: { color: '#e8c54a' }, labelY: 5.5, fact: 'De kubuswoningen zijn huizen die schuin op hun punt staan, net dobbelstenen.' },
      { name: 'Het Witte Huis', type: 'tower', x: 31, z: 30, opts: { h: 9, spire: '#eeeeee' }, labelY: 12.5, fact: 'Het Witte Huis in Rotterdam was lang geleden het hoogste kantoor van heel Europa.' },
    ],
  },
  {
    key: 'utrecht',
    name: 'Utrecht',
    palette: HOUSE_NL,
    start: START,
    waters: [{ x: 36, z: 0, w: 4, d: 40 }],
    landmarks: [
      { name: 'Domtoren', type: 'tower', x: 19.5, z: 19.5, opts: { h: 15, spire: '#7a6a55' }, labelY: 19.0, labelScale: 1.2, fact: 'De Domtoren is de hoogste kerktoren van Nederland: meer dan 112 meter hoog!' },
      { name: 'Nijntje Museum', type: 'museum', x: 9, z: 31, opts: { color: '#ff8c42', spire: '#e63946' }, labelY: 6.0, fact: 'In Utrecht is een museum over Nijntje, het tekenkonijntje van Dick Bruna.' },
      { name: 'Centraal Station', type: 'station', x: 19.5, z: 6, labelY: 5.6, fact: 'Utrecht Centraal is het drukste treinstation van Nederland, midden in het land.' },
      { name: 'De Werven', type: 'canal', x: 30, z: 24, labelY: 2.0, fact: 'De grachten van Utrecht hebben werven: lage kades bij het water met oude kelders.' },
    ],
  },
  {
    key: 'denhaag',
    name: 'Den Haag',
    palette: HOUSE_NL,
    start: START,
    waters: [],
    landmarks: [
      { name: 'Binnenhof', type: 'palace', x: 19.5, z: 19.5, opts: { w: 6, color: '#b89a6a', towers: true }, labelY: 6.2, fact: 'In het Binnenhof maken de regering en de Tweede Kamer de regels voor heel Nederland.' },
      { name: 'Vredespaleis', type: 'palace', x: 9, z: 12, opts: { w: 5, color: '#a8552e', cupola: true, spire: '#7a3f24' }, labelY: 6.2, fact: 'In het Vredespaleis praten landen met elkaar om ruzie en oorlog te voorkomen.' },
      { name: 'Madurodam', type: 'miniature', x: 30, z: 12, labelY: 3.0, fact: 'Madurodam is een minipark met heel Nederland in het klein, waar je doorheen kunt lopen.' },
      { name: 'Scheveningen', type: 'beach', x: 19.5, z: 31, labelY: 3.5, fact: 'Scheveningen is het strand van Den Haag, met een lange pier en de zee.' },
    ],
  },
]
