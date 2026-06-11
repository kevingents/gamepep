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
export function makeCharacter(cfg) {
  cfg = { ...DEFAULT_CFG, ...cfg }
  const skin = mat(colorAt('skin', cfg.skin))
  const shirt = mat(colorAt('shirt', cfg.shirt))
  const pants = mat(colorAt('pants', cfg.pants))
  const hairC = mat(colorAt('hair', cfg.hair))
  const shoeC = mat(colorAt('shoes', cfg.shoes))
  const eyeC = mat('#20202c')
  const g = new THREE.Group()

  const legGeo = hang(0.3, 0.8, 0.34)
  const lLeg = new THREE.Mesh(legGeo, pants)
  const rLeg = new THREE.Mesh(legGeo, pants)
  lLeg.position.set(-0.17, 0.8, 0)
  rLeg.position.set(0.17, 0.8, 0)
  const shoeGeo = box(0.34, 0.2, 0.46)
  const lShoe = new THREE.Mesh(shoeGeo, shoeC)
  const rShoe = new THREE.Mesh(shoeGeo, shoeC)
  lShoe.position.set(0, -0.72, -0.06)
  rShoe.position.set(0, -0.72, -0.06)
  lLeg.add(lShoe)
  rLeg.add(rShoe)

  const body = new THREE.Mesh(box(0.72, 0.72, 0.42), shirt)
  body.position.set(0, 1.16, 0)
  const armGeo = hang(0.22, 0.72, 0.3)
  const lArm = new THREE.Mesh(armGeo, skin)
  const rArm = new THREE.Mesh(armGeo, skin)
  lArm.position.set(-0.47, 1.52, 0)
  rArm.position.set(0.47, 1.52, 0)
  const head = new THREE.Mesh(box(0.62, 0.62, 0.62), skin)
  head.position.set(0, 1.86, 0)
  const lEye = new THREE.Mesh(box(0.12, 0.12, 0.04), eyeC)
  const rEye = new THREE.Mesh(box(0.12, 0.12, 0.04), eyeC)
  lEye.position.set(-0.14, 1.9, -0.32)
  rEye.position.set(0.14, 1.9, -0.32)
  g.add(lLeg, rLeg, body, lArm, rArm, head, lEye, rEye)

  const hasHat = cfg.hat > 0
  const style = cfg.hairStyle
  if (style === 0 || style === 1) {
    const backH = style === 1 ? 1.0 : 0.5
    const back = new THREE.Mesh(box(0.66, backH, 0.16), hairC)
    back.position.set(0, 2.17 - backH / 2, -0.27)
    g.add(back)
    if (style === 1) {
      const ls = new THREE.Mesh(box(0.14, 0.85, 0.5), hairC)
      const rs = new THREE.Mesh(box(0.14, 0.85, 0.5), hairC)
      ls.position.set(-0.33, 1.7, -0.04)
      rs.position.set(0.33, 1.7, -0.04)
      g.add(ls, rs)
    }
  }
  if (!hasHat) {
    if (style === 0 || style === 1) {
      const top = new THREE.Mesh(box(0.66, 0.16, 0.66), hairC)
      top.position.set(0, 2.2, 0)
      g.add(top)
    } else if (style === 2) {
      for (const [sx, sz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18], [0, 0]]) {
        const sp = new THREE.Mesh(box(0.16, 0.3, 0.16), hairC)
        sp.position.set(sx, 2.28, sz)
        g.add(sp)
      }
    }
    // style 3 = kaal: geen haar
  }
  if (hasHat) {
    const hatC = mat(colorAt('hat', cfg.hat))
    const cap = new THREE.Mesh(box(0.68, 0.2, 0.68), hatC)
    cap.position.set(0, 2.24, 0)
    const brim = new THREE.Mesh(box(0.68, 0.08, 0.34), hatC)
    brim.position.set(0, 2.18, -0.46)
    g.add(cap, brim)
  }
  if (cfg.glasses > 0) {
    const dark = mat(cfg.glasses === 2 ? '#0e0e14' : '#1c1c24')
    const lw = cfg.glasses === 2 ? 0.2 : 0.16
    const ll = new THREE.Mesh(box(lw, 0.15, 0.05), dark)
    const rl = new THREE.Mesh(box(lw, 0.15, 0.05), dark)
    const br = new THREE.Mesh(box(0.12, 0.04, 0.05), dark)
    ll.position.set(-0.15, 1.9, -0.33)
    rl.position.set(0.15, 1.9, -0.33)
    br.position.set(0, 1.9, -0.33)
    g.add(ll, rl, br)
  }

  g.traverse((o) => {
    if (o.isMesh) o.castShadow = true
  })
  g.userData = { lLeg, rLeg, lArm, rArm }
  return g
}
