// Het popje: opgebouwd uit blokjes, kleuren en petje instelbaar.
// De keuzes worden onthouden op het apparaat (localStorage).
import * as THREE from 'three'

export const OPTIONS = {
  skin: ['#e0a878', '#c68642', '#8d5524', '#f1c27d', '#ffe0bd'],
  shirt: ['#18a3a3', '#e63946', '#ffd166', '#4caf50', '#3a6ff7', '#9b5de5', '#ffffff', '#ff7ab6'],
  pants: ['#34408c', '#2b2b3a', '#7a5230', '#5a5a5a', '#1b6b3a'],
  hair: ['#5a3a22', '#2b2b2b', '#caa472', '#a0451f', '#dddddd'],
  hat: ['geen', '#e63946', '#ffd166', '#3a6ff7', '#1b6b3a', '#ffffff'],
}

// labels voor de knoppen in het maak-scherm
export const PART_LABELS = {
  skin: 'Huid',
  shirt: 'Shirt',
  pants: 'Broek',
  hair: 'Haar',
  hat: 'Pet',
}

export const DEFAULT_CFG = { skin: 0, shirt: 0, pants: 0, hair: 0, hat: 0 }

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
function pillar(w, h, d) {
  const g = new THREE.BoxGeometry(w, h, d)
  g.translate(0, h / 2, 0)
  return g
}

// Bouw het popje volgens cfg (indexen in OPTIONS).
// Geeft een THREE.Group met userData { lLeg, rLeg, lArm, rArm } voor de loop-animatie.
export function makeCharacter(cfg) {
  const skin = mat(OPTIONS.skin[cfg.skin])
  const shirt = mat(OPTIONS.shirt[cfg.shirt])
  const pants = mat(OPTIONS.pants[cfg.pants])
  const hairC = mat(OPTIONS.hair[cfg.hair])
  const eye = mat('#20202c')

  const g = new THREE.Group()
  const legGeo = pillar(0.28, 0.7, 0.32)
  const lLeg = new THREE.Mesh(legGeo, pants)
  const rLeg = new THREE.Mesh(legGeo, pants)
  lLeg.position.set(-0.16, 0.7, 0)
  rLeg.position.set(0.16, 0.7, 0)
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.4), shirt)
  body.position.set(0, 1.05, 0)
  const armGeo = pillar(0.22, 0.7, 0.3)
  const lArm = new THREE.Mesh(armGeo, skin)
  const rArm = new THREE.Mesh(armGeo, skin)
  lArm.position.set(-0.46, 1.4, 0)
  rArm.position.set(0.46, 1.4, 0)
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), skin)
  head.position.set(0, 1.75, 0)
  const lEye = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.04), eye)
  const rEye = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.04), eye)
  lEye.position.set(-0.14, 1.78, -0.31)
  rEye.position.set(0.14, 1.78, -0.31)
  g.add(lLeg, rLeg, body, lArm, rArm, head, lEye, rEye)

  // haar
  const hairTop = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.16, 0.64), hairC)
  hairTop.position.set(0, 2.0, 0)
  const hairBack = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.5, 0.16), hairC)
  hairBack.position.set(0, 1.78, -0.25)
  g.add(hairTop, hairBack)

  // petje (bedekt het bovenhaar)
  if (cfg.hat > 0) {
    const hatC = mat(OPTIONS.hat[cfg.hat])
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.2, 0.66), hatC)
    cap.position.set(0, 2.05, 0)
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.08, 0.32), hatC)
    brim.position.set(0, 2.0, -0.42)
    g.add(cap, brim)
    hairTop.visible = false
  }

  g.traverse((o) => {
    if (o.isMesh) o.castShadow = true
  })
  g.userData = { lLeg, rLeg, lArm, rArm }
  return g
}
