// Kleine geluidjes met de Web Audio API - geen geluidsbestanden nodig.

let audioCtx = null
let musicTimer = null
let musicStep = 0
let rainNode = null
// vrolijk kort loopje
const MELODY = [392, 0, 523, 587, 523, 440, 392, 0, 440, 0, 587, 659, 523, 440, 392, 0]
// eigen feest-deuntje (huisfeestje-sfeer, met dansbeat)
const PARTY = [523, 523, 0, 659, 0, 587, 523, 587, 659, 0, 784, 659, 587, 523, 440, 494]

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
  // baby huilt: hoe hoger het niveau, hoe harder en vaker "waaah"
  babyCry(level) {
    if (!this.enabled) return
    const c = getCtx()
    if (!c) return
    const vol = [0, 0.07, 0.13, 0.2][level] || 0.13
    const n = level >= 2 ? 2 : 1
    for (let i = 0; i < n; i++) {
      const t0 = c.currentTime + i * 0.45
      const osc = c.createOscillator()
      const g = c.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(650 + level * 70, t0)
      osc.frequency.linearRampToValueAtTime(380, t0 + 0.4)
      const lfo = c.createOscillator()
      const lg = c.createGain()
      lfo.frequency.value = 7
      lg.gain.value = 30
      lfo.connect(lg).connect(osc.frequency)
      g.gain.setValueAtTime(0.0001, t0)
      g.gain.linearRampToValueAtTime(vol, t0 + 0.06)
      g.gain.linearRampToValueAtTime(0.0001, t0 + 0.42)
      osc.connect(g).connect(c.destination)
      osc.start(t0)
      lfo.start(t0)
      osc.stop(t0 + 0.45)
      lfo.stop(t0 + 0.45)
    }
  },
  // baby blij na het eten
  babyHappy() {
    if (!this.enabled) return
    ;[660, 880, 1100, 880, 1320].forEach((f, i) => tone(f, 0.09, 'sine', 0.1, i * 0.07))
  },
  // miauw!
  meow() {
    if (!this.enabled) return
    const c = getCtx()
    if (!c) return
    const t0 = c.currentTime
    const osc = c.createOscillator()
    const g = c.createGain()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(620, t0)
    osc.frequency.linearRampToValueAtTime(880, t0 + 0.12)
    osc.frequency.linearRampToValueAtTime(520, t0 + 0.35)
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.linearRampToValueAtTime(0.09, t0 + 0.05)
    g.gain.linearRampToValueAtTime(0.0001, t0 + 0.38)
    osc.connect(g).connect(c.destination)
    osc.start(t0)
    osc.stop(t0 + 0.4)
  },
  // woef woef!
  woof() {
    if (!this.enabled) return
    tone(150, 0.09, 'sawtooth', 0.16)
    tone(110, 0.1, 'sawtooth', 0.14, 0.13)
  },
  // ding-dong: de deurbel
  doorbell() {
    if (!this.enabled) return
    tone(659, 0.3, 'sine', 0.16)
    tone(523, 0.45, 'sine', 0.16, 0.32)
  },
  // achtergrondmuziek: 'vrolijk' (rustig) of 'feest' (huisfeestje met dansbeat)
  musicStart(style) {
    if (musicTimer) return
    musicStep = 0
    const feest = style === 'feest'
    const mel = feest ? PARTY : MELODY
    musicTimer = setInterval(
      () => {
        if (!this.enabled) return
        const f = mel[musicStep % mel.length]
        if (feest && musicStep % 2 === 0) tone(65, 0.12, 'sine', 0.2) // boem-boem
        musicStep++
        if (f) {
          tone(f, feest ? 0.13 : 0.16, feest ? 'square' : 'triangle', feest ? 0.055 : 0.05)
          if (!feest && musicStep % 4 === 1) tone(f / 2, 0.3, 'sine', 0.04)
        }
      },
      feest ? 200 : 250
    )
  },
  musicStop() {
    if (musicTimer) {
      clearInterval(musicTimer)
      musicTimer = null
    }
  },
  // zacht regengeluid (ruis) tijdens een bui
  rainStart() {
    if (!this.enabled || rainNode) return
    const c = getCtx()
    if (!c) return
    const len = 2 * c.sampleRate
    const buf = c.createBuffer(1, len, c.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
    const src = c.createBufferSource()
    src.buffer = buf
    src.loop = true
    const filt = c.createBiquadFilter()
    filt.type = 'lowpass'
    filt.frequency.value = 900
    const g = c.createGain()
    g.gain.value = 0.04
    src.connect(filt).connect(g).connect(c.destination)
    src.start()
    rainNode = src
  },
  rainStop() {
    if (rainNode) {
      try {
        rainNode.stop()
      } catch (e) {}
      rainNode = null
    }
  },
}
