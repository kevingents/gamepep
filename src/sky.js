// Lucht en weer: bewegende wolken, vogels, af en toe een vliegtuig en zo nu
// en dan een regenbui (met donkerdere lucht). Licht gehouden voor mobiel.
import * as THREE from 'three'

export function createSky(scene, GRID, sun, amb) {
  const mat = (c) => new THREE.MeshLambertMaterial({ color: c })
  const rnd = Math.random

  // ---- wolken ----
  const clouds = []
  for (let i = 0; i < 9; i++) {
    const g = new THREE.Group()
    const w = 4 + rnd() * 4
    for (let j = 0; j < 3; j++) {
      const b = new THREE.Mesh(
        new THREE.BoxGeometry(w * (0.5 + rnd() * 0.6), 1.1 + rnd() * 0.8, 2.2 + rnd() * 2.2),
        mat('#ffffff')
      )
      b.position.set((rnd() - 0.5) * w * 0.8, (rnd() - 0.5) * 0.6, (rnd() - 0.5) * 2)
      g.add(b)
    }
    g.position.set(rnd() * (GRID + 60) - 30, 28 + rnd() * 8, rnd() * GRID)
    scene.add(g)
    clouds.push({ g, speed: 0.6 + rnd() * 0.8 })
  }

  // ---- vogels (vliegen rondjes, klapperen met de vleugels) ----
  const birds = []
  for (let i = 0; i < 5; i++) {
    const g = new THREE.Group()
    const col = mat('#2b2f38')
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.18), col)
    const wl = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 0.5).translate(0, 0, 0.25), col)
    const wr = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 0.5).translate(0, 0, -0.25), col)
    g.add(body, wl, wr)
    scene.add(g)
    birds.push({
      g,
      wl,
      wr,
      cx: 15 + rnd() * (GRID - 30),
      cz: 15 + rnd() * (GRID - 30),
      r: 7 + rnd() * 9,
      h: 13 + rnd() * 6,
      a: rnd() * 6.28,
      sp: (0.25 + rnd() * 0.3) * (rnd() < 0.5 ? 1 : -1),
      flap: rnd() * 6,
    })
  }

  // ---- vliegtuig (komt af en toe overvliegen) ----
  const plane = new THREE.Group()
  const fus = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.55, 0.55), mat('#f4f6f8'))
  const wings = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.08, 4.4), mat('#dfe6ee'))
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.95, 0.08), mat('#3a6ff7'))
  fin.position.set(-1.35, 0.6, 0)
  plane.add(fus, wings, fin)
  plane.visible = false
  scene.add(plane)
  let planeT = 8
  let planeActive = false
  let planeDir = 1
  let planeX = 0
  let planeZ = 0

  // ---- regendruppels (volgen de speler) ----
  const RN = 800
  const RANGE = 46
  const RH = 26
  const rpos = new Float32Array(RN * 3)
  for (let i = 0; i < RN; i++) {
    rpos[i * 3] = (rnd() - 0.5) * RANGE
    rpos[i * 3 + 1] = rnd() * RH
    rpos[i * 3 + 2] = (rnd() - 0.5) * RANGE
  }
  const rgeo = new THREE.BufferGeometry()
  rgeo.setAttribute('position', new THREE.BufferAttribute(rpos, 3))
  const rain = new THREE.Points(
    rgeo,
    new THREE.PointsMaterial({ color: 0xaac3e8, size: 0.16, transparent: true, opacity: 0.6 })
  )
  rain.frustumCulled = false
  rain.visible = false
  scene.add(rain)

  // ---- weer: zonnig <-> regenbui ----
  const skySunny = new THREE.Color(0x9fd6ff)
  const skyRain = new THREE.Color(0x8b97aa)
  const tmpC = new THREE.Color()
  let wet = false
  let wTimer = 50 + rnd() * 60
  let w = 0 // 0 = zonnig, 1 = regen

  const api = {
    onRain: null,
    isRaining: () => wet,
    forceRain(v) {
      wet = v
      wTimer = v ? 25 : 90
      if (api.onRain) api.onRain(wet)
    },
    update(dt, px, pz) {
      for (const c of clouds) {
        c.g.position.x += c.speed * dt
        if (c.g.position.x > GRID + 30) c.g.position.x = -30
      }
      for (const b of birds) {
        b.a += b.sp * dt
        b.flap += dt * 9
        b.g.position.set(b.cx + Math.cos(b.a) * b.r, b.h, b.cz + Math.sin(b.a) * b.r)
        const vx = -Math.sin(b.a) * b.sp
        const vz = Math.cos(b.a) * b.sp
        b.g.rotation.y = Math.atan2(-vz, vx)
        const f = Math.sin(b.flap) * 0.7
        b.wl.rotation.x = f
        b.wr.rotation.x = -f
      }
      if (planeActive) {
        planeX += planeDir * 16 * dt
        plane.position.set(planeX, 42, planeZ)
        if (planeX < -40 || planeX > GRID + 40) {
          planeActive = false
          plane.visible = false
          planeT = 25 + rnd() * 35
        }
      } else {
        planeT -= dt
        if (planeT <= 0) {
          planeActive = true
          planeDir = rnd() < 0.5 ? 1 : -1
          planeX = planeDir > 0 ? -35 : GRID + 35
          planeZ = 15 + rnd() * (GRID - 30)
          plane.rotation.y = planeDir > 0 ? 0 : Math.PI
          plane.visible = true
        }
      }
      wTimer -= dt
      if (wTimer <= 0) {
        wet = !wet
        wTimer = wet ? 20 + rnd() * 14 : 70 + rnd() * 70
        if (api.onRain) api.onRain(wet)
      }
      const target = wet ? 1 : 0
      w += Math.sign(target - w) * Math.min(Math.abs(target - w), dt / 2.5)
      tmpC.lerpColors(skySunny, skyRain, w)
      if (scene.background && scene.background.isColor) scene.background.copy(tmpC)
      if (scene.fog) scene.fog.color.copy(tmpC)
      sun.intensity = 1.0 - 0.5 * w
      amb.intensity = 0.62 - 0.12 * w
      rain.visible = w > 0.05
      if (rain.visible) {
        rain.position.set(px, 0, pz)
        const arr = rgeo.attributes.position.array
        for (let i = 0; i < RN; i++) {
          arr[i * 3 + 1] -= 24 * dt
          if (arr[i * 3 + 1] < 0) arr[i * 3 + 1] += RH
        }
        rgeo.attributes.position.needsUpdate = true
      }
    },
  }
  return api
}
