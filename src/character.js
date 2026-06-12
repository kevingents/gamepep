// Het popje: opgebouwd uit blokjes. Veel instelbaar (huid, kapsel, haarkleur,
// shirt, broek, schoenen, bril, pet). Keuzes worden onthouden (localStorage).
import * as THREE from 'three'

// Onderdelen voor het maak-scherm. type 'color' = kleurvakje, 'text' = keuze met
// woord, 'colorNone' = kleuren met een 'geen'-optie vooraan.
export const PARTS = [
  { key: 'skin', label: 'Huid', type: 'color', options: ['#e0a878', '#c68642', '#8d5524', '#f1c27d', '#ffe0bd', '#5c3a21'] },
  { key: 'hairStyle', label: 'Kapsel', type: 'text', options: ['Kort', 'Lang', 'Stekels', 'Kaal'] },
  { key: 'hair', label: 'Haarkleur', type: 'color', options: ['#5a3a22', '#2b2b2b', '#caa472', '#a0451f', '#dddddd', '#e8b84b', '#7a4ba0', '#e0556f'] },
  { key: 'shirt', label: 'Shirt', type: 'color', options: ['#18a3a3', '#e63946', '#ffd166', '#4caf50', '#3a6ff7', '#9b5de5', '#ffffff', '#ff7ab6', '#222831', '#ff8c42', '#00b4d8'] },
  { key: 'pants', label: 'Broek', type: 'color', options: ['#34408c', '#2b2b3a', '#7a5230', '#5a5a5a', '#1b6b3a', '#8a2f25', '#3a6ff7'] },
  { key: 'shoes', label: 'Schoenen', type: 'color', options: ['#2b2b2b', '#ffffff', '#e63946', '#3a6ff7', '#ffd166', '#7a5230', '#4caf50'] },
  { key: 'glasses', label: 'Bril', type: 'text', options: ['Geen', 'Zwart', 'Zonnebril'] },
  { key: 'hat', label: 'Pet', type: 'colorNone', options: ['geen', '#e63946', '#ffd166', '#3a6ff7', '#1b6b3a', '#ffffff', '#222831', '#ff7ab6'] },
]

export const DEFAULT_CFG = { skin: 0, hairStyle: 0, hair: 0, shirt: 0, pants: 0, shoes: 0, glasses: 0, hat: 0 }

const colorAt = (key, i) => {
  const p = PARTS.find((x) => x.key === key)
  return p.options[i] || p.options[0]
}

export function loadCfg() {
  try {
    const raw = localStorage.getItem('haarlem_popje')
    if (raw) return { ...DEFAULT_CFG, ...JSON.parse(raw) }
  } catch (e) {}
  return { ...DEFAULT_CFG }
}
export function saveCfg(cfg) {
  try {
    localStorage.setItem('haarlem_popje', JSON.stringify(cfg))
  } catch (e) {}
}

const mat = (c) => new THREE.MeshLambertMaterial({ color: c })
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d)
// geometrie met de oorsprong bovenaan (hangt naar beneden) -> armen/benen draaien
// netjes vanuit de heup/schouder
function hang(w, h, d) {
  const g = new THREE.BoxGeometry(w, h, d)
  g.translate(0, -h / 2, 0)
  return g
}

// Bouw een winkel-item (hoed/bril/vleugels/cape/schoenen/hand-ding) als losse
// meshjes, klaar om aan het popje te hangen. Geeft { meshes, head, wings } terug.
const TOP = 2.16 // bovenkant hoofd
const FRONT = -0.27 // voorkant gezicht
function buildAccessory(key) {
  const out = []
  let head = false
  let wings = null
  const add = (geo, color, x, y, z, rx, ry, rz) => {
    const m = new THREE.Mesh(geo, mat(color))
    m.position.set(x, y, z)
    m.rotation.set(rx || 0, ry || 0, rz || 0)
    out.push(m)
    return m
  }
  const Cone = (r, h, s = 8) => new THREE.ConeGeometry(r, h, s)
  const Cyl = (r, h, s = 10) => new THREE.CylinderGeometry(r, r, h, s)
  const Sph = (r) => new THREE.SphereGeometry(r, 10, 8)
  // een paar vleugels die kunnen klapperen
  const makeWings = (color, w, h) => {
    head = false
    const g = box(0.16, h, 0.05)
    g.translate(0, -h / 2, 0)
    const l = add(g, color, -0.18, 1.82, 0.18, 0, 0, 0.5)
    const r = add(g.clone(), color, 0.18, 1.82, 0.18, 0, 0, -0.5)
    wings = [l, r]
  }
  switch (key) {
    // ---------- Hoofd ----------
    case 'kroon':
      head = true
      add(box(0.46, 0.13, 0.46), '#ffd700', 0, TOP + 0.06, 0)
      for (const kx of [-0.16, 0, 0.16]) add(box(0.08, 0.13, 0.08), '#ffd700', kx, TOP + 0.16, 0)
      add(box(0.08, 0.08, 0.04), '#e63946', 0, TOP + 0.08, FRONT + 0.04)
      break
    case 'tiara':
      head = true
      add(box(0.46, 0.06, 0.2), '#ffe066', 0, TOP + 0.04, 0)
      add(Cone(0.06, 0.16, 4), '#ffe066', 0, TOP + 0.14, FRONT + 0.06)
      add(Sph(0.05), '#ff7ab6', 0, TOP + 0.14, FRONT + 0.02)
      break
    case 'hoed':
      head = true
      add(box(0.58, 0.06, 0.58), '#5a2d8a', 0, TOP, 0)
      add(Cone(0.24, 0.62, 6), '#5a2d8a', 0, TOP + 0.32, 0)
      add(box(0.1, 0.1, 0.03), '#ffd166', 0, TOP + 0.24, FRONT + 0.1)
      break
    case 'heks':
      head = true
      add(box(0.62, 0.06, 0.62), '#1f4d3a', 0, TOP, 0)
      add(Cone(0.24, 0.7, 6), '#2e7d52', 0, TOP + 0.36, 0)
      break
    case 'pet':
      head = true
      add(box(0.54, 0.18, 0.54), '#e63946', 0, TOP + 0.04, 0)
      add(box(0.5, 0.06, 0.3), '#c32f3b', 0, TOP - 0.02, FRONT - 0.06)
      break
    case 'kapitein':
      head = true
      add(box(0.56, 0.2, 0.56), '#16243f', 0, TOP + 0.05, 0)
      add(box(0.5, 0.06, 0.26), '#0e1a2e', 0, TOP - 0.02, FRONT - 0.04)
      add(box(0.14, 0.1, 0.03), '#ffd166', 0, TOP + 0.08, FRONT + 0.02)
      break
    case 'hoge_hoed':
      head = true
      add(box(0.62, 0.05, 0.62), '#16161e', 0, TOP, 0)
      add(Cyl(0.22, 0.5), '#16161e', 0, TOP + 0.27, 0)
      add(box(0.46, 0.08, 0.46), '#e63946', 0, TOP + 0.04, 0)
      break
    case 'feesthoed':
      head = true
      add(Cone(0.22, 0.5, 12), '#ff5bb0', 0, TOP + 0.26, 0)
      add(Sph(0.08), '#ffd166', 0, TOP + 0.52, 0)
      break
    case 'cowboy':
      head = true
      add(box(0.78, 0.05, 0.7), '#8a5a33', 0, TOP, 0)
      add(box(0.42, 0.22, 0.42), '#6e4426', 0, TOP + 0.1, 0)
      break
    case 'piraat':
      head = true
      add(box(0.66, 0.16, 0.5), '#16161e', 0, TOP + 0.04, 0)
      add(box(0.66, 0.06, 0.18), '#16161e', 0, TOP + 0.12, FRONT - 0.02, 0.3, 0, 0)
      add(box(0.1, 0.1, 0.03), '#f2f2f2', 0, TOP + 0.06, FRONT + 0.02)
      break
    case 'kok':
      head = true
      add(box(0.5, 0.18, 0.5), '#f4f4f4', 0, TOP + 0.02, 0)
      add(box(0.56, 0.26, 0.56), '#fbfbfb', 0, TOP + 0.22, 0)
      break
    case 'helm':
      head = true
      add(box(0.56, 0.4, 0.56), '#aeb6c6', 0, TOP - 0.02, 0)
      add(box(0.08, 0.34, 0.1), '#8a93a6', 0, 1.9, FRONT - 0.02)
      add(Cone(0.05, 0.2, 6), '#e63946', 0, TOP + 0.28, 0)
      break
    case 'ruimtehelm':
      head = true
      add(Sph(0.42), '#bfe4ff', 0, 1.95, 0)
      add(box(0.5, 0.12, 0.5), '#dfe6ee', 0, 1.66, 0)
      break
    case 'muts':
      head = true
      add(box(0.56, 0.3, 0.56), '#3a6ff7', 0, TOP + 0.04, 0)
      add(box(0.6, 0.1, 0.6), '#2a52c0', 0, TOP - 0.08, 0)
      add(Sph(0.09), '#ffffff', 0, TOP + 0.24, 0)
      break
    case 'bloemenkrans':
      head = true
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2
        add(Sph(0.07), ['#ff7ab6', '#ffd166', '#7ad1ff', '#9be15d'][i % 4], Math.cos(a) * 0.28, TOP - 0.04, Math.sin(a) * 0.28)
      }
      break
    case 'gewei':
      head = true
      for (const sx of [-1, 1]) {
        add(box(0.06, 0.4, 0.06), '#7a4a28', sx * 0.16, TOP + 0.16, 0, 0, 0, sx * 0.3)
        add(box(0.06, 0.2, 0.06), '#7a4a28', sx * 0.3, TOP + 0.34, 0, 0, 0, sx * 0.7)
      }
      break
    case 'propeller':
      head = true
      add(box(0.5, 0.16, 0.5), '#e63946', 0, TOP + 0.02, 0)
      add(box(0.5, 0.06, 0.3), '#ffd166', 0, TOP - 0.04, FRONT - 0.06)
      add(box(0.5, 0.04, 0.06), '#3a6ff7', 0, TOP + 0.22, 0)
      add(box(0.06, 0.04, 0.5), '#3a6ff7', 0, TOP + 0.22, 0)
      break
    case 'zonnehoed':
      head = true
      add(box(0.86, 0.05, 0.78), '#ffe08a', 0, TOP - 0.02, 0)
      add(box(0.42, 0.16, 0.42), '#ffd166', 0, TOP + 0.06, 0)
      add(box(0.44, 0.06, 0.44), '#ff7ab6', 0, TOP + 0.02, 0)
      break
    // ---------- Gezicht ----------
    case 'bril_rond':
      add(box(0.16, 0.16, 0.04), '#2a2f3a', -0.12, 1.95, FRONT - 0.02)
      add(box(0.16, 0.16, 0.04), '#2a2f3a', 0.12, 1.95, FRONT - 0.02)
      add(box(0.12, 0.04, 0.04), '#2a2f3a', 0, 1.95, FRONT - 0.02)
      break
    case 'zonnebril':
      add(box(0.46, 0.16, 0.05), '#0e0e14', 0, 1.95, FRONT - 0.02)
      add(box(0.5, 0.05, 0.05), '#16161e', 0, 2.0, FRONT - 0.02)
      break
    case 'snor':
      add(box(0.28, 0.07, 0.06), '#3a2a1c', 0, 1.83, FRONT - 0.01)
      break
    case 'masker':
      add(box(0.52, 0.16, 0.04), '#16161e', 0, 1.96, FRONT - 0.015)
      break
    case 'clownsneus':
      add(Sph(0.1), '#e63946', 0, 1.88, FRONT - 0.04)
      break
    case 'ooglapje':
      add(box(0.16, 0.16, 0.04), '#16161e', 0.12, 1.95, FRONT - 0.02)
      add(box(0.5, 0.03, 0.03), '#16161e', 0, 2.06, -0.05, 0, 0.6, 0)
      break
    case 'snorkel':
      add(box(0.46, 0.16, 0.06), '#3a6ff7', 0, 1.96, FRONT - 0.02)
      add(box(0.06, 0.4, 0.06), '#ffd166', 0.26, 2.1, FRONT)
      break
    case 'nepbaard':
      add(box(0.36, 0.26, 0.1), '#cfc6b4', 0, 1.66, FRONT + 0.02)
      break
    // ---------- Rug & vleugels ----------
    case 'vleugels':
      makeWings('#f4f6f8', 0.16, 0.66)
      break
    case 'vleerm_vleugels':
      makeWings('#2b2230', 0.16, 0.6)
      break
    case 'vlinder_vleugels':
      makeWings('#ff7ab6', 0.2, 0.6)
      add(Sph(0.06), '#ffd166', -0.34, 1.6, 0.2)
      add(Sph(0.06), '#ffd166', 0.34, 1.6, 0.2)
      break
    case 'draak_vleugels':
      makeWings('#2e7d52', 0.18, 0.66)
      break
    case 'fee_vleugels':
      makeWings('#ffc0e8', 0.16, 0.52)
      break
    case 'jetpack':
      add(box(0.32, 0.5, 0.22), '#9aa0a8', 0, 1.3, 0.28)
      add(Cyl(0.07, 0.16), '#e63946', -0.1, 1.02, 0.28)
      add(Cyl(0.07, 0.16), '#e63946', 0.1, 1.02, 0.28)
      add(Cone(0.07, 0.16, 8), '#ffb04a', -0.1, 0.88, 0.28, Math.PI, 0, 0)
      add(Cone(0.07, 0.16, 8), '#ffb04a', 0.1, 0.88, 0.28, Math.PI, 0, 0)
      break
    case 'cape':
      add(box(0.54, 0.78, 0.05), '#c8102e', 0, 1.22, 0.22, 0.08, 0, 0)
      break
    case 'cape_blauw':
      add(box(0.54, 0.78, 0.05), '#1f5fd0', 0, 1.22, 0.22, 0.08, 0, 0)
      break
    case 'cape_regenboog':
      ;['#e63946', '#ff8c42', '#ffd166', '#4caf50', '#3a6ff7', '#9b5de5'].forEach((c, i) =>
        add(box(0.09, 0.78, 0.05), c, -0.225 + i * 0.09, 1.22, 0.22, 0.08, 0, 0)
      )
      break
    case 'rugzak':
      add(box(0.4, 0.46, 0.2), '#e63946', 0, 1.32, 0.26)
      add(box(0.3, 0.2, 0.04), '#b8323c', 0, 1.36, 0.37)
      add(box(0.06, 0.5, 0.06), '#b8323c', -0.22, 1.34, 0.04)
      add(box(0.06, 0.5, 0.06), '#b8323c', 0.22, 1.34, 0.04)
      break
    case 'schild':
      add(Sph(0.34), '#3f8a2e', 0, 1.36, 0.26)
      for (const [hx, hy] of [[-0.1, 1.45], [0.1, 1.45], [0, 1.3]]) add(box(0.12, 0.12, 0.04), '#2e6322', hx, hy, 0.42)
      break
    case 'vlinderdas':
      add(box(0.1, 0.12, 0.06), '#c8102e', -0.08, 1.46, FRONT + 0.02)
      add(box(0.1, 0.12, 0.06), '#c8102e', 0.08, 1.46, FRONT + 0.02)
      add(box(0.05, 0.06, 0.06), '#7a1f2b', 0, 1.46, FRONT + 0.02)
      break
    // ---------- In je hand (rechterhand) ----------
    case 'ballon':
      add(box(0.02, 0.7, 0.02), '#888', 0.5, 1.4, -0.1)
      add(Sph(0.22), '#e63946', 0.5, 1.95, -0.1)
      break
    case 'zwaard':
      add(box(0.07, 0.7, 0.07), '#cfd6df', 0.55, 1.4, -0.1)
      add(box(0.26, 0.07, 0.07), '#7a4a28', 0.55, 1.08, -0.1)
      break
    case 'toverstaf':
      add(box(0.05, 0.5, 0.05), '#7a4a28', 0.55, 1.25, -0.1)
      add(Cone(0.1, 0.14, 5), '#ffd166', 0.55, 1.56, -0.1)
      break
    case 'vlag':
      add(box(0.04, 0.7, 0.04), '#7a4a28', 0.55, 1.4, -0.1)
      add(box(0.26, 0.18, 0.02), '#e63946', 0.7, 1.62, -0.1)
      break
    case 'paraplu':
      add(box(0.04, 0.6, 0.04), '#2a2f3a', 0.55, 1.35, -0.1)
      add(Cone(0.34, 0.24, 10), '#3a6ff7', 0.55, 1.66, -0.1)
      break
    case 'lolly':
      add(box(0.03, 0.4, 0.03), '#f4f4f4', 0.55, 1.25, -0.1)
      add(Cyl(0.14, 0.05, 14), '#ff5bb0', 0.55, 1.5, -0.1, Math.PI / 2, 0, 0)
      break
    default:
      return null // schoen-items zonder los meshje (kleur is al gezet)
  }
  for (const m of out) m.castShadow = true
  return { meshes: out, head, wings }
}

// Bouw het popje. Voeten staan op de grond (y = 0). userData { lLeg,rLeg,lArm,rArm }.
// extras: gekochte add-ons die aan staan, zoals 'kroon', 'cape', 'vleugels',
// 'hoed' en 'schoenen' (raketschoenen).
export function makeCharacter(cfg, extras = []) {
  cfg = { ...DEFAULT_CFG, ...cfg }
  const skin = mat(colorAt('skin', cfg.skin))
  const shirt = mat(colorAt('shirt', cfg.shirt))
  const pants = mat(colorAt('pants', cfg.pants))
  const hairC = mat(colorAt('hair', cfg.hair))
  const shoeColor = extras.includes('gouden_schoenen')
    ? '#ffd700'
    : extras.includes('schoenen')
      ? '#39ff88'
      : extras.includes('rolschaatsen')
        ? '#3a6ff7'
        : extras.includes('springschoenen')
          ? '#ff8c42'
          : extras.includes('voetbalschoenen')
            ? '#1b1b1b'
            : extras.includes('laarzen')
              ? '#5a3a22'
              : colorAt('shoes', cfg.shoes)
  const shoeC = mat(shoeColor)
  const eyeWhite = mat('#ffffff')
  const eyeC = mat('#20202c')
  const g = new THREE.Group()
  let lWing = null
  let rWing = null

  // benen met schoenen
  const legGeo = hang(0.26, 0.76, 0.3)
  const lLeg = new THREE.Mesh(legGeo, pants)
  const rLeg = new THREE.Mesh(legGeo, pants)
  lLeg.position.set(-0.16, 0.76, 0)
  rLeg.position.set(0.16, 0.76, 0)
  const shoeGeo = box(0.3, 0.18, 0.44)
  const lShoe = new THREE.Mesh(shoeGeo, shoeC)
  const rShoe = new THREE.Mesh(shoeGeo, shoeC)
  lShoe.position.set(0, -0.68, -0.06)
  rShoe.position.set(0, -0.68, -0.06)
  lLeg.add(lShoe)
  rLeg.add(rShoe)
  // heupen + romp (iets slanker = realistischer)
  const hips = new THREE.Mesh(box(0.56, 0.24, 0.34), pants)
  hips.position.set(0, 0.86, 0)
  const body = new THREE.Mesh(box(0.6, 0.62, 0.36), shirt)
  body.position.set(0, 1.28, 0)
  // armen met handjes
  const armGeo = hang(0.16, 0.6, 0.2)
  const lArm = new THREE.Mesh(armGeo, shirt)
  const rArm = new THREE.Mesh(armGeo, shirt)
  lArm.position.set(-0.39, 1.55, 0)
  rArm.position.set(0.39, 1.55, 0)
  const handGeo = box(0.15, 0.15, 0.17)
  const lHand = new THREE.Mesh(handGeo, skin)
  const rHand = new THREE.Mesh(handGeo, skin)
  lHand.position.set(0, -0.66, 0)
  rHand.position.set(0, -0.66, 0)
  lArm.add(lHand)
  rArm.add(rHand)
  // nek + hoofd met echte oogjes, mond en wenkbrauwen
  const neck = new THREE.Mesh(box(0.16, 0.12, 0.16), skin)
  neck.position.set(0, 1.62, 0)
  const head = new THREE.Mesh(box(0.5, 0.5, 0.5), skin)
  head.position.set(0, 1.92, 0)
  const lEyeW = new THREE.Mesh(box(0.13, 0.13, 0.03), eyeWhite)
  const rEyeW = new THREE.Mesh(box(0.13, 0.13, 0.03), eyeWhite)
  lEyeW.position.set(-0.12, 1.95, -0.26)
  rEyeW.position.set(0.12, 1.95, -0.26)
  const lPup = new THREE.Mesh(box(0.06, 0.06, 0.04), eyeC)
  const rPup = new THREE.Mesh(box(0.06, 0.06, 0.04), eyeC)
  lPup.position.set(-0.12, 1.94, -0.265)
  rPup.position.set(0.12, 1.94, -0.265)
  const mouth = new THREE.Mesh(box(0.16, 0.05, 0.03), mat('#a3402e'))
  mouth.position.set(0, 1.78, -0.26)
  const lBrow = new THREE.Mesh(box(0.13, 0.04, 0.03), hairC)
  const rBrow = new THREE.Mesh(box(0.13, 0.04, 0.03), hairC)
  lBrow.position.set(-0.12, 2.05, -0.26)
  rBrow.position.set(0.12, 2.05, -0.26)
  g.add(lLeg, rLeg, hips, body, lArm, rArm, neck, head, lEyeW, rEyeW, lPup, rPup, mouth, lBrow, rBrow)
  // add-ons uit de winkel: elk item tekent zichzelf
  let headCovered = false
  for (const key of extras) {
    const res = buildAccessory(key)
    if (!res) continue
    for (const m of res.meshes) g.add(m)
    if (res.head) headCovered = true
    if (res.wings) {
      lWing = res.wings[0]
      rWing = res.wings[1]
    }
  }

  const hasHat = cfg.hat > 0 || headCovered
  const style = cfg.hairStyle
  if (style === 0 || style === 1) {
    const backH = style === 1 ? 0.85 : 0.4
    const back = new THREE.Mesh(box(0.54, backH, 0.14), hairC)
    back.position.set(0, 2.14 - backH / 2, -0.21)
    g.add(back)
    if (style === 1) {
      const ls = new THREE.Mesh(box(0.12, 0.7, 0.42), hairC)
      const rs = new THREE.Mesh(box(0.12, 0.7, 0.42), hairC)
      ls.position.set(-0.27, 1.82, -0.02)
      rs.position.set(0.27, 1.82, -0.02)
      g.add(ls, rs)
    }
  }
  if (!hasHat) {
    if (style === 0 || style === 1) {
      const top = new THREE.Mesh(box(0.54, 0.14, 0.54), hairC)
      top.position.set(0, 2.18, 0)
      g.add(top)
      const pony = new THREE.Mesh(box(0.54, 0.1, 0.12), hairC)
      pony.position.set(0, 2.13, -0.22)
      g.add(pony)
    } else if (style === 2) {
      for (const [sx, sz] of [[-0.15, -0.15], [0.15, -0.15], [-0.15, 0.15], [0.15, 0.15], [0, 0]]) {
        const sp = new THREE.Mesh(box(0.13, 0.24, 0.13), hairC)
        sp.position.set(sx, 2.22, sz)
        g.add(sp)
      }
    }
    // style 3 = kaal: geen haar
  }
  if (hasHat) {
    const hatC = mat(colorAt('hat', cfg.hat))
    const cap = new THREE.Mesh(box(0.56, 0.18, 0.56), hatC)
    cap.position.set(0, 2.18, 0)
    const brim = new THREE.Mesh(box(0.56, 0.07, 0.3), hatC)
    brim.position.set(0, 2.14, -0.38)
    g.add(cap, brim)
  }
  if (cfg.glasses > 0) {
    const dark = mat(cfg.glasses === 2 ? '#0e0e14' : '#1c1c24')
    const lw = cfg.glasses === 2 ? 0.17 : 0.14
    const ll = new THREE.Mesh(box(lw, 0.14, 0.04), dark)
    const rl = new THREE.Mesh(box(lw, 0.14, 0.04), dark)
    const br = new THREE.Mesh(box(0.1, 0.04, 0.04), dark)
    ll.position.set(-0.12, 1.95, -0.28)
    rl.position.set(0.12, 1.95, -0.28)
    br.position.set(0, 1.95, -0.28)
    g.add(ll, rl, br)
  }

  g.traverse((o) => {
    if (o.isMesh) o.castShadow = true
  })
  g.userData = { lLeg, rLeg, lArm, rArm, lWing, rWing }
  return g
}
