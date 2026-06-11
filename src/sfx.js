// Kleine geluidjes met de Web Audio API - geen geluidsbestanden nodig.

let audioCtx = null

function getCtx() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (AC) audioCtx = new AC()
  }
  return audioCtx
}

// Mobiel laat geluid pas toe na de eerste aanraking. Roep dit dan aan.
export function resumeAudio() {
  const c = getCtx()
  if (c && c.state === 'suspended') c.resume()
}

function tone(freq, duration, type = 'square', volume = 0.12, delay = 0) {
  const c = getCtx()
  if (!c) return
  const t0 = c.currentTime + delay
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = type
  osc.frequency.value = freq
  gain.gain.setValueAtTime(volume, t0)
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)
  osc.connect(gain).connect(c.destination)
  osc.start(t0)
  osc.stop(t0 + duration)
}

export const sfx = {
  enabled: true,
  // diamant gepakt
  coin() {
    if (!this.enabled) return
    tone(880, 0.07, 'square', 0.12, 0)
    tone(1320, 0.12, 'square', 0.12, 0.06)
  },
  // door creeper gepakt
  bonk() {
    if (!this.enabled) return
    tone(160, 0.2, 'sawtooth', 0.18)
  },
  // ronde gehaald
  win() {
    if (!this.enabled) return
    ;[523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, 'square', 0.14, i * 0.12))
  },
  // arcade start-jingle
  start() {
    if (!this.enabled) return
    ;[392, 523, 659, 784].forEach((f, i) => tone(f, 0.12, 'square', 0.13, i * 0.07))
  },
  // game over
  gameover() {
    if (!this.enabled) return
    ;[523, 415, 330, 220].forEach((f, i) => tone(f, 0.22, 'sawtooth', 0.16, i * 0.16))
  },
}
