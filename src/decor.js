// Decor-items: koop ze in de winkel, plaats ze in je eigen tuin.
// Apart van de popje-add-ons (store.js) zodat het netjes gescheiden blijft.
import * as THREE from 'three'

const COIN_KEY = 'haarlem_munten' // dezelfde portemonnee als store.js
const DECOR_OWN_KEY = 'haarlem_decor_owned'
const DECOR_PLACED_KEY = 'haarlem_decor_placed'

export const DECOR = [
  { key: 'kerstboom', label: 'Kerstboom', prijs: 60, tip: 'Vrolijk kerstfeest!' },
  { key: 'bank', label: 'Tuinbank', prijs: 45, tip: 'Lekker uitrusten' },
  { key: 'lantaarn', label: 'Lantaarnpaal', prijs: 35, tip: 'Een zacht licht' },
  { key: 'bloembak', label: 'Bloembak', prijs: 30, tip: 'Met vrolijke bloemen' },
  { key: 'vlag', label: 'NL-vlag op paal', prijs: 40, tip: 'Rood-wit-blauw' },
  { key: 'goal', label: 'Voetbalgoaltje', prijs: 50, tip: 'Schieten maar!' },
  { key: 'schommel', label: 'Schommel', prijs: 70, tip: 'Heen en weer' },
  { key: 'zandbak', label: 'Zandbak', prijs: 40, tip: 'Met een schepje' },
  { key: 'standbeeld', label: 'Standbeeld van jezelf', prijs: 90, tip: 'Net een echte ster' },
  { key: 'fontein', label: 'Fontein', prijs: 80, tip: 'Met klaterend water' },
  { key: 'bbq', label: 'BBQ', prijs: 55, tip: 'Lekkere worstjes' },
  { key: 'tent', label: 'Speeltent', prijs: 55, tip: 'Voor binnen of buiten' },
]

export function getDecorOwned() {
  try {
    return JSON.parse(localStorage.getItem(DECOR_OWN_KEY) || '[]')
  } catch (e) {
    return []
  }
}
export function ownsDecor(key) {
  return getDecorOwned().includes(key)
}
export function buyDecor(key, getCoins, addCoins) {
  const item = DECOR.find((d) => d.key === key)
  if (!item || ownsDecor(key)) return false
  if (getCoins() < item.prijs) return false
  addCoins(-item.prijs)
  const owned = getDecorOwned()
  owned.push(key)
  try {
    localStorage.setItem(DECOR_OWN_KEY, JSON.stringify(owned))
  } catch (e) {}
  return true
}

// {key, x, z, rot}
export function getPlaced() {
  try {
    return JSON.parse(localStorage.getItem(DECOR_PLACED_KEY) || '[]')
  } catch (e) {
    return []
  }
}
export function savePlaced(arr) {
  try {
    localStorage.setItem(DECOR_PLACED_KEY, JSON.stringify(arr))
  } catch (e) {}
}
export function placeDecor(key, x, z, rot) {
  const arr = getPlaced()
  arr.push({ key, x: +x.toFixed(2), z: +z.toFixed(2), rot: +rot.toFixed(2) })
  savePlaced(arr)
  return arr
}
export function removeDecorAt(x, z, radius) {
  const arr = getPlaced()
  let best = -1
  let bestD = radius * radius
  for (let i = 0; i < arr.length; i++) {
    const dx = arr[i].x - x
    const dz = arr[i].z - z
    const dd = dx * dx + dz * dz
    if (dd < bestD) {
      bestD = dd
      best = i
    }
  }
  if (best >= 0) {
    arr.splice(best, 1)
    savePlaced(arr)
    return true
  }
  return false
}

// 3D-vorm voor elk decor-item. Geeft een Group terug met origin op de grond.
const mat = (c) => new THREE.MeshLambertMaterial({ color: c })
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d)
const Cyl = (r, h, s = 10) => new THREE.CylinderGeometry(r, r, h, s)
const Cone = (r, h, s = 8) => new THREE.ConeGeometry(r, h, s)

export function makeDecor(key) {
  const g = new THREE.Group()
  const add = (geo, c, x, y, z, rx, ry, rz) => {
    const m = new THREE.Mesh(geo, mat(c))
    m.position.set(x, y, z)
    m.rotation.set(rx || 0, ry || 0, rz || 0)
    m.castShadow = true
    g.add(m)
    return m
  }
  switch (key) {
    case 'kerstboom':
      add(Cyl(0.1, 0.3), '#5a3a22', 0, 0.15, 0)
      add(Cone(0.55, 0.8, 8), '#1f6a3a', 0, 0.7, 0)
      add(Cone(0.42, 0.7, 8), '#2a7a45', 0, 1.05, 0)
      add(Cone(0.3, 0.6, 8), '#34894f', 0, 1.4, 0)
      add(new THREE.SphereGeometry(0.08), '#ffd700', 0, 1.85, 0)
      for (const [a, c] of [[0, '#e63946'], [1.05, '#ffd166'], [2.1, '#3a6ff7'], [3.14, '#ffffff'], [4.18, '#ff7ab6']]) {
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.07), mat(c))
        b.position.set(Math.cos(a) * 0.35, 0.85 + Math.sin(a * 1.5) * 0.5, Math.sin(a) * 0.35)
        g.add(b)
      }
      break
    case 'bank':
      add(box(1.5, 0.1, 0.5), '#7a5230', 0, 0.45, 0)
      add(box(1.5, 0.6, 0.1), '#7a5230', 0, 0.7, -0.2)
      for (const sx of [-0.7, 0.7]) add(box(0.1, 0.45, 0.5), '#4a3220', sx, 0.22, 0)
      break
    case 'lantaarn':
      add(Cyl(0.06, 2.2), '#2a2f3a', 0, 1.1, 0)
      add(box(0.32, 0.32, 0.32), '#fff7c0', 0, 2.36, 0)
      add(box(0.06, 0.06, 0.06), '#ffb04a', 0, 2.36, 0)
      break
    case 'bloembak':
      add(box(0.9, 0.35, 0.45), '#7a4a28', 0, 0.18, 0)
      add(box(0.85, 0.1, 0.4), '#5a3320', 0, 0.36, 0)
      for (let i = 0; i < 5; i++) {
        const x = -0.34 + i * 0.17
        add(box(0.04, 0.35, 0.04), '#3f8a2e', x, 0.55, 0)
        const cols = ['#e63946', '#ffd166', '#ff7ab6', '#9b5de5', '#ffffff']
        add(new THREE.SphereGeometry(0.1), cols[i % cols.length], x, 0.78, 0)
      }
      break
    case 'vlag':
      add(Cyl(0.05, 2.6), '#cfd6df', 0, 1.3, 0)
      add(box(0.04, 0.32, 0.7), '#e63946', 0.4, 2.34, 0)
      add(box(0.04, 0.32, 0.7), '#ffffff', 0.4, 2.02, 0)
      add(box(0.04, 0.32, 0.7), '#1f3aa6', 0.4, 1.7, 0)
      break
    case 'goal':
      add(box(2.0, 0.08, 0.08), '#ffffff', 0, 1.0, 0)
      add(box(0.08, 1.0, 0.08), '#ffffff', -0.96, 0.5, 0)
      add(box(0.08, 1.0, 0.08), '#ffffff', 0.96, 0.5, 0)
      add(box(0.08, 0.08, 0.6), '#ffffff', -0.96, 0.5, 0.3)
      add(box(0.08, 0.08, 0.6), '#ffffff', 0.96, 0.5, 0.3)
      add(box(1.85, 0.6, 0.05), '#dddddd', 0, 0.5, 0.3, 0, 0, 0)
      add(new THREE.SphereGeometry(0.18), '#ffffff', 0.6, 0.18, 0.6)
      break
    case 'schommel':
      add(box(0.1, 1.8, 0.1), '#5a3a22', -0.7, 0.9, -0.5)
      add(box(0.1, 1.8, 0.1), '#5a3a22', 0.7, 0.9, -0.5)
      add(box(0.1, 1.8, 0.1), '#5a3a22', -0.7, 0.9, 0.5)
      add(box(0.1, 1.8, 0.1), '#5a3a22', 0.7, 0.9, 0.5)
      add(box(1.6, 0.1, 0.1), '#5a3a22', 0, 1.8, 0)
      add(Cyl(0.02, 1.0), '#16161e', -0.3, 1.3, 0)
      add(Cyl(0.02, 1.0), '#16161e', 0.3, 1.3, 0)
      add(box(0.7, 0.08, 0.25), '#e63946', 0, 0.8, 0)
      break
    case 'zandbak':
      add(box(1.6, 0.12, 1.6), '#f0dca0', 0, 0.06, 0)
      for (const [sx, sz] of [[-0.85, 0], [0.85, 0], [0, -0.85], [0, 0.85]]) add(box(sx === 0 ? 1.7 : 0.1, 0.2, sx === 0 ? 0.1 : 1.7), '#7a5230', sx, 0.1, sz)
      add(box(0.5, 0.05, 0.08), '#cfd6df', 0.2, 0.16, 0.2)
      add(box(0.1, 0.16, 0.1), '#cfd6df', 0.4, 0.08, 0.2)
      break
    case 'standbeeld':
      add(box(0.8, 0.5, 0.8), '#8a8f98', 0, 0.25, 0)
      add(box(0.9, 0.1, 0.9), '#b3b8bf', 0, 0.55, 0)
      add(box(0.4, 0.7, 0.26), '#cfd6df', 0, 0.95, 0)
      add(box(0.3, 0.3, 0.26), '#cfd6df', 0, 1.45, 0)
      add(box(0.5, 0.1, 0.12), '#cfd6df', 0, 1.2, -0.18)
      break
    case 'fontein':
      add(Cyl(1.0, 0.2, 16), '#9aa6b2', 0, 0.1, 0)
      add(Cyl(0.9, 0.18, 16), '#3aa0d8', 0, 0.24, 0)
      add(Cyl(0.18, 0.6, 10), '#9aa6b2', 0, 0.6, 0)
      add(Cyl(0.45, 0.1, 16), '#cfd6df', 0, 1.0, 0)
      add(Cyl(0.05, 0.6, 8), '#bcd8e8', 0, 1.35, 0)
      add(new THREE.SphereGeometry(0.18), '#bcd8e8', 0, 1.7, 0)
      break
    case 'bbq':
      add(box(0.6, 0.6, 0.4), '#2a2f3a', 0, 0.3, 0)
      add(Cyl(0.08, 0.5), '#cfd6df', 0, 0.85, 0)
      add(box(0.55, 0.08, 0.36), '#cfd6df', 0, 0.65, 0)
      add(box(0.5, 0.06, 0.32), '#c43a2e', 0, 0.7, 0)
      add(box(0.18, 0.04, 0.06), '#7a3320', 0.1, 0.74, 0)
      add(box(0.18, 0.04, 0.06), '#7a3320', -0.1, 0.74, 0.05)
      break
    case 'tent':
      add(Cone(0.7, 1.2, 4), '#e63946', 0, 0.6, 0)
      add(box(0.4, 0.6, 0.04), '#3a2a1c', 0, 0.3, 0.5)
      add(new THREE.SphereGeometry(0.06), '#ffd700', 0, 1.22, 0)
      break
  }
  return g
}
