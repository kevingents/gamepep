// Kleine geluidjes met de Web Audio API - geen geluidsbestanden nodig.

let audioCtx = null
let musicTimer = null
let musicStep = 0
// vrolijk kort loopje
const MELODY = [392, 0, 523, 587, 523, 440, 392, 0, 440, 0, 587, 659, 523, 440, 392, 0]

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
  // zacht belletje bij een weetje
  fact() {
    if (!this.enabled) return
    tone(660, 0.1, 'sine', 0.12, 0)
    tone(990, 0.14, 'sine', 0.12, 0.08)
  },
  // power-up geactiveerd
  power() {
    if (!this.enabled) return
    ;[523, 784, 1046].forEach((f, i) => tone(f, 0.1, 'square', 0.12, i * 0.05))
  },
  // scheet
  fart() {
    if (!this.enabled) return
    const c = getCtx()
    if (!c) return
    const t0 = c.currentTime
    const osc = c.createOscillator()
    const g = c.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(160, t0)
    osc.frequency.linearRampToValueAtTime(70, t0 + 0.5)
    const lfo = c.createOscillator()
    const lfoG = c.createGain()
    lfo.frequency.value = 18
    lfoG.gain.value = 35
    lfo.connect(lfoG).connect(osc.frequency)
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.linearRampToValueAtTime(0.24, t0 + 0.05)
    g.gain.linearRampToValueAtTime(0.0001, t0 + 0.55)
    osc.connect(g).connect(c.destination)
    osc.start(t0)
    lfo.start(t0)
    osc.stop(t0 + 0.55)
    lfo.stop(t0 + 0.55)
  },
  // boer
  burp() {
    if (!this.enabled) return
    const c = getCtx()
    if (!c) return
    const t0 = c.currentTime
    const osc = c.createOscillator()
    const g = c.createGain()
    osc.type = 'square'
    osc.frequency.setValueAtTime(115, t0)
    osc.frequency.linearRampToValueAtTime(55, t0 + 0.32)
    const lfo = c.createOscillator()
    const lfoG = c.createGain()
    lfo.frequency.value = 26
    lfoG.gain.value = 24
    lfo.connect(lfoG).connect(osc.frequency)
    g.gain.setValueAtTime(0.24, t0)
    g.gain.linearRampToValueAtTime(0.0001, t0 + 0.34)
    osc.connect(g).connect(c.destination)
    osc.start(t0)
    lfo.start(t0)
    osc.stop(t0 + 0.36)
    lfo.stop(t0 + 0.36)
  },
  // zacht voetstapje
  step() {
    if (!this.enabled) return
    tone(170, 0.05, 'triangle', 0.04)
  },
  // vrolijk achtergrondmuziekje (loop)
  musicStart() {
    if (musicTimer) return
    musicStep = 0
    musicTimer = setInterval(() => {
      if (!this.enabled) return
      const f = MELODY[musicStep % MELODY.length]
      musicStep++
      if (f) {
        tone(f, 0.16, 'triangle', 0.05)
        if (musicStep % 4 === 1) tone(f / 2, 0.3, 'sine', 0.04)
      }
    }, 250)
  },
  musicStop() {
    if (musicTimer) {
      clearInterval(musicTimer)
      musicTimer = null
    }
  },
}
