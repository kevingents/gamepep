// Huisjes en aanbellen: elk kind kiest een huis IN het spel (geen echte
// adressen - veilig voor kinderen). Aanbellen geeft de eigenaar een melding,
// live of bij het opstarten. Alles via de publieke Supabase REST-API.
import { SUPA_URL, SUPA_KEY } from './supabase.js'

const headers = {
  apikey: SUPA_KEY,
  Authorization: 'Bearer ' + SUPA_KEY,
  'Content-Type': 'application/json',
}

// vast, anoniem speler-id per apparaat
export function getPid() {
  try {
    let pid = localStorage.getItem('haarlem_pid')
    if (!pid) {
      pid = 'p' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
      localStorage.setItem('haarlem_pid', pid)
    }
    return pid
  } catch (e) {
    return 'p-anoniem'
  }
}

// alle gekozen huizen in deze stad: [{ pid, name, cx, cz }]
export async function fetchHouses(city) {
  try {
    const r = await fetch(SUPA_URL + '/rest/v1/profiles?select=pid,name,cx,cz&city=eq.' + encodeURIComponent(city), { headers })
    if (!r.ok) return []
    const data = await r.json()
    return Array.isArray(data) ? data : []
  } catch (e) {
    return []
  }
}

// kies (of verplaats) je huis in deze stad
export async function claimHouse(pid, name, city, cx, cz) {
  try {
    const r = await fetch(SUPA_URL + '/rest/v1/profiles', {
      method: 'POST',
      headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ pid, name, city, cx, cz }),
    })
    return r.ok
  } catch (e) {
    return false
  }
}

// bel aan bij iemand
export async function ringBell(toPid, fromName) {
  try {
    await fetch(SUPA_URL + '/rest/v1/rings', {
      method: 'POST',
      headers: { ...headers, Prefer: 'return=minimal' },
      body: JSON.stringify({ to_pid: toPid, from_name: (fromName || 'Iemand').slice(0, 10) }),
    })
  } catch (e) {}
}

// nieuwe belletjes voor mij ophalen en als gezien markeren
export async function fetchRings(pid) {
  try {
    const r = await fetch(SUPA_URL + '/rest/v1/rings?select=id,from_name&to_pid=eq.' + encodeURIComponent(pid) + '&seen=eq.false&order=created_at.asc&limit=20', { headers })
    if (!r.ok) return []
    const rows = await r.json()
    if (!Array.isArray(rows) || !rows.length) return []
    const ids = rows.map((x) => x.id).join(',')
    fetch(SUPA_URL + '/rest/v1/rings?id=in.(' + ids + ')', {
      method: 'PATCH',
      headers: { ...headers, Prefer: 'return=minimal' },
      body: JSON.stringify({ seen: true }),
    }).catch(() => {})
    return rows
  } catch (e) {
    return []
  }
}
