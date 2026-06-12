// Munten en de winkel met add-ons voor je popje. Lokaal op het apparaat.
const COIN_KEY = 'haarlem_munten'
const OWN_KEY = 'haarlem_addons'
const ON_KEY = 'haarlem_addons_aan'

// De add-ons die je kunt kopen en aanzetten op je popje.
export const ADDONS = [
  { key: 'vleugels', label: 'Vleugels', prijs: 200, tip: 'Hiermee kun je VLIEGEN!' },
  { key: 'schoenen', label: 'Raketschoenen', prijs: 120, tip: 'Ren veel sneller' },
  { key: 'kroon', label: 'Gouden kroon', prijs: 80, tip: 'Voor een echte koning of koningin' },
  { key: 'cape', label: 'Superheld-cape', prijs: 60, tip: 'Wapperende rode cape' },
  { key: 'hoed', label: 'Tovenaarshoed', prijs: 90, tip: 'Met sterren erop' },
]

export function getCoins() {
  try {
    return parseInt(localStorage.getItem(COIN_KEY) || '0', 10) || 0
  } catch (e) {
    return 0
  }
}
export function addCoins(n) {
  const t = getCoins() + n
  try {
    localStorage.setItem(COIN_KEY, String(t))
  } catch (e) {}
  return t
}
export function getOwned() {
  try {
    return JSON.parse(localStorage.getItem(OWN_KEY) || '[]')
  } catch (e) {
    return []
  }
}
export function owns(key) {
  return getOwned().includes(key)
}
export function buy(key) {
  const item = ADDONS.find((a) => a.key === key)
  if (!item || owns(key)) return false
  if (getCoins() < item.prijs) return false
  addCoins(-item.prijs)
  const owned = getOwned()
  owned.push(key)
  try {
    localStorage.setItem(OWN_KEY, JSON.stringify(owned))
  } catch (e) {}
  setActive(key, true) // meteen aanzetten na het kopen
  return true
}
// welke add-ons staan AAN (zichtbaar op je popje)
export function getActive() {
  try {
    return JSON.parse(localStorage.getItem(ON_KEY) || '[]').filter((k) => owns(k))
  } catch (e) {
    return []
  }
}
export function setActive(key, on) {
  let act = getActive()
  if (on) {
    if (!act.includes(key)) act.push(key)
  } else act = act.filter((k) => k !== key)
  try {
    localStorage.setItem(ON_KEY, JSON.stringify(act))
  } catch (e) {}
  return act
}
