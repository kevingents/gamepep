// Munten en de winkel met add-ons voor je popje. Lokaal op het apparaat.
const COIN_KEY = 'haarlem_munten'
const OWN_KEY = 'haarlem_addons'
const ON_KEY = 'haarlem_addons_aan'

// 50 items om voor te sparen, in vijf categorieen. cat = groep in de winkel.
// vleugels/jetpack laten je VLIEGEN, raket/rol/springschoenen maken je sneller.
export const ADDONS = [
  // ----- Hoofd -----
  { key: 'kroon', label: 'Gouden kroon', prijs: 80, cat: 'Hoofd', tip: 'Voor een echte koning of koningin' },
  { key: 'tiara', label: 'Prinsessen-diadeem', prijs: 70, cat: 'Hoofd', tip: 'Met een glimmend steentje' },
  { key: 'hoed', label: 'Tovenaarshoed', prijs: 90, cat: 'Hoofd', tip: 'Paars met een gouden ster' },
  { key: 'heks', label: 'Heksenhoed', prijs: 90, cat: 'Hoofd', tip: 'Spookachtig groen' },
  { key: 'pet', label: 'Stoere pet', prijs: 40, cat: 'Hoofd', tip: 'Met een klep' },
  { key: 'kapitein', label: 'Kapiteinspet', prijs: 60, cat: 'Hoofd', tip: 'Voor de baas van de boot' },
  { key: 'hoge_hoed', label: 'Hoge hoed', prijs: 80, cat: 'Hoofd', tip: 'Heel deftig' },
  { key: 'feesthoed', label: 'Feesthoedje', prijs: 30, cat: 'Hoofd', tip: 'Hieperdepiep!' },
  { key: 'cowboy', label: 'Cowboyhoed', prijs: 70, cat: 'Hoofd', tip: 'Yeehaw!' },
  { key: 'piraat', label: 'Piratenhoed', prijs: 75, cat: 'Hoofd', tip: 'Met een doodskopje' },
  { key: 'kok', label: 'Koksmuts', prijs: 50, cat: 'Hoofd', tip: 'Tijd om te koken' },
  { key: 'helm', label: 'Ridderhelm', prijs: 110, cat: 'Hoofd', tip: 'Van glanzend metaal' },
  { key: 'ruimtehelm', label: 'Astronautenhelm', prijs: 130, cat: 'Hoofd', tip: 'Klaar voor de ruimte' },
  { key: 'muts', label: 'Wintermuts', prijs: 45, cat: 'Hoofd', tip: 'Met een pompon' },
  { key: 'bloemenkrans', label: 'Bloemenkrans', prijs: 55, cat: 'Hoofd', tip: 'Vol vrolijke bloemen' },
  { key: 'gewei', label: 'Rendiergewei', prijs: 65, cat: 'Hoofd', tip: 'Net Rudolf' },
  { key: 'propeller', label: 'Propellerpet', prijs: 60, cat: 'Hoofd', tip: 'Met een draaiend propellertje' },
  { key: 'zonnehoed', label: 'Zonnehoed', prijs: 45, cat: 'Hoofd', tip: 'Voor op het strand' },
  // ----- Gezicht -----
  { key: 'bril_rond', label: 'Ronde bril', prijs: 35, cat: 'Gezicht', tip: 'Slimme bril' },
  { key: 'zonnebril', label: 'Coole zonnebril', prijs: 50, cat: 'Gezicht', tip: 'Super cool' },
  { key: 'snor', label: 'Grappige snor', prijs: 30, cat: 'Gezicht', tip: 'Hihi, een snor' },
  { key: 'masker', label: 'Superheldenmasker', prijs: 60, cat: 'Gezicht', tip: 'Geheime identiteit' },
  { key: 'clownsneus', label: 'Clownsneus', prijs: 30, cat: 'Gezicht', tip: 'Rood en rond' },
  { key: 'ooglapje', label: 'Piraten-ooglapje', prijs: 40, cat: 'Gezicht', tip: 'Arrr!' },
  { key: 'snorkel', label: 'Duikbril', prijs: 45, cat: 'Gezicht', tip: 'Voor onder water' },
  { key: 'nepbaard', label: 'Nepbaard', prijs: 35, cat: 'Gezicht', tip: 'Net een opa' },
  // ----- Rug & vleugels -----
  { key: 'vleugels', label: 'Engelenvleugels', prijs: 200, cat: 'Rug & vleugels', tip: 'Hiermee kun je VLIEGEN!' },
  { key: 'vleerm_vleugels', label: 'Vleermuisvleugels', prijs: 200, cat: 'Rug & vleugels', tip: 'Vliegen als een vleermuis' },
  { key: 'vlinder_vleugels', label: 'Vlindervleugels', prijs: 220, cat: 'Rug & vleugels', tip: 'Kleurige vleugels om te vliegen' },
  { key: 'draak_vleugels', label: 'Drakenvleugels', prijs: 240, cat: 'Rug & vleugels', tip: 'Vlieg als een draak' },
  { key: 'fee_vleugels', label: 'Feeenvleugels', prijs: 210, cat: 'Rug & vleugels', tip: 'Toveren en vliegen' },
  { key: 'jetpack', label: 'Jetpack', prijs: 260, cat: 'Rug & vleugels', tip: 'Raket op je rug - vliegen!' },
  { key: 'cape', label: 'Rode heldencape', prijs: 60, cat: 'Rug & vleugels', tip: 'Wapperende cape' },
  { key: 'cape_blauw', label: 'Blauwe cape', prijs: 60, cat: 'Rug & vleugels', tip: 'Stoer blauw' },
  { key: 'cape_regenboog', label: 'Regenboogcape', prijs: 120, cat: 'Rug & vleugels', tip: 'Alle kleuren' },
  { key: 'rugzak', label: 'Schooltas', prijs: 50, cat: 'Rug & vleugels', tip: 'Voor je spullen' },
  { key: 'schild', label: 'Schildpadschild', prijs: 70, cat: 'Rug & vleugels', tip: 'Een schild op je rug' },
  { key: 'vlinderdas', label: 'Vlinderstrik', prijs: 40, cat: 'Rug & vleugels', tip: 'Heel netjes' },
  // ----- Schoenen -----
  { key: 'schoenen', label: 'Raketschoenen', prijs: 120, cat: 'Schoenen', tip: 'Ren veel sneller (groen)' },
  { key: 'rolschaatsen', label: 'Rolschaatsen', prijs: 130, cat: 'Schoenen', tip: 'Snel en met wieltjes' },
  { key: 'springschoenen', label: 'Springveren', prijs: 110, cat: 'Schoenen', tip: 'Sneller met veren' },
  { key: 'laarzen', label: 'Stoere laarzen', prijs: 50, cat: 'Schoenen', tip: 'Stevige bruine laarzen' },
  { key: 'voetbalschoenen', label: 'Voetbalschoenen', prijs: 60, cat: 'Schoenen', tip: 'Voor op het veld' },
  { key: 'gouden_schoenen', label: 'Gouden schoenen', prijs: 100, cat: 'Schoenen', tip: 'Glimmend goud' },
  // ----- In je hand -----
  { key: 'ballon', label: 'Ballon', prijs: 40, cat: 'In je hand', tip: 'Een rode ballon' },
  { key: 'zwaard', label: 'Ridderzwaard', prijs: 70, cat: 'In je hand', tip: 'Voor dappere ridders' },
  { key: 'toverstaf', label: 'Toverstaf', prijs: 80, cat: 'In je hand', tip: 'Met een glimster' },
  { key: 'vlag', label: 'Vlaggetje', prijs: 35, cat: 'In je hand', tip: 'Zwaai maar!' },
  { key: 'paraplu', label: 'Paraplu', prijs: 55, cat: 'In je hand', tip: 'Voor in de regen' },
  { key: 'lolly', label: 'Reuzenlolly', prijs: 45, cat: 'In je hand', tip: 'Lekker zoet' },
]
export const FLY_KEYS = ['vleugels', 'vleerm_vleugels', 'vlinder_vleugels', 'draak_vleugels', 'fee_vleugels', 'jetpack']
export const SPEED_KEYS = ['schoenen', 'rolschaatsen', 'springschoenen']

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
