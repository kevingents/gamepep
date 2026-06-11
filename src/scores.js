// Highscores. Nu lokaal (op het apparaat). Later om te zetten naar online
// (Supabase) zonder dat de rest van het spel hoeft te veranderen: alleen deze
// vier functies hoeven dan een netwerk-aanroep te doen.
const KEY = 'haarlem_highscores'
const MAX = 10

export function getTop() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) {}
  return []
}

// Haalt de hoogste highscore (voor de arcade-intro). 0 als er nog niets is.
export function topScore() {
  const top = getTop()
  return top.length ? top[0].score : 0
}

// Komt deze score in de top 10?
export function qualifies(score) {
  const top = getTop()
  return score > 0 && (top.length < MAX || score > top[top.length - 1].score)
}

// Voeg een score toe en geef de nieuwe top-10 terug.
export function addScore(name, score) {
  const top = getTop()
  top.push({ name: (name || 'SPELER').slice(0, 10), score })
  top.sort((a, b) => b.score - a.score)
  const trimmed = top.slice(0, MAX)
  try {
    localStorage.setItem(KEY, JSON.stringify(trimmed))
  } catch (e) {}
  return trimmed
}
