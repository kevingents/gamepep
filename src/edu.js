// De Schoolquiz: rekenen, taal (rijmen/letters) en puzzeltjes voor groep 3.
// nextQuestion() geeft { vraag, opties[3], goed(index), beloning(munten) }.

const RIJM = [
  { w: 'kat', ok: 'mat', nee: ['boom', 'vis'] },
  { w: 'boot', ok: 'groot', nee: ['huis', 'bal'] },
  { w: 'muis', ok: 'huis', nee: ['kat', 'boek'] },
  { w: 'beer', ok: 'peer', nee: ['vis', 'jas'] },
  { w: 'maan', ok: 'baan', nee: ['bos', 'pen'] },
  { w: 'vis', ok: 'mis', nee: ['hond', 'jas'] },
  { w: 'roos', ok: 'doos', nee: ['stoel', 'melk'] },
  { w: 'taart', ok: 'paard', nee: ['fiets', 'zon'] },
]
const LETTERS = [
  ['appel', 'a'],
  ['banaan', 'b'],
  ['vis', 'v'],
  ['school', 's'],
  ['molen', 'm'],
  ['koekje', 'k'],
  ['trein', 't'],
  ['hond', 'h'],
  ['fiets', 'f'],
  ['diamant', 'd'],
]
const NIET_BIJ = [
  { items: ['hond', 'kat', 'vis', 'stoel'], ok: 'stoel' },
  { items: ['appel', 'peer', 'banaan', 'auto'], ok: 'auto' },
  { items: ['rood', 'blauw', 'groen', 'tafel'], ok: 'tafel' },
  { items: ['fiets', 'bus', 'trein', 'boterham'], ok: 'boterham' },
  { items: ['oog', 'neus', 'mond', 'lepel'], ok: 'lepel' },
  { items: ['zon', 'maan', 'ster', 'schoen'], ok: 'schoen' },
]

const pick = (arr) => arr[(Math.random() * arr.length) | 0]
const shuffle = (arr) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0
    const t = a[i]
    a[i] = a[j]
    a[j] = t
  }
  return a
}
// maak een vraag van een goed antwoord + twee foute, op een willekeurige plek
function build(vraag, ok, nee, beloning) {
  const opties = shuffle([String(ok), String(nee[0]), String(nee[1])])
  return { vraag, opties, goed: opties.indexOf(String(ok)), beloning }
}

function rekenen() {
  const plus = Math.random() < 0.6
  if (plus) {
    const a = 1 + ((Math.random() * 9) | 0)
    const b = 1 + ((Math.random() * 9) | 0)
    const ok = a + b
    return build('Hoeveel is ' + a + ' + ' + b + ' ?', ok, foutGetallen(ok), 12)
  }
  let a = 2 + ((Math.random() * 8) | 0)
  let b = 1 + ((Math.random() * a) | 0)
  const ok = a - b
  return build('Hoeveel is ' + a + ' - ' + b + ' ?', ok, foutGetallen(ok), 12)
}
function foutGetallen(ok) {
  const set = new Set([ok])
  const out = []
  while (out.length < 2) {
    const d = ok + (((Math.random() * 5) | 0) - 2) + (Math.random() < 0.5 ? 1 : -1)
    if (d >= 0 && !set.has(d)) {
      set.add(d)
      out.push(d)
    }
  }
  return out
}
function reeks() {
  const start = 1 + ((Math.random() * 6) | 0)
  const stap = pick([1, 2, 2, 5, 10])
  const r = [start, start + stap, start + stap * 2]
  const ok = start + stap * 3
  return build('Welk getal komt erna? ' + r.join(', ') + ', ...', ok, foutGetallen(ok), 14)
}
function rijm() {
  const q = pick(RIJM)
  return build('Welk woord rijmt op "' + q.w + '"?', q.ok, q.nee, 12)
}
function letter() {
  const [woord, l] = pick(LETTERS)
  const fout = shuffle('bcdfghklmnprstvz'.split('').filter((x) => x !== l)).slice(0, 2)
  return build('Met welke letter begint "' + woord + '"?', l.toUpperCase(), [fout[0].toUpperCase(), fout[1].toUpperCase()], 10)
}
function nietBij() {
  const q = pick(NIET_BIJ)
  const nee = q.items.filter((x) => x !== q.ok)
  return build('Welke hoort er NIET bij?', q.ok, [pick(nee), pick(nee.filter((x) => x !== nee[0]))], 14)
}

const SOORTEN = [rekenen, rekenen, reeks, rijm, letter, nietBij]
export function nextQuestion() {
  return pick(SOORTEN)()
}
