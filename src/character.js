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

// Bouw het popje. Voeten staan op de grond (y = 0). userData { lLeg,rLeg,lArm,rArm }.
// extras: gekochte add-ons die aan staan, zoals 'kroon', 'cape', 'vleugels',
// 'hoed' en 'schoenen' (raketschoenen).
export function makeCharacter(cfg, extras = []) {
  cfg = { ...DEFAULT_CFG, ...cfg }
  const skin = mat(colorAt('skin', cfg.skin))
  const shirt = mat(colorAt('shirt', cfg.shirt))
  const pants = mat(colorAt('pants', cfg.pants))
  const hairC = mat(colorAt('hair', cfg.hair))
  const shoeC = mat(extras.includes('schoenen') ? '#39ff88' : colorAt('shoes', cfg.shoes))
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
  // add-ons uit de winkel
  if (extras.includes('kroon')) {
    const goud = mat('#ffd700')
    const kroon = new THREE.Mesh(box(0.44, 0.12, 0.44), goud)
    kroon.position.set(0, 2.22, 0)
    g.add(kroon)
    for (const kx of [-0.15, 0, 0.15]) {
      const punt = new THREE.Mesh(box(0.08, 0.12, 0.08), goud)
      punt.position.set(kx, 2.33, -0.18)
      g.add(punt)
    }
    const juweel = new THREE.Mesh(box(0.08, 0.08, 0.04), mat('#e63946'))
    juweel.position.set(0, 2.24, -0.23)
    g.add(juweel)
  }
  if (extras.includes('cape')) {
    const cape = new THREE.Mesh(box(0.54, 0.78, 0.05), mat('#c8102e'))
    cape.position.set(0, 1.22, 0.22)
    cape.rotation.x = 0.08
    g.add(cape)
  }
  if (extras.includes('vleugels')) {
    const wingMat = mat('#f4f6f8')
    // vleugel hangt vanaf de bovenkant zodat hij netjes klappert
    const wingGeo = box(0.16, 0.66, 0.05)
    wingGeo.translate(0, -0.33, 0)
    lWing = new THREE.Mesh(wingGeo, wingMat)
    rWing = new THREE.Mesh(wingGeo.clone(), wingMat)
    lWing.position.set(-0.18, 1.78, 0.18)
    rWing.position.set(0.18, 1.78, 0.18)
    lWing.rotation.z = 0.45
    rWing.rotation.z = -0.45
    g.add(lWing, rWing)
  }
  if (extras.includes('hoed')) {
    const paars = mat('#5a2d8a')
    const rand = new THREE.Mesh(box(0.6, 0.06, 0.6), paars)
    rand.position.set(0, 2.18, 0)
    const punt = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.55, 6), paars)
    punt.position.set(0, 2.48, 0)
    const ster = new THREE.Mesh(box(0.1, 0.1, 0.03), mat('#ffd166'))
    ster.position.set(0, 2.4, -0.16)
    g.add(rand, punt, ster)
  }

  const hasHat = cfg.hat > 0
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
