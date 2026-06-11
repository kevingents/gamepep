// De stad Haarlem als speelwereld, opgebouwd uit blokken.
// Herkenningspunten met naambordjes: Grote Kerk (Sint-Bavo), Molen De Adriaan
// (met draaiende wieken), Amsterdamse Poort, Station, het Spaarne, grachten-
// huisjes, de Grote Markt en de Veronicaschool.
import * as THREE from 'three'

const matCache = {}
function matOf(c) {
  if (!matCache[c]) matCache[c] = new THREE.MeshLambertMaterial({ color: c })
  return matCache[c]
}

// Blok met de onderkant op hoogte y (de "grond" van het blok).
function box(group, w, h, d, color, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matOf(color))
  m.position.set(x, y + h / 2, z)
  m.castShadow = true
  m.receiveShadow = true
  group.add(m)
  return m
}
function cyl(group, r, h, color, x, y, z, seg = 8) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), matOf(color))
  m.position.set(x, y + h / 2, z)
  m.castShadow = true
  m.receiveShadow = true
  group.add(m)
  return m
}
function cone(group, r, h, color, x, y, z, seg = 8) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), matOf(color))
  m.position.set(x, y + h / 2, z)
  m.castShadow = true
  group.add(m)
  return m
}

function solidRect(solids, x0, z0, w, d) {
  for (let x = x0; x < x0 + w; x++) for (let z = z0; z < z0 + d; z++) solids.add(x + ',' + z)
}

function makeLabel(text, scale = 1) {
  const fs = 34
  const c = document.createElement('canvas')
  let ctx = c.getContext('2d')
  ctx.font = 'bold ' + fs + 'px Trebuchet MS, Arial, sans-serif'
  const tw = Math.ceil(ctx.measureText(text).width)
  c.width = tw + 30
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
  const aspect = c.width / c.height
  const bh = 0.95 * scale
  spr.scale.set(bh * aspect, bh, 1)
  return spr
}
function label(group, text, x, y, z, scale) {
  const s = makeLabel(text, scale)
  s.position.set(x, y, z)
  group.add(s)
}

export function buildHaarlem(group, GRID) {
  const solids = new Set()
  const animated = []

  // ---- Het Spaarne (water langs de oostkant) ----
  box(group, 5, 0.12, GRID, '#3aa0d8', GRID - 2.5, 0, GRID / 2)
  solidRect(solids, GRID - 5, 0, 5, GRID)

  // ---- Molen De Adriaan (op de oostoever, achter het water) ----
  const mx = GRID - 2
  const mz = 5
  cyl(group, 1.3, 1.0, '#7a8089', mx, 0, mz) // stenen voet
  box(group, 1.8, 3.2, 1.8, '#efe7d6', mx, 1.0, mz) // romp (achthoekig benaderd met blok)
  box(group, 2.1, 0.7, 2.1, '#b23a2e', mx, 4.2, mz) // kap (rood)
  cone(group, 1.5, 1.2, '#8a2f25', mx, 4.9, mz, 8)
  // wieken (draaien), aan de westkant naar de speler toe
  const sails = new THREE.Group()
  const armGeo = new THREE.BoxGeometry(0.18, 2.8, 0.45)
  armGeo.translate(0, 1.5, 0)
  for (let i = 0; i < 4; i++) {
    const arm = new THREE.Mesh(armGeo, matOf('#f2efe6'))
    arm.rotation.x = (i * Math.PI) / 2
    arm.castShadow = true
    sails.add(arm)
  }
  const hub = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), matOf('#5a3a22'))
  sails.add(hub)
  sails.position.set(mx - 1.05, 4.0, mz)
  group.add(sails)
  animated.push(sails)
  label(group, 'Molen De Adriaan', mx - 1, 7.2, mz, 1.05)

  // ---- Grote Markt (geplaveide plein in het midden) ----
  box(group, 9, 0.06, 7, '#bdb6a8', 11.5, 0, 11)
  label(group, 'Grote Markt', 14.5, 1.6, 13.5, 0.85)

  // ---- Grote Kerk / Sint-Bavo (op de Markt) ----
  solidRect(solids, 9, 9, 4, 3)
  box(group, 4, 3.2, 3, '#9aa0a8', 11, 0, 10.5) // schip
  cone(group, 2.6, 1.4, '#6f7780', 11, 3.2, 10.5, 4) // dak
  box(group, 2, 6.5, 2, '#aab0b8', 11, 0, 10.5) // toren
  cone(group, 1.5, 3.2, '#3f7d6e', 11, 6.5, 10.5, 4) // groene torenspits
  box(group, 0.3, 0.6, 0.3, '#ffd700', 11, 9.7, 10.5) // gouden top
  label(group, 'Grote Kerk', 11, 11.0, 10.5, 1.15)

  // ---- Amsterdamse Poort (stadspoort, westelijke ingang) ----
  const px = 4
  const pz = 15
  cyl(group, 0.9, 4, '#9c4b2e', px - 1.3, 0, pz)
  cone(group, 1.1, 1.3, '#6f3320', px - 1.3, 4, pz)
  cyl(group, 0.9, 4, '#9c4b2e', px + 1.3, 0, pz)
  cone(group, 1.1, 1.3, '#6f3320', px + 1.3, 4, pz)
  box(group, 2.6, 1.2, 1, '#9c4b2e', px, 3.2, pz) // boog erboven
  solids.add(px - 2 + ',' + pz)
  solids.add(px - 1 + ',' + pz)
  solids.add(px + 1 + ',' + pz)
  // het middelste vak (px, pz) blijft vrij: je loopt door de poort
  label(group, 'Amsterdamse Poort', px, 6.2, pz, 1.0)

  // ---- Station Haarlem (bovenrand) ----
  solidRect(solids, 6, 2, 6, 2)
  box(group, 6, 2.4, 2, '#b8623a', 9, 0, 3) // gebouw
  box(group, 6, 0.4, 2, '#7a3f24', 9, 2.4, 3) // dakrand
  box(group, 1.2, 3.6, 1.2, '#a85636', 9, 0, 3) // kleine klokkentoren
  box(group, 0.7, 0.7, 0.1, '#fff7e0', 9, 2.7, 2.0) // klok
  cone(group, 1.0, 1.1, '#5a2f1c', 9, 3.6, 3, 4)
  label(group, 'Station Haarlem', 9, 5.3, 3, 1.0)

  // ---- Veronicaschool (zijn eigen school!) ----
  const sx = 4.5
  const sz = 19
  solidRect(solids, 3, 18, 3, 2)
  box(group, 3, 2.2, 2, '#cf7a3a', sx, 0, sz) // bakstenen gebouw
  box(group, 3.2, 0.4, 2.2, '#8f5024', sx, 2.2, sz) // dakrand
  box(group, 3, 0.9, 2, '#c84b3a', sx, 2.6, sz) // rood dak
  // raampjes
  box(group, 0.5, 0.5, 0.1, '#bfe4ff', sx - 0.8, 1.2, sz - 1.01)
  box(group, 0.5, 0.5, 0.1, '#bfe4ff', sx + 0.8, 1.2, sz - 1.01)
  box(group, 0.5, 0.5, 0.1, '#bfe4ff', sx - 0.8, 1.2, sz + 1.01)
  box(group, 0.5, 0.5, 0.1, '#bfe4ff', sx + 0.8, 1.2, sz + 1.01)
  box(group, 0.6, 1.0, 0.12, '#3a6ff7', sx, 0, sz - 1.02) // deur
  // vlaggenmast met vlag
  box(group, 0.08, 2.5, 0.08, '#dddddd', sx + 1.7, 2.6, sz)
  box(group, 0.9, 0.5, 0.06, '#ffd166', sx + 2.1, 4.6, sz)
  // schoolplein-hekje (laag, je kunt ertussen lopen)
  for (let x = 2; x <= 7; x++) {
    box(group, 0.1, 0.5, 0.1, '#cfd6df', x, 0, 17)
    box(group, 0.1, 0.5, 0.1, '#cfd6df', x, 0, 21.5)
  }
  label(group, 'Veronicaschool', sx, 5.6, sz, 1.25)

  // ---- Grachtenhuisjes (kleurige trapgeveltjes) ----
  const houseColors = ['#c0563f', '#3f7d6e', '#caa23a', '#5a6bb0', '#b9774a', '#7a9a52', '#a85a8f']
  for (let i = 0; i < houseColors.length; i++) {
    const hx = 8 + i
    const hz = 16
    solids.add(hx + ',' + hz)
    const col = houseColors[i]
    box(group, 0.92, 2.4, 0.92, col, hx + 0.5, 0, hz + 0.5)
    // trapgevel
    box(group, 0.92, 0.4, 0.5, col, hx + 0.5, 2.4, hz + 0.3)
    box(group, 0.6, 0.4, 0.5, col, hx + 0.5, 2.8, hz + 0.3)
    box(group, 0.3, 0.4, 0.5, col, hx + 0.5, 3.2, hz + 0.3)
    // deur + raam
    box(group, 0.25, 0.6, 0.1, '#3a2a1c', hx + 0.5, 0, hz + 0.97)
    box(group, 0.3, 0.3, 0.1, '#cfeaff', hx + 0.5, 1.3, hz + 0.97)
  }
  label(group, 'Grachten', 11.5, 4.0, 16.5, 0.8)

  // ---- Een paar bomen op het gras ----
  const treeSpots = [
    [15, 6],
    [16, 13],
    [6, 11],
    [13, 21],
    [3, 8],
    [17, 19],
  ]
  for (const [tx, tz] of treeSpots) {
    if (solids.has(tx + ',' + tz)) continue
    solids.add(tx + ',' + tz)
    box(group, 0.35, 1.1, 0.35, '#7a5230', tx + 0.5, 0, tz + 0.5)
    box(group, 1.1, 1.1, 1.1, '#4f9e35', tx + 0.5, 1.1, tz + 0.5)
  }

  return {
    solids,
    update(dt) {
      for (const s of animated) s.rotation.x += dt * 0.7
    },
  }
}
