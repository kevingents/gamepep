// De stad Haarlem als grote speelwereld, opgebouwd uit blokken.
// Straten, veel huizen (samengevoegd voor snelheid), bomen, rijdende auto's,
// een gracht met grachtenpandjes, het Spaarne en herkenningspunten met
// naambordjes + weetjes: Grote Kerk, Molen De Adriaan, Amsterdamse Poort,
// Station en de Veronicaschool.
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

const matCache = {}
const matOf = (c) => (matCache[c] || (matCache[c] = new THREE.MeshLambertMaterial({ color: c })))

export function buildHaarlem(group, GRID) {
  const solids = new Set()
  const reserved = new Set() // beloopbaar, maar hier komen geen huizen (pleinen)
  const buckets = {} // kleur -> [geometrie in wereld-positie]
  const animated = []
  const cars = []

  const addGeo = (color, g) => (buckets[color] || (buckets[color] = [])).push(g)
  function box(color, w, h, d, x, y, z) {
    const g = new THREE.BoxGeometry(w, h, d)
    g.translate(x, y + h / 2, z)
    addGeo(color, g)
  }
  function cylG(color, r, h, x, y, z, seg = 8) {
    const g = new THREE.CylinderGeometry(r, r, h, seg)
    g.translate(x, y + h / 2, z)
    addGeo(color, g)
  }
  function coneG(color, r, h, x, y, z, seg = 8) {
    const g = new THREE.ConeGeometry(r, h, seg)
    g.translate(x, y + h / 2, z)
    addGeo(color, g)
  }
  const solidRect = (x0, z0, w, d) => {
    for (let x = x0; x < x0 + w; x++) for (let z = z0; z < z0 + d; z++) solids.add(x + ',' + z)
  }
  const reserveRect = (x0, z0, w, d) => {
    for (let x = x0; x < x0 + w; x++) for (let z = z0; z < z0 + d; z++) reserved.add(x + ',' + z)
  }

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
  const label = (text, x, y, z, scale) => {
    const s = makeLabel(text, scale)
    s.position.set(x, y, z)
    group.add(s)
  }

  const ROADS = [7, 14, 21, 28, 35]
  const onRoad = (v) => ROADS.indexOf(v) !== -1

  // ---- Spaarne (water langs de oostkant) ----
  box('#3aa0d8', 4, 0.12, GRID, GRID - 2, 0, GRID / 2)
  solidRect(GRID - 4, 0, 4, GRID)

  // ---- Straten + wegmarkering ----
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

  // ---- Grote Markt + Grote Kerk (Sint-Bavo), in het midden ----
  reserveRect(15, 15, 9, 9)
  box('#bdb6a8', 9, 0.06, 9, 19.5, 0, 19.5) // plaveisel
  solidRect(18, 18, 3, 3)
  box('#9aa0a8', 3.4, 3.4, 3, 19.5, 0, 19.5)
  coneG('#6f7780', 2.4, 1.4, 19.5, 3.4, 19.5, 4)
  box('#aab0b8', 2, 7, 2, 19.5, 0, 19.5)
  coneG('#3f7d6e', 1.5, 3.4, 19.5, 7, 19.5, 4)
  box('#ffd700', 0.3, 0.6, 0.3, 19.5, 10.4, 19.5)
  label('Grote Kerk', 19.5, 11.6, 19.5, 1.2)
  label('Grote Markt', 23, 1.7, 23.5, 0.9)

  // ---- Station Haarlem (noordrand) ----
  reserveRect(15, 1, 10, 4)
  solidRect(16, 2, 7, 2)
  box('#b8623a', 7, 2.6, 2, 19.5, 0, 3)
  box('#7a3f24', 7.2, 0.4, 2.2, 19.5, 2.6, 3)
  box('#a85636', 1.3, 3.8, 1.3, 19.5, 0, 3)
  box('#fff7e0', 0.7, 0.7, 0.1, 19.5, 2.9, 2.1)
  coneG('#5a2f1c', 1.1, 1.2, 19.5, 3.8, 3, 4)
  label('Station Haarlem', 19.5, 5.6, 3, 1.0)

  // ---- Veronicaschool (zijn eigen school) ----
  reserveRect(3, 29, 6, 6)
  solidRect(4, 30, 3, 2)
  box('#cf7a3a', 3, 2.4, 2, 5.5, 0, 31)
  box('#8f5024', 3.2, 0.4, 2.2, 5.5, 2.4, 31)
  box('#c84b3a', 3, 0.9, 2, 5.5, 2.8, 31)
  box('#bfe4ff', 0.5, 0.5, 0.1, 4.7, 1.2, 29.98)
  box('#bfe4ff', 0.5, 0.5, 0.1, 6.3, 1.2, 29.98)
  box('#3a6ff7', 0.6, 1.0, 0.12, 5.5, 0, 29.96)
  box('#dddddd', 0.08, 2.6, 0.08, 7.3, 0, 31)
  box('#ffd166', 0.9, 0.5, 0.06, 7.7, 2.5, 31)
  for (let x = 3; x <= 8; x++) {
    box('#cfd6df', 0.1, 0.5, 0.1, x + 0.5, 0, 29)
    box('#cfd6df', 0.1, 0.5, 0.1, x + 0.5, 0, 34)
  }
  label('Veronicaschool', 5.5, 5.8, 31, 1.3)

  // ---- Amsterdamse Poort (westelijke ingang aan de straat) ----
  reserveRect(1, 19, 4, 5)
  cylG('#9c4b2e', 0.9, 4.2, 2.4, 0, 20)
  coneG('#6f3320', 1.1, 1.3, 2.4, 4.2, 20)
  cylG('#9c4b2e', 0.9, 4.2, 2.4, 0, 23)
  coneG('#6f3320', 1.1, 1.3, 2.4, 4.2, 23)
  box('#9c4b2e', 1, 1.3, 3, 2.4, 3.3, 21.5)
  solids.add('2,20')
  solids.add('2,23')
  label('Amsterdamse Poort', 2.4, 6.4, 21.5, 1.0)

  // ---- Molen De Adriaan (aan het Spaarne) ----
  const mx = GRID - 3
  const mz = 9
  cylG('#7a8089', 1.3, 1.0, mx, 0, mz)
  box('#efe7d6', 1.8, 3.2, 1.8, mx, 1.0, mz)
  box('#b23a2e', 2.1, 0.7, 2.1, mx, 4.2, mz)
  coneG('#8a2f25', 1.5, 1.2, mx, 4.9, mz)
  const sails = new THREE.Group()
  const armGeo = new THREE.BoxGeometry(0.18, 2.8, 0.45)
  armGeo.translate(0, 1.5, 0)
  for (let i = 0; i < 4; i++) {
    const arm = new THREE.Mesh(armGeo, matOf('#f2efe6'))
    arm.rotation.x = (i * Math.PI) / 2
    arm.castShadow = true
    sails.add(arm)
  }
  sails.add(new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), matOf('#5a3a22')))
  sails.position.set(mx - 1.05, 4.0, mz)
  group.add(sails)
  animated.push(sails)
  label('Molen De Adriaan', mx - 1, 7.2, mz, 1.05)

  // ---- Gracht met grachtenpandjes ----
  box('#3aa0d8', 12, 0.1, 1, 14, 0, 25.5) // water
  for (let x = 8; x <= 19; x++) solids.add(x + ',25')
  reserveRect(8, 26, 12, 1)
  const houseColors = ['#c0563f', '#3f7d6e', '#caa23a', '#5a6bb0', '#b9774a', '#7a9a52', '#a85a8f']
  for (let i = 0; i < 12; i++) {
    const hx = 8 + i
    if (onRoad(hx)) continue
    solids.add(hx + ',26')
    const col = houseColors[i % houseColors.length]
    box(col, 0.92, 2.6, 0.92, hx + 0.5, 0, 26.5)
    box(col, 0.92, 0.4, 0.5, hx + 0.5, 2.6, 26.3)
    box(col, 0.6, 0.4, 0.5, hx + 0.5, 3.0, 26.3)
    box(col, 0.3, 0.4, 0.5, hx + 0.5, 3.4, 26.3)
    box('#cfeaff', 0.3, 0.3, 0.1, hx + 0.5, 1.4, 25.98)
  }
  label('Grachten', 14, 4.2, 26.5, 0.85)

  // ---- Gewone huizen langs alle straten ----
  const palette = ['#c0563f', '#3f7d6e', '#caa23a', '#5a6bb0', '#b9774a', '#7a9a52', '#a85a8f', '#c98a3a', '#6d8ab0']
  let seed = 1
  const rnd = () => {
    // simpele deterministische "random" zodat de stad elke keer hetzelfde is
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }
  function tryHouse(x, z) {
    if (x < 1 || z < 1 || x >= GRID - 4 || z >= GRID - 1) return
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
      coneG('#7a3f24', 0.75, 0.6, x + 0.5, h, z + 0.5, 4)
    }
    box('#cfeaff', 0.3, 0.3, 0.06, x + 0.5, 1.2, z + 0.03)
    box('#3a2a1c', 0.24, 0.6, 0.06, x + 0.5, 0, z + 0.03)
  }
  // huizen staan iets van de weg af (stoep ertussen) -> straten i.p.v. tunnels
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

  // ---- Bomen langs de straten (decoratief, je loopt eronderdoor) ----
  function tryTree(x, z) {
    if (x < 1 || z < 1 || x >= GRID - 4 || z >= GRID - 1) return
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

  // ---- Auto's die rondrijden ----
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

  // ---- Alle statische blokken samenvoegen (snel op mobiel) ----
  for (const color in buckets) {
    const merged = mergeGeometries(buckets[color], false)
    if (!merged) continue
    const m = new THREE.Mesh(merged, matOf(color))
    m.castShadow = true
    m.receiveShadow = true
    group.add(m)
  }

  const landmarks = [
    { name: 'Grote Kerk', x: 19.5, z: 22.5, fact: 'De Grote Kerk staat op de Grote Markt en heeft een wereldberoemd orgel. Mozart speelde erop toen hij nog maar 10 jaar oud was!' },
    { name: 'Molen De Adriaan', x: GRID - 6, z: 9, fact: 'Molen De Adriaan staat aan het Spaarne. Vroeger werd er in de molen onder andere tabak en verf gemaakt.' },
    { name: 'Amsterdamse Poort', x: 4, z: 21.5, fact: 'De Amsterdamse Poort is meer dan 600 jaar oud. Vroeger ging je hier de stad Haarlem binnen.' },
    { name: 'Station Haarlem', x: 19.5, z: 6, fact: 'Vanaf Haarlem reed in 1839 de allereerste trein van Nederland! Het station is prachtig versierd.' },
    { name: 'Het Spaarne', x: GRID - 6, z: 20, fact: 'Het Spaarne is de rivier van Haarlem. Er varen bootjes en je kunt er gezellig langs wandelen.' },
    { name: 'Grote Markt', x: 24, z: 16, fact: 'Op de Grote Markt is vaak markt. Hier staat ook het standbeeld van Laurens Janszoon Coster.' },
    { name: 'Grachten', x: 14, z: 27.5, fact: 'Deze oude huisjes hebben trapjes bovenaan: dat heet een trapgevel. Ze zijn honderden jaren oud.' },
    { name: 'Veronicaschool', x: 5.5, z: 33, fact: 'Dit is jouw school! Hier leer je lezen, rekenen en spelen met al je vriendjes.' },
  ]

  return {
    solids,
    landmarks,
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
