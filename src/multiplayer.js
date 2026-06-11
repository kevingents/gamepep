// Multiplayer via Supabase Realtime: een kamer met een code, live posities
// (broadcast), wie er meedoet (presence), en losse gebeurtenissen (scheet/boer,
// tikken). Geen database/tabel nodig - dit is allemaal tijdelijk verkeer.
import { supa } from './supabase.js'

let channel = null
let myId = null
let handlers = {}

// Korte, goed leesbare code (geen I/O/0/1 om verwarring te voorkomen).
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export function makeCode() {
  let s = ''
  for (let i = 0; i < 4; i++) s += ALPHABET[(Math.random() * ALPHABET.length) | 0]
  return s
}

export function inRoom() {
  return !!channel
}

// profile: { id, name, cfg, city }
// cbs: { onState, onFx, onTag, onPresence }
export async function joinRoom(code, profile, cbs) {
  await leaveRoom()
  myId = profile.id
  handlers = cbs || {}
  channel = supa.channel('room:' + code, {
    config: { presence: { key: myId }, broadcast: { self: false } },
  })
  channel.on('broadcast', { event: 'state' }, ({ payload }) => handlers.onState && handlers.onState(payload))
  channel.on('broadcast', { event: 'fx' }, ({ payload }) => handlers.onFx && handlers.onFx(payload))
  channel.on('broadcast', { event: 'tag' }, ({ payload }) => handlers.onTag && handlers.onTag(payload))
  channel.on('presence', { event: 'sync' }, () => {
    if (handlers.onPresence) handlers.onPresence(channel.presenceState())
  })
  return new Promise((resolve) => {
    let done = false
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED' && !done) {
        done = true
        await channel.track({ id: myId, name: profile.name, cfg: profile.cfg, city: profile.city })
        resolve(true)
      } else if ((status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') && !done) {
        done = true
        resolve(false)
      }
    })
  })
}

export function sendState(s) {
  if (channel) channel.send({ type: 'broadcast', event: 'state', payload: { id: myId, ...s } })
}
export function sendFx(kind) {
  if (channel) channel.send({ type: 'broadcast', event: 'fx', payload: { id: myId, kind } })
}
export function sendTag(toId) {
  if (channel) channel.send({ type: 'broadcast', event: 'tag', payload: { from: myId, to: toId } })
}

export async function leaveRoom() {
  if (channel) {
    const ch = channel
    channel = null
    try {
      await supa.removeChannel(ch)
    } catch (e) {}
  }
}
