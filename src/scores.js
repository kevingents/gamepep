// Highscores per stad. Online via Supabase (wereldwijd), met het apparaat
// (localStorage) als terugval als er geen internet is of de tabel nog niet
// bestaat. De rest van het spel praat alleen met deze functies.
import { SUPA_URL, SUPA_KEY } from './supabase.js'

const KEY = 'haarlem_highscores'
const MAX = 10
const headers = { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY }

let cache = [] // top-lijst van de huidige stad

function localAll() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch (e) {
    return []
  }
}
function localTop(city) {
  return localAll()
    .filter((r) => r.city === city)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX)
}
function localAdd(row) {
  const all = localAll()
  all.push(row)
  try {
    localStorage.setItem(KEY, JSON.stringify(all.slice(-300)))
  } catch (e) {}
}

export function cachedTop() {
  return cache
}
export function cachedTopScore() {
  return cache.length ? cache[0].score : 0
}
export function qualifies(score) {
  return score > 0 && (cache.length < MAX || score > cache[cache.length - 1].score)
}

// Haal de top-lijst voor een stad op (eerst lokaal, dan online overschrijven).
export async function refresh(city) {
  cache = localTop(city)
  try {
    const r = await fetch(
      SUPA_URL +
        '/rest/v1/highscores?select=name,score&city=eq.' +
        encodeURIComponent(city) +
        '&order=score.desc&limit=' +
        MAX,
      { headers }
    )
    if (r.ok) {
      const data = await r.json()
      if (Array.isArray(data)) cache = data
    }
  } catch (e) {}
  return cache
}

// Sla een score op (altijd lokaal, en online als het kan) en ververs de lijst.
export async function submit(name, score, city) {
  name = (name || 'SPELER').slice(0, 10)
  localAdd({ name, score, city })
  try {
    await fetch(SUPA_URL + '/rest/v1/highscores', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ name, score, city }),
    })
  } catch (e) {}
  return refresh(city)
}
