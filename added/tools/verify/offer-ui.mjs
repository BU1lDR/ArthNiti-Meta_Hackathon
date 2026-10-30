// Offer-check gate: the "Check an offer" card on /advisory (components/OfferCheck.jsx, with the
// sums in data/loanOffer.js and the sentences in i18n/offerLines.js behind it). The reader
// types in a loan they have been offered and the card says what it costs a year, beside the
// loan the rules priced and the same money at the rate this app assumes. Everything is worked
// out in the tab, so the gate also watches that nothing is sent and nothing is stored. No
// backend and no model are involved: the result page is seeded from the driver's saved
// responses (screenshots/verify/case_*.json, from refresh-cases.mjs), and every figure the
// page must print is written down in this file (the totals and yearly costs come from
// tools/verify/offer_reference.py, which finds them with a different method from the app's),
// and the words come from the dictionary itself.
//
// What it reports, in order of how badly each one lets a reader down:
//
//   WRONG-FIGURE  a sentence of the result is not, word for word and figure for figure, the
//                 dictionary's sentence filled with the reference figures (total paid, extra,
//                 the yearly cost, the comparison at 12% and its difference).
//   GUESSED       a result is shown that the typed numbers do not earn: a box is empty, how
//                 often the payments fall was not said, or a box holds a mistake.
//   DEFAULT-CHOSEN  "how was the offer told" or "how often" is already chosen before the reader
//                 chose it. A guess would be priced as an answer.
//   BANNED-WORD   the card uses a word of tools/verify/offer-banned.mjs (illegal, too high,
//                 cheat, and their translations): it states what an offer costs and gives no
//                 opinion on it. The loan the rules priced is left out of the scan: its
//                 sentences are the page's own and are older than this card.
//   NETWORK       a request, a socket, a beacon, a form post, a cache or an IndexedDB open was
//                 made after the page had settled, while the reader typed and chose.
//   STORAGE       anything was written to sessionStorage, localStorage or a cookie meanwhile,
//                 or the stored values differ from before.
//   WRONG-ERROR   a box with a mistake has no message, the wrong one, or a box without a
//                 mistake has one. Each message is the dictionary's, with its limit filled in.
//   LINES         the result has other sentences than the typed numbers earn (the id of each
//                 sentence is the page's `data-offer-line`).
//   PRICED-MISMATCH  the loan the rules priced is shown before a result, is missing after one,
//                 or is not the 60-month option of the saved response with its reason and
//                 assumption. In Detailed view its figures also have to be in the loan-options
//                 card, as that card prints them.
//   CAPTION       the notes under the form are not the ones this state calls for (the note on
//                 365 payments a year appears for daily payments with a cost, and only then).
//   LABEL         a label, legend, heading or note is not the dictionary's wording.
//   ARIA          a box without a label tied to it, an aria-invalid that does not match the
//                 message, a description that names nothing, an alert without its role, a card
//                 not named by its heading, or a ₹ mark that a screen reader would read out.
//   LIVE-REGION   the area that announces the result is not on the page before the result, is
//                 not the same element after it, or does not carry role="status".
//   HIDDEN        the card is not drawn: in Simple view (the default), in Detailed, or inside
//                 the Detailed-only block that Simple hides.
//   NO-CARD       there is no card on /advisory. On any other page, there is one.
//   STRUCTURE     a control the card has to have is missing, or there is one too many; a box
//                 is not a text box with the numeric keyboard, or does not stop at the number
//                 of characters it should; the heading of the card is not an h2.
//   STATE         the card is not in the state the gate's clicks and typing put it in: a radio
//                 not chosen, a value lost or changed (a value is kept for each way of telling
//                 the offer, and does not pass from one to the other).
//   LEAK          braces, a dotted key, NaN, undefined, null or Infinity on the card.
//   DIGITS        a digit of another script, where digits stay 0 to 9.
//   DUPLICATE-ID  an id used twice on the page.
//   FIGURE-WRAP   a figure that breaks across two lines.
//   LAYOUT        sideways scroll, anything outside the card or the viewport, a clipped box,
//                 text under 12 px, a tap target or radio button under 44 px on a phone, a
//                 radio button under 20 px with a mouse.
//   COVERED       another element sits on the spot a press lands on.
//   FOCUS-LOST    typing a digit moved the focus out of the box.
//   PRINT         the card is shown in print.
//   LANG-SWITCH   a language switch lost what was typed or left words of the old language.
//   PAGE-ERROR    an exception, or a console error, on any page of the run.
//
// Scenarios: O1 the card appears, empty, in 8 languages in Simple and Detailed view; O2 the
// figures of every kind of offer (all three frequencies, cost, the same, less, the comparison
// more, less and the same, a half rupee, the largest numbers); O3 every mistake a box can hold
// and its message, the numbers at the edge of what a box takes, the payments box before the
// frequency is chosen, and forty nines typed into every box; O4 the loan the rules priced, for
// each of the six statuses a response has, for the largest loan the schedule can price and for
// a response saved without the loan options; O5 a whole sitting sends and stores nothing,
// going to /analysis and back by the app's own links brings the card back empty and sends and
// stores nothing, and a reload starts clean; O6 results in each of the 8 languages; O7 layout
// at 320 px with the largest text in the dark (8 languages), at 390 px and on a desktop, and
// again beside the largest priced loan; O8 what was typed for each way of telling an offer
// stays with it; O9 typing one digit at a time, backspacing, and an empty box; O10 a language
// switch with a result shown; O11 print; O12 the card is on no other page.
//
// Fixtures are screenshots/verify/case_empty.json (the rules priced part of the gap),
// case_good.json (the whole gap), case_green.json (no gap) and case_pressure.json (no room),
// and two copies of the last with the other two reasons no loan was priced. Two more are made
// from case_good.json: one saved without the loan options, and one whose 60-month loan is the
// largest the schedule can price (₹99,99,96,000, with the figures schedule_service gives for
// it, whose totals end in a single decimal). The gate stops with exit 2 if one of the files is
// missing or is not what its name says. Run the Vite dev server first (no backend), then:
//   node tools/verify/offer-ui.mjs
// Exit 0: nothing found. 1: a finding. 2: the run could not measure: the app is not
// answering; the working directory is wrong; a fixture is missing or has changed; port 9383
// is already answering; AppContext no longer reads the seed's version; a load is NOT-RENDERED
// or UNSEEDED; the hooks did not install (NO-HOOKS); a scenario evaluated nothing; Edge's
// DevTools socket closed; or the run crashed or ended before its verdict. report.json starts
// with `exit`; a crash, or a run that never started, leaves none.
//
// --only=O1,O9  runs just those scenarios, to find out why one fails. It is never a verdict:
//   it exits 1 on a finding and 2 otherwise, and report.json names the scenarios it ran.
//
// --broken[=network,storage,default,banned,figure,wrap,overflow,print,live,leak]  plant a
//   defect in the PAGE (a script that runs before the app's own) and expect the gate to
//   notice. network: a request on every keystroke. storage: every keystroke stored. default:
//   the first choice already ticked. banned: the language's first banned word on the first
//   line. figure: a digit of the first figure changed. wrap: the lines squeezed so that every
//   figure breaks. overflow: the card wider than the screen. print: the card shown in print.
//   live: the sentences carried by a copy of the area that announces the result, not the area
//   that was on the page. leak: "{total}" left on the first line. Bare --broken applies all
//   of them. It exits 1 when each arm's findings appear
//   and 2 when one is missing ("unrefuted"), and it writes under
//   screenshots/verify/offer-ui-broken.
//
// The arms plant defects in the page from outside. Defects were also planted in the app's own
// source (OfferCheck.jsx, AdvisoryPage.jsx, AnalysisPage.jsx, index.css), one at a time, with the
// gate run against each: tools/README.md has the table and the two it cannot see.
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { BANNED, bannedIn } from './offer-banned.mjs'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const DEBUG_PORT = 9383
const ARGS = process.argv.slice(2)
const argValue = (name) => {
  const hit = ARGS.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : ''
}
const APP = (argValue('url') || 'http://localhost:5173').replace(/\/+$/, '')
const ARMS = ['network', 'storage', 'default', 'banned', 'figure', 'wrap', 'overflow', 'print', 'live', 'leak']
const brokenArg = ARGS.find((a) => a === '--broken' || a.startsWith('--broken='))
const BROKEN = new Set(!brokenArg ? [] : brokenArg === '--broken' ? ARMS : brokenArg.slice('--broken='.length).split(','))
for (const arm of BROKEN) {
  if (!ARMS.includes(arm)) {
    console.error(`offer-ui: --broken= takes ${ARMS.join(', ')}, not ${JSON.stringify(arm)}`)
    process.exit(2)
  }
}
const FLAWS = Object.fromEntries(ARMS.map((arm) => [arm, BROKEN.has(arm)]))
// --only=O1,O9 runs those scenarios and no others: for finding a fault, never for a verdict.
const ONLY = argValue('only') ? new Set(argValue('only').toLowerCase().split(',').map((x) => x.trim())) : null
// A fixed folder per mode. main() empties it before it writes.
const OUT = resolve('screenshots/verify', BROKEN.size ? 'offer-ui-broken' : 'offer-ui')
const PROFILE_DIR = resolve('screenshots/verify/edge-profile-offer')

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Our Edge dies by PID and nothing else, never by image name, which would close the Edge
// the person running the gate has open. Same technique as read-aloud.mjs: the browser
// process that carries OUR profile path and no --type= (taskkill /T takes its children).
let edge = null
function ownEdgePids() {
  const script =
    "$p = [regex]::Escape($env:OFFER_EDGE_PROFILE) + '(?=[\"\\s]|$)'; " +
    "Get-CimInstance Win32_Process -Filter \"name='msedge.exe'\" | Where-Object { $_.CommandLine -and " +
    "$_.CommandLine -match $p -and $_.CommandLine -notmatch '--type=' } | ForEach-Object { $_.ProcessId }"
  const r = spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', script], {
    env: { ...process.env, OFFER_EDGE_PROFILE: PROFILE_DIR },
    encoding: 'utf8',
  })
  return (r.stdout || '').split(/\s+/).filter((s) => /^\d+$/.test(s)).map(Number)
}
function killOwnEdge() {
  const kill = (pid) => spawnSync('taskkill', ['/F', '/T', '/PID', String(pid)], { stdio: 'ignore' })
  // A spawned PID that has already exited is skipped: it may belong to something else by now.
  if (edge && edge.exitCode === null && edge.signalCode === null) kill(edge.pid)
  edge = null
  for (const pid of ownEdgePids()) kill(pid)
}

// Node's own exit on an uncaught error is 1, which reads as a finding, so anything thrown or
// rejected that nothing catches exits 2 instead.
process.on('uncaughtException', (err) => {
  console.error(err)
  killOwnEdge()
  crashExit()
})
// A crash exits 2 through this rather than process.exit(2) at once: for up to about 100 ms
// after fetch() reads a response V8 can still be recompiling undici's WASM HTTP parser on a
// worker thread, and exiting in that window kills node with 0xC0000409. tools/README.md,
// Exit codes, has the measurements.
function crashExit() {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000)
  process.exit(2)
}
// A run that ends without reaching its verdict exits 2; the verdict overrides it.
process.exitCode = 2
// Every path in this file resolves against the working directory.
if (!existsSync(resolve('tools/verify/offer-ui.mjs'))) {
  console.error(`offer-ui: ${process.cwd()} is not the repo root. Run this from the repo root: node tools/verify/offer-ui.mjs`)
  process.exit(2)
}
// A report.json on disk is always from a run that finished.
rmSync(resolve(OUT, 'report.json'), { force: true })

async function requireServer(url, start) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
    await res.body?.cancel()
    if (res.ok) return true
    console.error(`offer-ui: ${url} answered HTTP ${res.status}. ${start}`)
  } catch (err) {
    console.error(`offer-ui: nothing answered at ${url} (${err.cause?.code || err.name}). ${start}`)
  }
  process.exitCode = 2
  return false
}

// AppContext silently discards a payload whose v is not in its READABLE_VERSIONS, and every
// result page then shows its empty state. The seed is the current shape, a result only.
const SEED_VERSION = 6
{
  const file = 'frontend/src/context/AppContext.jsx'
  const m = readFileSync(resolve(file), 'utf8').match(/^const READABLE_VERSIONS = new Set\(\[([\d,\s]*)\]\)/m)
  if (!m?.[1].split(',').map(Number).includes(SEED_VERSION)) {
    console.error(m
      ? `offer-ui: ${file} no longer reads version ${SEED_VERSION} payloads (READABLE_VERSIONS is ${m[1].trim()}). Rewrite the seed in the current shape and raise SEED_VERSION.`
      : `offer-ui: READABLE_VERSIONS not found in ${file}; update the parse in offer-ui.mjs.`)
    process.exit(2)
  }
}

// The words the page must print, from the dictionary itself, with the same per-key English
// fallback t() has, and the same plain replacement of {placeholders}.
const { RESULT_STRINGS } = await import(pathToFileURL(resolve('frontend/src/i18n/resultStrings.js')).href)
const norm = (s) => String(s ?? '').replace(/\s+/g, ' ').trim()
const text = (lang, key) => {
  const value = RESULT_STRINGS[lang]?.[key] ?? RESULT_STRINGS.en[key]
  if (typeof value !== 'string') throw new Error(`${key} is not defined in resultStrings.js`)
  return norm(value)
}
const fill = (lang, key, vars = {}) => text(lang, key).replace(/\{(\w+)\}/g, (hole, name) => (name in vars ? String(vars[name]) : hole))
const q = (value) => JSON.stringify(value)
// Every message is built before ok() looks at its condition, so this has to take anything,
// undefined included (JSON.stringify(undefined) is undefined, not a string).
const short = (v) => {
  const t = typeof v === 'string' ? v : (JSON.stringify(v) ?? String(v))
  return t.length > 170 ? `${t.slice(0, 167)}...` : t
}

// Money the way the page prints it: Indian grouping, Latin digits, written here and not taken
// from the app. inr2 keeps the paise, as the loan-options card does.
const group = (digits) => digits.replace(/\B(?=(\d{2})*\d{3}$)/g, ',')
const inr = (n) => `₹${group(String(n))}`
const inr2 = (n) => `₹${group(String(Math.trunc(n)))}.${n.toFixed(2).split('.')[1]}`

// --- fixtures -----------------------------------------------------------------------------
// Each response has to be what its name says, or the run measures something else than it
// reports. All of them price loans at 12% a year.
const RESULTS = {}
for (const [key, file, status] of [
  ['partial', 'case_empty', 'partial'],
  ['covered', 'case_good', 'covered'],
  ['no_gap', 'case_green', 'no_gap'],
  ['no_room', 'case_pressure', 'no_room'],
]) {
  const path = resolve(`screenshots/verify/${file}.json`)
  if (!existsSync(path)) {
    console.error(`offer-ui: ${path} is missing. Start the backend and run node tools/verify/refresh-cases.mjs.`)
    process.exit(2)
  }
  const result = JSON.parse(readFileSync(path, 'utf8'))
  const fo = result?.financing_options
  if (fo?.status !== status || fo?.assumed_interest_rate_percent !== 12) {
    console.error(`offer-ui: ${file}.json has financing status ${q(fo?.status)} at ${fo?.assumed_interest_rate_percent}%, not ${q(status)} at 12%. Run node tools/verify/refresh-cases.mjs.`)
    process.exit(2)
  }
  RESULTS[key] = result
}
// The other two reasons no loan was priced, made from the response with no room.
for (const status of ['no_surplus', 'household_over_limit']) {
  const copy = structuredClone(RESULTS.no_room)
  copy.financing_options.status = status
  RESULTS[status] = copy
}
// A response saved before the loan options existed (the page leaves that card out): the offer
// card has no priced loan to show and no assumed rate to compare with.
{
  const copy = structuredClone(RESULTS.covered)
  delete copy.financing_options
  RESULTS.nofin = copy
}
// A response that prices a very large loan, whose totals end in a single decimal: the page prints
// them with two ("₹1,33,46,61,516.10"), and a money format that drops the trailing zero prints
// "₹1,33,46,61,516.1". It is `covered` with the 60-month option's figures replaced by what
// schedule_service gives for a loan of 999,996,000 at 12% (a whole thousand, as the options
// are), so it is not a saved response.
{
  const copy = structuredClone(RESULTS.covered)
  const sixty = copy.financing_options.options.find((o) => o.tenure_months === 60)
  Object.assign(sixty, { loan_amount: 999996000, monthly_repayment: 22244359, total_repayment: 1334661516.1, total_interest: 334665516.1 })
  RESULTS.wideloan = copy
}
// The loan the card shows beside an offer: the one the rules recommend, else the largest. For
// these responses that is the 60-month option; if a refresh changes it, say so here and not in
// a wall of findings.
const PRICED_OPTION = {}
for (const key of ['partial', 'covered', 'wideloan']) {
  const fo = RESULTS[key].financing_options
  const sixty = fo.options.find((o) => o.tenure_months === 60)
  const right = sixty && (key !== 'partial'
    ? fo.recommended_by_rules === sixty.code
    : fo.recommended_by_rules == null && fo.options.every((o) => o.loan_amount <= sixty.loan_amount))
  if (!right) {
    console.error(`offer-ui: in the ${key} response the loan shown beside an offer is no longer the 60-month option. Update PRICED_OPTION.`)
    process.exit(2)
  }
  PRICED_OPTION[key] = sixty
}

// --- what the page must print --------------------------------------------------------------
const LANGS = ['en', 'hi', 'ta', 'te', 'ml', 'kn', 'mr', 'bn']
const BOXES = { instalments: ['received', 'instalment', 'payments'], rate: ['received', 'rate', 'months'] }
// The boxes that take money, and so carry the ₹ mark; and how many characters each box takes
// (the gate's own record of the card's `maxLength`s: a longer paste is cut short and not priced).
const MONEY_BOXES = ['received', 'instalment']
const CAP = { received: 15, instalment: 15, payments: 6, rate: 10, months: 6 }
// The offers the gate types in. `total` is what is paid back in all, `yearly` the yearly cost
// as the page prints it (three significant digits), `assumed` the same money at 12% a year,
// to a whole rupee. The instalment offers are from offer_reference.py; a rate offer is plain
// arithmetic on the whole amount (received x rate x months / 100, half a rupee up).
const OFFERS = {
  monthly: { mode: 'instalments', often: 'monthly', vals: { received: '10000', instalment: '889', payments: '12' }, received: 10000, total: 10668, yearly: '12.1%', assumed: 10662 },
  weekly: { mode: 'instalments', often: 'weekly', vals: { received: '5000', instalment: '500', payments: '12' }, received: 5000, total: 6000, yearly: '152%', assumed: 5075 },
  daily: { mode: 'instalments', often: 'daily', vals: { received: '5000', instalment: '100', payments: '60' }, received: 5000, total: 6000, yearly: '226%', assumed: 5050 },
  flat: { mode: 'instalments', often: 'monthly', vals: { received: '5000', instalment: '100', payments: '60' }, received: 5000, total: 6000, yearly: '7.42%', assumed: 6673 },
  long: { mode: 'instalments', often: 'monthly', vals: { received: '100000', instalment: '4000', payments: '36' }, received: 100000, total: 144000, yearly: '25.5%', assumed: 119572 },
  once: { mode: 'instalments', often: 'monthly', vals: { received: '1000', instalment: '1100', payments: '1' }, received: 1000, total: 1100, yearly: '120%', assumed: 1010 },
  weekly30: { mode: 'instalments', often: 'weekly', vals: { received: '20000', instalment: '700', payments: '30' }, received: 20000, total: 21000, yearly: '16.5%', assumed: 20723 },
  wide: { mode: 'instalments', often: 'daily', vals: { received: '1000000000', instalment: '1000000000', payments: '3650' }, received: 1000000000, total: 3650000000000, yearly: '36,500%', assumed: 1717361308 },
  padded: { mode: 'instalments', often: 'monthly', vals: { received: ' 10000 ', instalment: ' 889 ', payments: ' 12 ' }, received: 10000, total: 10668, yearly: '12.1%', assumed: 10662 },
  less: { mode: 'instalments', often: 'monthly', vals: { received: '1000', instalment: '100', payments: '5' }, kind: 'less', received: 1000, total: 500 },
  same: { mode: 'instalments', often: 'monthly', vals: { received: '1000', instalment: '100', payments: '10' }, kind: 'same', received: 1000, total: 1000 },
  rate3: { mode: 'rate', vals: { received: '10000', rate: '3', months: '12' }, received: 10000, total: 13600, yearly: '36%', assumed: 11200 },
  rateHalfUp: { mode: 'rate', vals: { received: '10020', rate: '2.5', months: '1' }, received: 10020, total: 10271, yearly: '30%', assumed: 10120 },
  rateSame: { mode: 'rate', vals: { received: '10000', rate: '1', months: '12' }, received: 10000, total: 11200, yearly: '12%', assumed: 11200 },
  rateLess: { mode: 'rate', vals: { received: '10000', rate: '0.5', months: '12' }, received: 10000, total: 10600, yearly: '6%', assumed: 11200 },
  rateDot: { mode: 'rate', vals: { received: '10000', rate: '.5', months: '12' }, received: 10000, total: 10600, yearly: '6%', assumed: 11200 },
  rateTrail: { mode: 'rate', vals: { received: '10000', rate: '3.', months: '12' }, received: 10000, total: 13600, yearly: '36%', assumed: 11200 },
  rateMax: { mode: 'rate', vals: { received: '10000', rate: '100', months: '12' }, received: 10000, total: 130000, yearly: '1,200%', assumed: 11200 },
  rateWide: { mode: 'rate', vals: { received: '1000000000', rate: '100', months: '120' }, received: 1000000000, total: 121000000000, yearly: '1,200%', assumed: 2200000000 },
  // weekly, 60 payments: the same money and payments as `daily` and `flat`, the third frequency
  weeklyFlat: { mode: 'instalments', often: 'weekly', vals: { received: '5000', instalment: '100', payments: '60' }, received: 5000, total: 6000, yearly: '32.2%', assumed: 5360 },
  // the months at the top of the range, where the rate offer costs exactly what 12% would
  rateLong: { mode: 'rate', vals: { received: '10000', rate: '1', months: '120' }, received: 10000, total: 22000, yearly: '12%', assumed: 22000 },
  // less and the same with daily payments: no note on 365 payments a year, there is no cost
  lessDaily: { mode: 'instalments', often: 'daily', vals: { received: '1000', instalment: '10', payments: '50' }, kind: 'less', received: 1000, total: 500 },
  sameDaily: { mode: 'instalments', often: 'daily', vals: { received: '1000', instalment: '10', payments: '100' }, kind: 'same', received: 1000, total: 1000 },
  // the edges a box takes: the largest amount, the largest payment, and the most payments of each kind
  largest: { mode: 'instalments', often: 'monthly', vals: { received: '1000000000', instalment: '889', payments: '12' }, kind: 'less', received: 1000000000, total: 10668 },
  largestPayment: { mode: 'instalments', often: 'monthly', vals: { received: '1000000000', instalment: '1000000000', payments: '1' }, kind: 'same', received: 1000000000, total: 1000000000 },
  month120: { mode: 'instalments', often: 'monthly', vals: { received: '10000', instalment: '80', payments: '120' }, kind: 'less', received: 10000, total: 9600 },
  week520: { mode: 'instalments', often: 'weekly', vals: { received: '10000', instalment: '10', payments: '520' }, kind: 'less', received: 10000, total: 5200 },
  day3650: { mode: 'instalments', often: 'daily', vals: { received: '10000', instalment: '1', payments: '3650' }, kind: 'less', received: 10000, total: 3650 },
  // typed one key at a time (O9): 3, then 3., then 3.5 (10000 x 3.5 x 12 / 100 = 4200 more)
  rateKeys: { mode: 'rate', vals: { received: '10000', rate: '3.5', months: '12' }, received: 10000, total: 14200, yearly: '42%', assumed: 11200 },
}
const RATE = '12%'

// The sentences under the form for a typed offer, in order, as the page has to print them.
// `comparison` is false for a response with no assumed rate, which has nothing to compare with.
function linesFor(lang, c, comparison = true) {
  const kind = c.kind || 'cost'
  if (kind === 'less') return [{ id: 'total', text: fill(lang, 'offer.resultLess', { received: inr(c.received), total: inr(c.total) }) }]
  if (kind === 'same') return [{ id: 'total', text: fill(lang, 'offer.resultSame', { received: inr(c.received), total: inr(c.total) }) }]
  const lines = [
    { id: 'total', text: fill(lang, 'offer.resultCost', { received: inr(c.received), total: inr(c.total), extra: inr(c.total - c.received) }) },
    { id: 'yearly', text: fill(lang, 'offer.resultYearly', { percent: c.yearly }) },
  ]
  if (!comparison) return lines
  const diff = c.total - c.assumed
  const compare =
    diff > 0
      ? fill(lang, 'offer.vsMore', { rate: RATE, total: inr(c.assumed), diff: inr(diff) })
      : diff < 0
        ? fill(lang, 'offer.vsLess', { rate: RATE, total: inr(c.assumed), diff: inr(-diff) })
        : fill(lang, 'offer.vsSame', { rate: RATE, total: inr(c.assumed) })
  return [...lines, { id: 'compare', text: compare }, { id: 'compareNote', text: fill(lang, 'offer.vsNote', { rate: RATE }) }]
}

// The loan the rules priced, as the block under the result prints it: a title, then either a
// term, four rows and the assumption, or the one reason no loan was priced; nothing when the
// response had no gap or no loan options at all.
const REASON_KEY = { no_room: 'fo.noRoom', no_surplus: 'fo.noSurplus', household_over_limit: 'fo.householdOver' }
function pricedFor(lang, fixture) {
  if (fixture === 'no_gap' || fixture === 'nofin') return null
  const title = text(lang, 'offer.pricedTitle')
  const o = PRICED_OPTION[fixture]
  if (o) {
    return {
      title,
      paras: [fill(lang, 'fo.term', { months: 60 }), fill(lang, 'fo.assumption', { rate: 12 })],
      rows: [
        [text(lang, 'fo.loan'), inr(o.loan_amount)],
        [text(lang, 'fo.perMonth'), inr(o.monthly_repayment)],
        [text(lang, 'fo.totalBack'), inr2(o.total_repayment)],
        [text(lang, 'fo.interest'), inr2(o.total_interest)],
      ],
    }
  }
  return { title, paras: [text(lang, REASON_KEY[fixture])], rows: [] }
}

// What the card has to look like for a state: the choices, the typed values, the messages, the
// sentences under the form and the priced loan.
const blankValues = (way) => Object.fromEntries((BOXES[way] || []).map((id) => [id, '']))
// `kind` is what the numbers earn: cost, less or same, and null when they earn nothing.
const W = (lang, over = {}) => ({ lang, way: '', often: '', values: {}, errors: {}, kind: null, lines: [], priced: null, fixture: 'covered', detail: 'simple', ...over })
function wantOffer(lang, often, c, { fixture = 'covered', detail = 'simple' } = {}) {
  return W(lang, { way: c.mode, often, values: c.vals, kind: c.kind || 'cost', lines: linesFor(lang, c, fixture !== 'nofin'), priced: pricedFor(lang, fixture), fixture, detail })
}

// The limit a message names, as the page prints it.
const LIMIT = { received: inr(1000000000), instalment: inr(1000000000), months: '120', rate: '100', paymentsmonthly: '120', paymentsweekly: '520', paymentsdaily: '3,650' }
const errText = (lang, kind, box, often) =>
  kind === 'range'
    ? fill(lang, 'offer.errRange', { max: box === 'payments' ? LIMIT[`payments${often}`] : LIMIT[box] })
    : text(lang, kind === 'whole' ? 'offer.errWhole' : 'offer.errRate')

// Written independently of the app's \p{Nd}: the digits of the scripts the app has, plus
// the other Indian scripts.
const NON_LATIN_DIGIT = /[\u0660-\u0669\u06F0-\u06F9\u0966-\u096F\u09E6-\u09EF\u0A66-\u0A6F\u0AE6-\u0AEF\u0B66-\u0B6F\u0BE6-\u0BEF\u0C66-\u0C6F\u0CE6-\u0CEF\u0D66-\u0D6F\uFF10-\uFF19]/
const LEAKED = /\{[^}]*\}|\bNaN\b|\bundefined\b|\bnull\b|\bInfinity\b|\[object|\b(?:offer|fo|common|res|form|sch|ch|amt|plan|errf)\.[A-Za-z]/

// --- the hooks, installed before the page's own scripts ------------------------------------
// Written as a real function and sent as its source, so it is checked by the same eyes and
// the same editor as the rest of this file. It runs in the page, not here. It seeds the
// result and the reader's preferences, then records everything the page does that could carry
// what is typed off the tab or keep it: requests of every kind, the storage calls, cookies.
// The --broken arms plant their defects here too.
function installPage(cfg, seed, version) {
  if (!/^https?:$/.test(location.protocol)) return
  sessionStorage.setItem('sih-application', JSON.stringify({ v: version, data: seed.result ? { result: seed.result } : {} }))
  localStorage.setItem('sih-language', seed.lang)
  localStorage.setItem('sih-theme', seed.theme)
  localStorage.setItem('sih-textsize', seed.size)
  localStorage.setItem('sih-detail', seed.detail)
  localStorage.removeItem('sih-dialect')

  const calls = []
  const note = (kind, detail) => calls.push(kind + ' ' + String(detail).slice(0, 120))
  const origFetch = window.fetch
  window.fetch = function (input) {
    note('fetch', input && input.url ? input.url : input)
    return origFetch.apply(this, arguments)
  }
  const xhrOpen = XMLHttpRequest.prototype.open
  XMLHttpRequest.prototype.open = function (method, url) {
    note('xhr', method + ' ' + url)
    return xhrOpen.apply(this, arguments)
  }
  if (navigator.sendBeacon) {
    const beacon = navigator.sendBeacon
    navigator.sendBeacon = function (url) {
      note('beacon', url)
      return beacon.apply(this, arguments)
    }
  }
  for (const name of ['WebSocket', 'EventSource']) {
    const Original = window[name]
    if (Original) window[name] = new Proxy(Original, { construct(target, args) { note(name.toLowerCase(), args[0]); return Reflect.construct(target, args) } })
  }
  document.addEventListener('submit', (event) => note('form', event.target && event.target.action), true)
  if (window.IDBFactory) {
    const open = IDBFactory.prototype.open
    IDBFactory.prototype.open = function (name) {
      note('indexeddb', name)
      return open.apply(this, arguments)
    }
  }
  if (window.CacheStorage) {
    const open = CacheStorage.prototype.open
    CacheStorage.prototype.open = function (name) {
      note('cache', name)
      return open.apply(this, arguments)
    }
  }
  for (const op of ['setItem', 'removeItem', 'clear']) {
    const original = Storage.prototype[op]
    Storage.prototype[op] = function (key) {
      note('storage', (this === localStorage ? 'local.' : this === sessionStorage ? 'session.' : '?.') + op + ' ' + (key === undefined ? '' : key))
      return original.apply(this, arguments)
    }
  }
  const cookie = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie')
  Object.defineProperty(document, 'cookie', {
    configurable: true,
    get() { return cookie.get.call(document) },
    set(value) { note('cookie', value); cookie.set.call(document, value) },
  })

  window.__offer = {
    calls,
    snapshot: () => JSON.stringify({ local: Object.fromEntries(Object.entries(localStorage)), session: Object.fromEntries(Object.entries(sessionStorage)), cookie: document.cookie }),
  }

  // --- the planted defects ---------------------------------------------------------------
  const inCard = (el) => !!(el && el.closest && el.closest('[data-offer="card"]'))
  // This runs before the page has a root element, so a style waits for one.
  const css = (rules) => {
    const style = document.createElement('style')
    style.textContent = rules
    const put = () => {
      if (!document.documentElement) return false
      document.documentElement.appendChild(style)
      return true
    }
    if (put()) return
    const waiting = new MutationObserver(() => { if (put()) waiting.disconnect() })
    waiting.observe(document, { childList: true })
  }
  const watch = (fn) => new MutationObserver(fn).observe(document, { childList: true, subtree: true, characterData: true })
  if (cfg.flaws.network) {
    document.addEventListener('input', (event) => { if (inCard(event.target)) window.fetch('/offer-ping?x=' + encodeURIComponent(event.target.value)).catch(() => {}) }, true)
  }
  if (cfg.flaws.storage) {
    document.addEventListener('input', (event) => { if (inCard(event.target)) sessionStorage.setItem('offer-typed', event.target.value) }, true)
  }
  if (cfg.flaws.default) {
    // The card comes with the first way and the first frequency already chosen: each is pressed
    // as it appears, so the card's own state follows and the run carries on with a guess in place.
    watch(() => {
      for (const radio of document.querySelectorAll('[data-offer="card"] input[type="radio"]')) {
        if (radio.dataset.planted) continue
        radio.dataset.planted = '1'
        if (radio.value === 'instalments' || radio.value === 'monthly') radio.click()
      }
    })
  }
  // A text defect is applied again whenever the app writes a new sentence into the line: the
  // text it last planted is remembered, and a line that does not read as that gets the
  // defect once more. The change it makes is seen by the same observer and left alone.
  const planted = new WeakMap()
  const plant = (selector, transform) =>
    watch(() => {
      for (const el of document.querySelectorAll(selector)) {
        if (planted.get(el) === el.textContent) continue
        const next = transform(el.textContent)
        el.textContent = next
        planted.set(el, next)
      }
    })
  // One observer for the first line: planted one by one, the first would hide the other two.
  const onTotal = []
  if (cfg.flaws.figure) onTotal.push((text) => text.replace(/\d/, (digit) => String((Number(digit) + 1) % 10)))
  if (cfg.flaws.banned) onTotal.push((text) => text + ' ' + cfg.bannedWord)
  if (cfg.flaws.leak) onTotal.push((text) => text + ' {total}')
  if (onTotal.length) plant('[data-offer-line="total"]', (text) => onTotal.reduce((now, change) => change(now), text))
  if (cfg.flaws.live) {
    // As the first result appears, the sentences are carried by another element than the one that
    // was on the page: a copy is put in front of the original, kept in step with it, and the
    // original is hidden. The original is not swapped out, because the node is the one React
    // holds, and the next time it inserted something beside it the page would stop.
    const handled = new WeakSet()
    watch(() => {
      for (const region of document.querySelectorAll('[data-offer="result"]')) {
        if (handled.has(region) || !region.querySelector('[data-offer-line]')) continue
        const copy = region.cloneNode(true)
        handled.add(region)
        handled.add(copy)
        region.before(copy)
        region.style.display = 'none'
        new MutationObserver(() => { copy.innerHTML = region.innerHTML }).observe(region, { childList: true, subtree: true, characterData: true })
      }
    })
  }
  if (cfg.flaws.wrap) css('[data-offer-line]{width:4ch !important;overflow-wrap:anywhere !important;word-break:break-all !important}')
  if (cfg.flaws.overflow) css('[data-offer="card"]{min-width:900px !important}')
  if (cfg.flaws.print) css('@media print{[data-offer="card"]{display:block !important}}')
}

// --- what is read from, and done to, the page ---------------------------------------------
// Each of these runs in the page. `inPage` sends the function's source with its arguments.
const inPage = (fn, ...args) => `(${fn.toString()})(...${JSON.stringify(args)})`

// The card as the reader sees it, read out of the DOM.
function readCard() {
  const clean = (s) => (s || '').replace(/\s+/g, ' ').trim()
  const card = document.querySelector('[data-offer="card"]')
  if (!card) return { present: false, path: location.pathname }
  const region = card.querySelector('[data-offer="result"]')
  const priced = card.querySelector('[data-offer="priced"]')
  const style = getComputedStyle(card)
  const rect = card.getBoundingClientRect()
  const words = (root, skip) => {
    const parts = []
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (skip && skip.contains(node)) continue
      if (node.parentElement && node.parentElement.closest('[aria-hidden="true"]')) continue
      parts.push(node.data)
    }
    return clean(parts.join(' '))
  }
  const ids = [...document.querySelectorAll('[id]')].map((e) => e.id)
  const duplicateIds = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))]
  const details = card.querySelector('details')
  const label = (id) => document.querySelector('label[for="' + id + '"]')
  const resolve = (token) => {
    const el = document.getElementById(token)
    return { id: token, found: !!el, role: el ? el.getAttribute('role') : null, text: el ? clean(el.textContent) : '' }
  }
  return {
    present: true,
    path: location.pathname,
    shown: style.display !== 'none' && style.visibility !== 'hidden' && rect.height > 0,
    inDetailOnly: !!card.closest('.ui-detail-only'),
    eyebrow: clean(card.querySelector('.ui-eyebrow') && card.querySelector('.ui-eyebrow').textContent),
    title: clean(card.querySelector('#offer-title') && card.querySelector('#offer-title').textContent),
    titleTag: card.querySelector('#offer-title') ? card.querySelector('#offer-title').tagName : '',
    // the name a screen reader gives the card: the text of the element its aria-labelledby points at
    labelledBy: card.getAttribute('aria-labelledby') || '',
    labelledText: clean(document.getElementById(card.getAttribute('aria-labelledby') || '-') && document.getElementById(card.getAttribute('aria-labelledby') || '-').textContent),
    // the rupee marks before the money boxes: read out as "rupee" by a screen reader unless hidden
    prefixes: [...card.querySelectorAll('.ui-money-prefix')].map((p) => ({ text: clean(p.textContent), hidden: p.getAttribute('aria-hidden') })),
    intro: clean(card.querySelector('#offer-title') && card.querySelector('#offer-title').nextElementSibling && card.querySelector('#offer-title').nextElementSibling.textContent),
    fieldsets: [...card.querySelectorAll('fieldset')].map((set) => ({
      legend: clean(set.querySelector('legend') && set.querySelector('legend').textContent),
      radios: [...set.querySelectorAll('input[type="radio"]')].map((r) => ({
        name: r.name,
        value: r.value,
        checked: r.checked,
        label: clean(r.closest('label') && r.closest('label').textContent),
      })),
    })),
    boxes: [...card.querySelectorAll('input:not([type="radio"])')].map((i) => ({
      id: i.id,
      type: i.type,
      inputMode: i.inputMode,
      maxLength: i.maxLength,
      autocomplete: i.getAttribute('autocomplete'),
      value: i.value,
      label: clean(label(i.id) && label(i.id).textContent),
      hint: clean(document.getElementById(i.id + '-hint') && document.getElementById(i.id + '-hint').textContent),
      invalid: i.getAttribute('aria-invalid'),
      describedBy: (i.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean).map(resolve),
    })),
    alerts: [...card.querySelectorAll('[role="alert"]')].map((a) => ({ id: a.id, text: clean(a.textContent) })),
    region: region
      ? {
          role: region.getAttribute('role'),
          // load() marks the element it found when the page settled; a copy has no mark
          same: region.__same === true,
          text: clean(region.textContent),
          lines: [...region.querySelectorAll('[data-offer-line]')].map((p) => ({ id: p.dataset.offerLine, text: clean(p.textContent) })),
        }
      : null,
    priced: priced
      ? {
          title: clean(priced.querySelector('h3') && priced.querySelector('h3').textContent),
          paras: [...priced.querySelectorAll('p')].map((p) => clean(p.textContent)),
          rows: [...priced.querySelectorAll('dl > div')].map((d) => [clean(d.querySelector('dt') && d.querySelector('dt').textContent), clean(d.querySelector('dd') && d.querySelector('dd').textContent)]),
        }
      : null,
    captions: [...card.querySelectorAll('p.ui-chart-caption')].map((p) => clean(p.textContent)),
    details: {
      summary: clean(details && details.querySelector('summary') && details.querySelector('summary').textContent),
      body: details ? [...details.querySelectorAll('.ui-disclosure-body > p')].map((p) => clean(p.textContent)) : [],
    },
    textNoPriced: words(card, priced),
    textAll: words(card, null),
    duplicateIds,
    detailText: [...document.querySelectorAll('.ui-detail-only')].map((e) => e.textContent).join(' '),
  }
}

// Where to press, and whether anything else is on that spot.
function spotAt(selector) {
  const el = document.querySelector(selector)
  if (!el) return null
  el.scrollIntoView({ block: 'center', behavior: 'instant' })
  const r = el.getBoundingClientRect()
  const x = r.left + r.width / 2
  const y = r.top + r.height / 2
  const hit = document.elementFromPoint(x, y)
  const covered = !(hit && (hit === el || el.contains(hit)))
  return { x, y, covered, by: hit ? `${hit.tagName.toLowerCase()}.${String(hit.className).slice(0, 40)}` : 'nothing' }
}

function chooseLanguage(code) {
  const select = document.querySelector('select.ui-utility-select')
  if (!select) return false
  Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(select, code)
  select.dispatchEvent(new Event('change', { bubbles: true }))
  return select.value === code
}

// Where the card's parts are, for the layout checks.
function measureCard(minFont) {
  const doc = document.documentElement
  const card = document.querySelector('[data-offer="card"]')
  if (!card) return null
  const box = (el) => {
    const r = el.getBoundingClientRect()
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }
  }
  const name = (el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.dataset && (el.dataset.offerLine || el.dataset.offer) ? '[' + (el.dataset.offerLine || el.dataset.offer) + ']' : '')
  const c = box(card)
  const outside = []
  const clipped = []
  const small = []
  for (const el of card.querySelectorAll('*')) {
    const r = el.getBoundingClientRect()
    if (r.width === 0 || r.height === 0) continue
    const cs = getComputedStyle(el)
    if (cs.visibility === 'hidden') continue
    if (r.right > c.right + 0.5 || r.left < c.left - 0.5) outside.push(name(el))
    const ownText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
    if (ownText && cs.display !== 'inline' && el.scrollWidth > el.clientWidth + 1) clipped.push(name(el))
    if (ownText && parseFloat(cs.fontSize) < minFont) small.push(name(el) + ' ' + parseFloat(cs.fontSize).toFixed(1) + 'px')
  }
  const style = getComputedStyle(card)
  return {
    vw: doc.clientWidth,
    scrollWidth: doc.scrollWidth,
    card: c,
    outside,
    clipped,
    small,
    touch: [...card.querySelectorAll('label.ui-check, input[type="text"], summary')].map((el) => ({ name: name(el), height: box(el).height })),
    radios: [...card.querySelectorAll('input[type="radio"]')].map((el) => ({ name: name(el), width: box(el).width, height: box(el).height })),
    shown: style.display !== 'none' && style.visibility !== 'hidden' && c.height > 0,
    display: style.display,
  }
}

// The figures that break across two lines, found by asking each one for its line boxes.
function brokenFigures() {
  const out = []
  const roots = document.querySelectorAll('[data-offer="result"], [data-offer="priced"], [data-offer="card"] [role="alert"]')
  for (const root of roots) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const pattern = /₹?\d[\d,]*(?:\.\d+)?%?/g
      let hit
      while ((hit = pattern.exec(node.data))) {
        const range = document.createRange()
        range.setStart(node, hit.index)
        range.setEnd(node, hit.index + hit[0].length)
        const rects = [...range.getClientRects()].filter((r) => r.height > 0)
        if (rects.length < 2) continue
        const top = Math.min(...rects.map((r) => r.top))
        const lowest = Math.max(...rects.map((r) => r.top))
        const height = Math.min(...rects.map((r) => r.height))
        if (lowest - top > height * 0.6) out.push(hit[0])
      }
    }
  }
  return out
}

function printState() {
  const card = document.querySelector('[data-offer="card"]')
  if (!card) return null
  const style = getComputedStyle(card)
  return { display: style.display, height: card.getBoundingClientRect().height }
}

// --- minimal CDP client, session-aware (as in read-aloud.mjs) -------------------------------
class CDP {
  constructor(url) {
    this.ws = new WebSocket(url)
    this.next = 1
    this.pending = new Map()
    this.pageErrors = []
    this.requests = []
    this.sessionId = null
    this.closed = false

    this.ready = new Promise((res, rej) => {
      this.ws.addEventListener('open', () => res())
      this.ws.addEventListener('error', () => rej(new Error('CDP socket error')))
      this.ws.addEventListener('close', () => rej(new Error('CDP socket closed')))
    })

    // Edge gone closes the socket, and no reply is coming for anything still waiting.
    this.ws.addEventListener('close', () => {
      this.closed = true
      for (const slot of this.pending.values()) slot.reject(new Error(slot.method + ': CDP socket closed'))
      this.pending.clear()
    })

    this.ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data)
      if (msg.method === 'Runtime.exceptionThrown') {
        this.pageErrors.push(msg.params?.exceptionDetails?.exception?.description || msg.params?.exceptionDetails?.text || 'unknown')
      }
      if (msg.method === 'Runtime.consoleAPICalled' && msg.params?.type === 'error') {
        this.pageErrors.push('console.error: ' + (msg.params.args || []).map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 300))
      }
      if (msg.method === 'Network.requestWillBeSent') {
        this.requests.push({ url: msg.params?.request?.url || '', method: msg.params?.request?.method || '', type: msg.params?.type || '' })
      }
      if (msg.method === 'Network.webSocketCreated') this.requests.push({ url: msg.params?.url || '', method: 'WS', type: 'WebSocket' })
      const slot = this.pending.get(msg.id)
      if (!slot) return
      this.pending.delete(msg.id)
      if (msg.error) slot.reject(new Error(slot.method + ': ' + msg.error.message))
      else slot.resolve(msg.result)
    })
  }

  send(method, params = {}, useSession = true) {
    // A frame sent on a socket that is not open is dropped without a word, so its reply
    // would never come.
    if (this.ws.readyState !== WebSocket.OPEN) {
      this.closed = true
      return Promise.reject(new Error(method + ': CDP socket closed'))
    }
    const id = this.next++
    const envelope = { id, method, params }
    if (useSession && this.sessionId) envelope.sessionId = this.sessionId
    return new Promise((res, rej) => {
      this.pending.set(id, { resolve: res, reject: rej, method })
      this.ws.send(JSON.stringify(envelope))
    })
  }

  async evaluate(expression) {
    const r = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (r.exceptionDetails) throw new Error('page threw: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text))
    return r.result.value
  }
}

async function browserWsUrl() {
  for (let i = 0; i < 80; i++) {
    try {
      const info = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`, { signal: AbortSignal.timeout(2000) })).json()
      if (info.webSocketDebuggerUrl) return info.webSocketDebuggerUrl
    } catch { /* not listening yet */ }
    await sleep(250)
  }
  throw new Error('Edge never opened the DevTools endpoint on port ' + DEBUG_PORT)
}

// Polls an expression until it is truthy. Returns its last value, falsy on a timeout. A
// page still loading can fail an evaluate, which only means not yet; a closed socket means
// never, and stops the run.
async function until(cdp, expression, ms = 2500) {
  const end = Date.now() + ms
  for (;;) {
    const value = await cdp.evaluate(expression).catch((err) => { if (cdp.closed) throw err; return undefined })
    if (value || Date.now() > end) return value
    await sleep(60)
  }
}

// --- scenarios: findings and faults ----------------------------------------------------
const findings = []
const faults = []
const checks = new Map()
const seen = new Set()
let loads = 0

function scenario(id) {
  checks.set(id, 0)
  return {
    ok(condition, kind, detail) {
      checks.set(id, checks.get(id) + 1)
      if (condition) return
      const key = `${id}|${kind}|${detail}`
      if (seen.has(key)) return
      seen.add(key)
      findings.push({ scn: id, kind, detail })
    },
    fault(detail) { faults.push({ scn: id, detail }) },
  }
}

let scriptId = null
// What the page looked like once it had settled: the requests so far and the stored values.
let base = { requests: 0, snapshot: '' }

// A fresh document with the seed and the hooks in place, and the page drawn and quiet.
async function load(cdp, s, o) {
  const { route = '/advisory', lang = 'en', fixture = 'covered', result, detail = 'simple', size = 'md', theme = 'light', phone = null } = o
  const seedResult = result === null ? null : (result ?? RESULTS[fixture])
  const cfg = { flaws: FLAWS, bannedWord: BANNED[lang][0] }
  if (scriptId) await cdp.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: scriptId })
  const added = await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `(${installPage.toString()})(${JSON.stringify(cfg)}, ${JSON.stringify({ result: seedResult, lang, theme, size, detail })}, ${SEED_VERSION})`,
  })
  scriptId = added.identifier
  // mobile: true is what makes the viewport meta tag apply.
  if (phone) {
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: phone[0], height: phone[1], deviceScaleFactor: 2, mobile: true })
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
  } else {
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false })
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false })
  }
  await cdp.send('Emulation.setEmulatedMedia', { media: '' })
  cdp.pageErrors.length = 0
  // The old document answers until the new one commits, so it is marked, and the new one
  // is the first without the mark.
  await cdp.evaluate('window.__old = true').catch(() => {})
  const { errorText } = await cdp.send('Page.navigate', { url: APP + route })
  if (errorText) throw new Error(`${route} did not load (${errorText}). Is the app still running?`)
  loads++
  // Three result pages have the light; every other page has text in #main.
  const ready = seedResult && ['/advisory', '/analysis', '/report'].includes(route)
    ? `!!document.querySelector('.ui-band')`
    : `(document.querySelector('#main')?.innerText?.trim().length || 0) > 40`
  const drawn = await until(cdp, `!window.__old && (document.querySelector('#main')?.innerText?.trim().length || 0) > 40 && ${ready}`, 12000)
  if (!drawn) {
    s.fault(`${route} (${lang}) never drew: NOT-RENDERED, or the seed was not read (UNSEEDED)`)
    return false
  }
  if (seedResult) {
    const seeded = await cdp.evaluate(`(() => { try { return !!JSON.parse(sessionStorage.getItem('sih-application')).data.result } catch { return false } })()`)
    if (!seeded) {
      s.fault(`${route} (${lang}): UNSEEDED, the app discarded the seed`)
      return false
    }
  }
  if (!(await cdp.evaluate('!!window.__offer'))) {
    s.fault(`${route} (${lang}): NO-HOOKS, the hooks did not install`)
    return false
  }
  // The Simple/Detailed switch is drawn with a result, so a page without one has no mode.
  const mode = await cdp.evaluate('document.documentElement.dataset.detail')
  if (route === '/advisory' && seedResult && mode !== detail) {
    s.fault(`${route} (${lang}): <html data-detail> is ${q(mode)}, so the page is not in the mode the case says (${detail})`)
    return false
  }
  // Settled: nothing new requested for a moment. Whatever happens after this is the card's.
  let last = -1
  for (let i = 0; i < 40; i++) {
    await sleep(120)
    if (cdp.requests.length === last) break
    last = cdp.requests.length
  }
  await cdp.evaluate('window.__offer.calls.length = 0')
  base = { requests: cdp.requests.length, snapshot: await cdp.evaluate('window.__offer.snapshot()') }
  await markResultArea(cdp)
  return true
}

// The area that announces the result has to be the same element before and after a result, so
// the element on the page now is marked, and a card that swaps it for another loses the mark.
const markResultArea = (cdp) => cdp.evaluate(`(() => { const r = document.querySelector('[data-offer="result"]'); if (r) r.__same = true })()`)

const NETWORK_CALLS = /^(fetch|xhr|beacon|websocket|eventsource|form|indexeddb|cache) /
const errors = (cdp, s, tag) => s.ok(!cdp.pageErrors.length, 'PAGE-ERROR', `${tag}: ${cdp.pageErrors[0]}`)

// Nothing was sent and nothing was stored since the page settled.
async function quiet(cdp, s, tag) {
  const sent = cdp.requests.slice(base.requests)
  const calls = await cdp.evaluate('window.__offer.calls.slice()')
  const snapshot = await cdp.evaluate('window.__offer.snapshot()')
  s.ok(sent.length === 0 && !calls.some((c) => NETWORK_CALLS.test(c)), 'NETWORK', `${tag}: ${sent.length} request(s) after the page settled: ${short(sent.map((r) => `${r.method} ${r.type} ${r.url}`).concat(calls.filter((c) => NETWORK_CALLS.test(c))))}`)
  s.ok(snapshot === base.snapshot && !calls.some((c) => !NETWORK_CALLS.test(c)), 'STORAGE', `${tag}: storage changed or was written: ${short(calls.filter((c) => !NETWORK_CALLS.test(c)))}${snapshot === base.snapshot ? '' : ' (the stored values differ)'}`)
}

// --- driving the card the way a thumb and a keyboard would ---------------------------------
const spotOf = (cdp, selector) => cdp.evaluate(inPage(spotAt, selector))

async function mouseAt(cdp, spot) {
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: spot.x, y: spot.y })
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: spot.x, y: spot.y, button: 'left', clickCount: 1 })
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: spot.x, y: spot.y, button: 'left', clickCount: 1 })
}

// A press on `selector`. A control the card does not have is a finding, not a fault: the app
// is what is wrong, not the run.
async function click(cdp, s, selector, tag) {
  const spot = await spotOf(cdp, selector)
  if (!spot) {
    s.ok(false, 'STRUCTURE', `${tag}: nothing at ${selector} to press`)
    return null
  }
  s.ok(!spot.covered, 'COVERED', `${tag}: ${spot.by} sits on ${selector}`)
  await mouseAt(cdp, spot)
  await sleep(60)
  return spot
}

const radioLabel = (name, value) => `label:has(input[name="${name}"][value="${value}"])`
const chooseWay = (cdp, s, value, tag) => click(cdp, s, radioLabel('offer-way', value), tag)
const chooseOften = (cdp, s, value, tag) => click(cdp, s, radioLabel('offer-often', value), tag)

// A press on the app's own link to `path`: the page changes and the document stays. The caller
// sets window.__stay first, and a link that loaded a new document would have lost it, which
// would make this a reload and say nothing about leaving. A hop that does not arrive is a fault
// of the run, not a finding about the card.
async function hop(cdp, s, tag, path) {
  if (!(await click(cdp, s, `nav.ui-navbar a[href="${path}"]`, tag))) return false
  if (!(await until(cdp, `window.__stay === true && location.pathname === ${q(path)} && !!document.querySelector('.ui-band')`, 8000))) {
    s.fault(`${tag}: ${path} did not come up in the same document`)
    return false
  }
  await markResultArea(cdp)
  return true
}

async function backspace(cdp) {
  const key = { key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8, nativeVirtualKeyCode: 8 }
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', ...key })
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', ...key })
}

// Into a box: a press to focus it, everything in it selected and removed, then the text.
async function typeBox(cdp, s, id, value, tag) {
  const selector = `#${id}`
  const spot = await click(cdp, s, selector, tag)
  if (!spot) return false
  const had = await cdp.evaluate(`(() => { const el = document.querySelector(${q(selector)}); el.select(); return el.value.length })()`)
  if (had > 0) await backspace(cdp)
  if (value !== '') await cdp.send('Input.insertText', { text: value })
  await sleep(60)
  return true
}

// Puts a typed offer into the card: the way, how often (instalments), then every box.
async function enter(cdp, s, tag, c) {
  await chooseWay(cdp, s, c.mode, tag)
  if (c.mode === 'instalments') await chooseOften(cdp, s, c.often, tag)
  for (const id of BOXES[c.mode]) await typeBox(cdp, s, `offer-${id}`, c.vals[id], tag)
}

// --- the check of a state against what the dictionary and the reference figures say --------
async function checkCard(cdp, s, tag, want) {
  const page = await cdp.evaluate(inPage(readCard))
  if (!page.present) {
    s.ok(false, 'NO-CARD', `${tag}: there is no loan-offer card on ${page.path}`)
    return null
  }
  const { lang } = want
  const w = (key) => text(lang, key)
  const same = (got, expected, kind, what) => s.ok(norm(got) === norm(expected), kind, `${tag}: ${what} is ${q(short(got))}, not ${q(short(expected))}`)

  s.ok(page.shown, 'HIDDEN', `${tag}: the card is not drawn`)
  s.ok(!page.inDetailOnly, 'HIDDEN', `${tag}: the card is inside the Detailed-only block, which Simple view hides`)
  same(page.eyebrow, w('offer.eyebrow'), 'LABEL', 'the eyebrow')
  same(page.title, w('offer.title'), 'LABEL', 'the heading')
  // The card is a region named by its heading, and the heading sits at the level of the other
  // cards on the page (/advisory draws every card title as an h2, its parts as h3).
  s.ok(page.labelledBy === 'offer-title' && norm(page.labelledText) === norm(w('offer.title')), 'ARIA', `${tag}: the card is named by ${q(page.labelledBy)} (${q(short(page.labelledText))}), not by its heading ${q(short(w('offer.title')))}`)
  s.ok(page.titleTag === 'H2', 'STRUCTURE', `${tag}: the heading of the card is a ${q(page.titleTag)}, not an H2`)
  same(page.intro, w('offer.intro'), 'LABEL', 'the introduction')
  same(page.details.summary, w('offer.how'), 'LABEL', 'the summary of the explanation')
  s.ok(page.details.body.length === 2 && norm(page.details.body[0]) === norm(w('offer.howYearly')) && norm(page.details.body[1]) === norm(w('offer.howCompare')), 'LABEL', `${tag}: the explanation is ${q(short(page.details.body))}, not the two sentences of the dictionary`)

  // The two groups of radio buttons, none chosen until the reader chooses.
  const sets = [{ legend: w('offer.wayLegend'), name: 'offer-way', radios: [['instalments', w('offer.wayPayments')], ['rate', w('offer.wayRate')]], chosen: want.way }]
  if (want.way === 'instalments') {
    sets.push({ legend: w('offer.oftenLegend'), name: 'offer-often', radios: [['daily', w('offer.daily')], ['weekly', w('offer.weekly')], ['monthly', w('offer.monthly')]], chosen: want.often })
  }
  s.ok(page.fieldsets.length === sets.length, 'STRUCTURE', `${tag}: ${page.fieldsets.length} group(s) of choices, not ${sets.length}`)
  sets.forEach((set, i) => {
    const got = page.fieldsets[i]
    if (!got) return
    same(got.legend, set.legend, 'LABEL', `the legend of ${set.name}`)
    s.ok(got.radios.length === set.radios.length && got.radios.every((r, k) => r.name === set.name && r.value === set.radios[k][0]), 'STRUCTURE', `${tag}: the radio buttons of ${set.name} are ${q(short(got.radios.map((r) => `${r.name}=${r.value}`)))}`)
    got.radios.forEach((r, k) => set.radios[k] && same(r.label, set.radios[k][1], 'LABEL', `the label of ${set.name}=${r.value}`))
    const chosen = got.radios.filter((r) => r.checked).map((r) => r.value)
    if (set.chosen === '') s.ok(chosen.length === 0, 'DEFAULT-CHOSEN', `${tag}: ${set.name} is already ${q(chosen)} before the reader chose`)
    else s.ok(chosen.length === 1 && chosen[0] === set.chosen, 'STATE', `${tag}: ${set.name} has ${q(chosen)} chosen, not ${q(set.chosen)}`)
  })

  // The boxes, their labels, their values and their messages.
  const ids = (BOXES[want.way] || []).map((id) => `offer-${id}`)
  s.ok(JSON.stringify(page.boxes.map((b) => b.id)) === JSON.stringify(ids), 'STRUCTURE', `${tag}: the boxes are ${q(page.boxes.map((b) => b.id))}, not ${q(ids)}`)
  const labelKey = { received: want.way === 'rate' ? 'offer.lent' : 'offer.received', instalment: 'offer.instalment', payments: 'offer.payments', rate: 'offer.rate', months: 'offer.months' }
  const alerts = new Map(page.alerts.map((a) => [a.id, a.text]))
  for (const box of page.boxes) {
    const name = box.id.replace('offer-', '')
    same(box.label, w(labelKey[name]), 'LABEL', `the label of ${box.id}`)
    s.ok(box.type === 'text' && box.autocomplete === 'off' && box.inputMode === (name === 'rate' ? 'decimal' : 'numeric'), 'STRUCTURE', `${tag}: ${box.id} is type ${box.type}, inputmode ${box.inputMode}, autocomplete ${box.autocomplete}`)
    s.ok(box.maxLength === CAP[name], 'STRUCTURE', `${tag}: ${box.id} takes ${box.maxLength} characters, not ${CAP[name]}`)
    s.ok(box.value === (want.values[name] ?? ''), 'STATE', `${tag}: ${box.id} holds ${q(box.value)}, not ${q(want.values[name] ?? '')}`)
    const message = want.errors[name]
    s.ok((box.invalid === 'true') === !!message, 'ARIA', `${tag}: ${box.id} has aria-invalid ${q(box.invalid)} ${message ? 'with' : 'without'} a message`)
    s.ok(box.describedBy.every((d) => d.found), 'ARIA', `${tag}: ${box.id} is described by an id that is not on the page: ${q(short(box.describedBy.filter((d) => !d.found).map((d) => d.id)))}`)
    s.ok(box.describedBy.some((d) => d.id === `${box.id}-error`) === !!message, 'ARIA', `${tag}: ${box.id} ${message ? 'is not' : 'is'} described by its message`)
    if (name === 'rate') {
      same(box.hint, w('offer.rateHelp'), 'LABEL', 'the hint under the rate box')
      s.ok(box.describedBy.some((d) => d.id === 'offer-rate-hint'), 'ARIA', `${tag}: the rate box is not described by its hint`)
    }
    if (message) {
      const got = alerts.get(`${box.id}-error`)
      s.ok(got !== undefined && norm(got) === norm(message), 'WRONG-ERROR', `${tag}: ${box.id} says ${q(short(got ?? '(nothing)'))}, not ${q(short(message))}`)
    }
  }
  // One ₹ mark before each money box, and none before the others; the mark is decoration, so it
  // is hidden from a screen reader (the label already says it is money).
  const marks = (BOXES[want.way] || []).filter((id) => MONEY_BOXES.includes(id)).length
  s.ok(page.prefixes.length === marks && page.prefixes.every((p) => p.text === '₹' && p.hidden === 'true'), 'ARIA', `${tag}: the rupee marks are ${q(page.prefixes)}, not ${marks} hidden ₹`)
  const wantedAlerts = Object.keys(want.errors).map((name) => `offer-${name}-error`)
  s.ok(JSON.stringify(page.alerts.map((a) => a.id).sort()) === JSON.stringify(wantedAlerts.sort()), 'WRONG-ERROR', `${tag}: the messages shown are for ${q(page.alerts.map((a) => a.id))}, not ${q(wantedAlerts)}`)

  // The sentences of the result, the region that announces them and the priced loan.
  s.ok(!!page.region && page.region.role === 'status', 'LIVE-REGION', `${tag}: the area for the result has role ${q(page.region?.role)}`)
  s.ok(!!page.region && page.region.same, 'LIVE-REGION', `${tag}: the area for the result is not the element that was on the page before the result`)
  const lines = page.region ? page.region.lines : []
  if (want.lines.length === 0) {
    s.ok(lines.length === 0, 'GUESSED', `${tag}: a result is shown that these numbers do not earn: ${q(short(lines.map((l) => l.text)))}`)
  } else {
    const gotIds = lines.map((l) => l.id)
    const wantIds = want.lines.map((l) => l.id)
    s.ok(JSON.stringify(gotIds) === JSON.stringify(wantIds), 'LINES', `${tag}: the sentences are ${q(gotIds)}, not ${q(wantIds)}`)
    want.lines.forEach((line, i) => lines[i] && lines[i].id === line.id && same(lines[i].text, line.text, 'WRONG-FIGURE', `the ${line.id} sentence`))
  }
  // The priced loan comes with a result and not before; the expectation is the gate's own, not
  // read back from the page.
  const priced = want.lines.length > 0 ? want.priced : null
  if (!priced) {
    s.ok(page.priced === null, 'PRICED-MISMATCH', `${tag}: the priced loan is shown${want.lines.length === 0 ? ' before there is a result' : ' for a response that priced none'}`)
  } else if (!page.priced) {
    s.ok(false, 'PRICED-MISMATCH', `${tag}: the priced loan is not shown beside a result`)
  } else {
    same(page.priced.title, priced.title, 'PRICED-MISMATCH', 'the title of the priced loan')
    s.ok(JSON.stringify(page.priced.paras.map(norm)) === JSON.stringify(priced.paras.map(norm)), 'PRICED-MISMATCH', `${tag}: the priced loan says ${q(short(page.priced.paras))}, not ${q(short(priced.paras))}`)
    s.ok(JSON.stringify(page.priced.rows.map((r) => r.map(norm))) === JSON.stringify(priced.rows.map((r) => r.map(norm))), 'PRICED-MISMATCH', `${tag}: the priced loan rows are ${q(short(page.priced.rows))}, not ${q(short(priced.rows))}`)
    if (want.detail === 'detailed') {
      for (const [, value] of priced.rows) s.ok(page.detailText.includes(value), 'PRICED-MISMATCH', `${tag}: ${value} is on the priced loan and not in the loan-options card`)
    }
  }

  // The notes under the form: the rate note (rate way), the note on daily payments (a cost
  // for daily payments), the assumption of the priced loan, and the note that the card gives
  // no opinion.
  const captions = []
  if (want.way === 'rate') captions.push(w('offer.rateNote'))
  if (want.way === 'instalments' && want.often === 'daily' && want.kind === 'cost') captions.push(w('offer.howDaily'))
  if (priced && page.priced && priced.rows.length > 0) captions.push(priced.paras[1])
  captions.push(w('offer.howNot'))
  s.ok(JSON.stringify(page.captions.map(norm)) === JSON.stringify(captions.map(norm)), 'CAPTION', `${tag}: the notes are ${q(short(page.captions))}, not ${q(short(captions))}`)

  // Whatever the card prints, in any state.
  const found = bannedIn(page.textNoPriced, lang)
  s.ok(found.length === 0, 'BANNED-WORD', `${tag}: the card uses ${q(found)}`)
  s.ok(!LEAKED.test(page.textAll), 'LEAK', `${tag}: ${q(short((page.textAll.match(LEAKED) || [])[0]))} is on the card`)
  s.ok(!NON_LATIN_DIGIT.test(page.textAll), 'DIGITS', `${tag}: a digit of another script is on the card`)
  s.ok(page.duplicateIds.length === 0, 'DUPLICATE-ID', `${tag}: ${q(page.duplicateIds)} is used twice on the page`)
  errors(cdp, s, tag)
  return page
}

// --- shared by the scenarios below ----------------------------------------------------------
// One character as a key press, the way a person at a keyboard types it.
async function pressKey(cdp, ch) {
  const digit = /^\d$/.test(ch)
  const key = {
    key: ch,
    code: digit ? `Digit${ch}` : ch === '.' ? 'Period' : `Key${ch.toUpperCase()}`,
    windowsVirtualKeyCode: digit ? 48 + Number(ch) : ch === '.' ? 190 : ch.toUpperCase().charCodeAt(0),
  }
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', text: ch, unmodifiedText: ch, ...key })
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', ...key })
  await sleep(40)
}
const focusedId = (cdp) => cdp.evaluate('document.activeElement ? document.activeElement.id : ""')

// One key (or Backspace) into the box that has the focus; then the focus has to still be in
// that box, and the card has to be what `want` says.
async function stroke(cdp, s, tag, boxId, press, want) {
  if (press === 'Backspace') await backspace(cdp)
  else await pressKey(cdp, press)
  await sleep(60)
  s.ok((await focusedId(cdp)) === boxId, 'FOCUS-LOST', `${tag}: the focus is no longer in ${boxId}`)
  await checkCard(cdp, s, tag, want)
}

// --- O1: the card appears, empty, with the dictionary's words ---------------------------------
async function o1Appears(cdp) {
  const s = scenario('O1')
  for (const detail of ['simple', 'detailed']) {
    for (const lang of LANGS) {
      const tag = `${detail}, ${lang}`
      if (!(await load(cdp, s, { lang, detail }))) continue
      const page = await checkCard(cdp, s, tag, W(lang, { detail }))
      if (!page) continue
      s.ok(page.region && page.region.text === '', 'GUESSED', `${tag}: the area for the result holds ${q(page.region?.text)} before anything is typed`)
      await quiet(cdp, s, tag)
    }
  }
}

// --- O2: the figures of every kind of offer ------------------------------------------------
const INSTALMENT_KEYS = ['monthly', 'weekly', 'daily', 'flat', 'long', 'once', 'weekly30', 'weeklyFlat', 'padded', 'less', 'same', 'lessDaily', 'sameDaily', 'wide', 'monthly']
const RATE_KEYS = ['rate3', 'rateHalfUp', 'rateSame', 'rateLess', 'rateDot', 'rateTrail', 'rateMax', 'rateWide', 'rateLong', 'rateKeys']

async function o2Figures(cdp) {
  const s = scenario('O2')
  if (!(await load(cdp, s, { lang: 'en' }))) return
  for (const key of INSTALMENT_KEYS) {
    const c = OFFERS[key]
    const tag = `en, ${key}`
    await enter(cdp, s, tag, c)
    await checkCard(cdp, s, tag, wantOffer('en', c.often, c))
  }
  // The same sum and the same number of payments, told at each frequency: only the cost moves.
  await enter(cdp, s, 'en, one sum', OFFERS.daily)
  for (const key of ['daily', 'flat', 'weeklyFlat', 'daily']) {
    const c = OFFERS[key]
    const tag = `en, one sum, ${c.often}`
    await chooseOften(cdp, s, c.often, tag)
    await checkCard(cdp, s, tag, wantOffer('en', c.often, c))
  }
  for (const key of RATE_KEYS) {
    const c = OFFERS[key]
    const tag = `en, ${key}`
    await enter(cdp, s, tag, c)
    await checkCard(cdp, s, tag, wantOffer('en', 'daily', c))
  }
  await quiet(cdp, s, 'en, figures')
}

// --- O3: every mistake a box can hold, and what the card says about it ------------------------
// [name, way, how often, the boxes, [[kind of message, box], ...]]: the card has to show those
// messages and nothing else, and no result. A box left out is empty.
const MISTAKES = [
  ['abc in the money in hand', 'instalments', 'monthly', { received: 'abc', instalment: '889', payments: '12' }, [['whole', 'received']]],
  ['a comma', 'instalments', 'monthly', { received: '1,000', instalment: '889', payments: '12' }, [['whole', 'received']]],
  ['a sign', 'instalments', 'monthly', { received: '-5', instalment: '889', payments: '12' }, [['whole', 'received']]],
  ['zero', 'instalments', 'monthly', { received: '0', instalment: '889', payments: '12' }, [['whole', 'received']]],
  ['Devanagari digits', 'instalments', 'monthly', { received: '१०००', instalment: '889', payments: '12' }, [['whole', 'received']]],
  ['a decimal point', 'instalments', 'monthly', { received: '12.5', instalment: '889', payments: '12' }, [['whole', 'received']]],
  ['one rupee over the largest', 'instalments', 'monthly', { received: '1000000001', instalment: '889', payments: '12' }, [['range', 'received']]],
  ['abc in the payment', 'instalments', 'monthly', { received: '10000', instalment: 'abc', payments: '12' }, [['whole', 'instalment']]],
  ['a payment over the largest', 'instalments', 'monthly', { received: '10000', instalment: '1000000001', payments: '12' }, [['range', 'instalment']]],
  ['no payments', 'instalments', 'monthly', { received: '10000', instalment: '889', payments: '0' }, [['whole', 'payments']]],
  ['121 monthly payments', 'instalments', 'monthly', { received: '10000', instalment: '889', payments: '121' }, [['range', 'payments']]],
  ['521 weekly payments', 'instalments', 'weekly', { received: '10000', instalment: '889', payments: '521' }, [['range', 'payments']]],
  ['3651 daily payments', 'instalments', 'daily', { received: '10000', instalment: '889', payments: '3651' }, [['range', 'payments']]],
  ['three mistakes at once', 'instalments', 'monthly', { received: 'abc', instalment: 'xyz', payments: '0' }, [['whole', 'received'], ['whole', 'instalment'], ['whole', 'payments']]],
  ['a mistake while the rest is empty', 'instalments', 'monthly', { received: 'abc', instalment: '', payments: '' }, [['whole', 'received']]],
  ['a rate of zero', 'rate', 'monthly', { received: '10000', rate: '0', months: '12' }, [['rate', 'rate']]],
  ['a rate of 0.0', 'rate', 'monthly', { received: '10000', rate: '0.0', months: '12' }, [['rate', 'rate']]],
  ['letters for a rate', 'rate', 'monthly', { received: '10000', rate: 'abc', months: '12' }, [['rate', 'rate']]],
  ['a percent sign', 'rate', 'monthly', { received: '10000', rate: '3%', months: '12' }, [['rate', 'rate']]],
  ['a decimal comma', 'rate', 'monthly', { received: '10000', rate: '3,5', months: '12' }, [['rate', 'rate']]],
  ['two decimal points', 'rate', 'monthly', { received: '10000', rate: '1.2.3', months: '12' }, [['rate', 'rate']]],
  ['a lone decimal point', 'rate', 'monthly', { received: '10000', rate: '.', months: '12' }, [['rate', 'rate']]],
  ['a rate over 100', 'rate', 'monthly', { received: '10000', rate: '101', months: '12' }, [['range', 'rate']]],
  ['a rate of 100.5', 'rate', 'monthly', { received: '10000', rate: '100.5', months: '12' }, [['range', 'rate']]],
  ['no months', 'rate', 'monthly', { received: '10000', rate: '3', months: '0' }, [['whole', 'months']]],
  ['121 months', 'rate', 'monthly', { received: '10000', rate: '3', months: '121' }, [['range', 'months']]],
  ['half a month', 'rate', 'monthly', { received: '10000', rate: '3', months: '12.5' }, [['whole', 'months']]],
  ['an amount over the largest', 'rate', 'monthly', { received: '1000000001', rate: '3', months: '12' }, [['range', 'received']]],
  ['three mistakes at once, rate', 'rate', 'monthly', { received: 'abc', rate: '101', months: '121' }, [['whole', 'received'], ['range', 'rate'], ['range', 'months']]],
]
// The numbers right at the edge of what a box takes: the card prices them and has no message.
const EDGES = [
  ['the largest amount', 'largest'],
  ['the largest payment', 'largestPayment'],
  ['120 monthly payments', 'month120'],
  ['520 weekly payments', 'week520'],
  ['3650 daily payments', 'day3650'],
  ['a rate of 100', 'rateMax'],
  ['120 months', 'rateLong'],
]

async function o3Mistakes(cdp) {
  const s = scenario('O3')
  if (!(await load(cdp, s, { lang: 'en' }))) return
  for (const [name, way, often, vals, mistakes] of MISTAKES) {
    const tag = `en, ${name}`
    await chooseWay(cdp, s, way, tag)
    if (way === 'instalments') await chooseOften(cdp, s, often, tag)
    for (const id of BOXES[way]) await typeBox(cdp, s, `offer-${id}`, vals[id] ?? '', tag)
    const errors = Object.fromEntries(mistakes.map(([kind, box]) => [box, errText('en', kind, box, often)]))
    await checkCard(cdp, s, tag, W('en', { way, often, values: { ...blankValues(way), ...vals }, errors }))
  }
  for (const [name, key] of EDGES) {
    const c = OFFERS[key]
    const tag = `en, ${name}`
    await enter(cdp, s, tag, c)
    await checkCard(cdp, s, tag, wantOffer('en', c.often || 'monthly', c))
  }
  await quiet(cdp, s, 'en, mistakes')

  // How often the payments fall changes how many a box takes, and it is not chosen for the
  // reader: until it is chosen the payments box has no limit, and no result is worked out.
  if (!(await load(cdp, s, { lang: 'en' }))) return
  const tag = 'en, payments before the frequency'
  const boxes = (payments) => ({ received: '10000', instalment: '80', payments })
  await chooseWay(cdp, s, 'instalments', tag)
  await typeBox(cdp, s, 'offer-received', '10000', tag)
  await typeBox(cdp, s, 'offer-instalment', '80', tag)
  await typeBox(cdp, s, 'offer-payments', '99999', `${tag}, 99999`)
  await checkCard(cdp, s, `${tag}, 99999`, W('en', { way: 'instalments', often: '', values: boxes('99999') }))
  await typeBox(cdp, s, 'offer-payments', 'abc', `${tag}, abc`)
  await checkCard(cdp, s, `${tag}, abc`, W('en', { way: 'instalments', often: '', values: boxes('abc'), errors: { payments: errText('en', 'whole', 'payments', '') } }))
  // a number that is fine at every frequency, with every other box full: still no result, and no
  // message, until the reader has said how often the payments fall
  await typeBox(cdp, s, 'offer-payments', '12', `${tag}, 12 and no frequency`)
  await checkCard(cdp, s, `${tag}, 12 and no frequency`, W('en', { way: 'instalments', often: '', values: boxes('12') }))
  await typeBox(cdp, s, 'offer-payments', '99999', `${tag}, 99999 again`)
  for (const often of ['daily', 'weekly', 'monthly']) {
    await chooseOften(cdp, s, often, `${tag}, ${often}`)
    await checkCard(cdp, s, `${tag}, 99999 ${often}`, W('en', { way: 'instalments', often, values: boxes('99999'), errors: { payments: errText('en', 'range', 'payments', often) } }))
  }
  // 121 payments: more than a monthly loan takes, a plain number of weekly or daily ones
  await typeBox(cdp, s, 'offer-payments', '121', `${tag}, 121`)
  for (const often of ['monthly', 'weekly', 'daily']) {
    await chooseOften(cdp, s, often, `${tag}, ${often}`)
    const want = often === 'monthly'
      ? W('en', { way: 'instalments', often, values: boxes('121'), errors: { payments: errText('en', 'range', 'payments', 'monthly') } })
      : wantOffer('en', often, { mode: 'instalments', vals: boxes('121'), kind: 'less', received: 10000, total: 9680 })
    await checkCard(cdp, s, `${tag}, 121 ${often}`, want)
  }
  await quiet(cdp, s, tag)

  // How much a box holds: forty nines go into each box and it keeps what the card lets it take.
  if (!(await load(cdp, s, { lang: 'en' }))) return
  for (const way of ['instalments', 'rate']) {
    const long = `en, forty nines, ${way}`
    await chooseWay(cdp, s, way, long)
    for (const id of BOXES[way]) {
      if (!(await typeBox(cdp, s, `offer-${id}`, '9'.repeat(40), long))) continue
      const kept = await cdp.evaluate(`document.getElementById('offer-${id}').value`)
      s.ok(kept === '9'.repeat(CAP[id]), 'STRUCTURE', `${long}: offer-${id} kept ${kept.length} of 40 characters, not ${CAP[id]}`)
    }
  }
}

// --- O4: the loan the rules priced, for every kind of response -----------------------------
async function o4Priced(cdp) {
  const s = scenario('O4')
  for (const fixture of ['partial', 'covered', 'wideloan', 'no_gap', 'no_room', 'no_surplus', 'household_over_limit', 'nofin']) {
    for (const detail of fixture === 'partial' || fixture === 'covered' || fixture === 'wideloan' ? ['simple', 'detailed'] : ['simple']) {
      const tag = `${fixture}, ${detail}`
      if (!(await load(cdp, s, { fixture, detail }))) continue
      await checkCard(cdp, s, `${tag}, before`, W('en', { fixture, detail }))
      for (const key of ['monthly', 'less']) {
        await enter(cdp, s, `${tag}, ${key}`, OFFERS[key])
        await checkCard(cdp, s, `${tag}, ${key}`, wantOffer('en', 'monthly', OFFERS[key], { fixture, detail }))
      }
      await quiet(cdp, s, tag)
    }
  }
}

// --- O5: a whole sitting sends and stores nothing; leaving the page, or a reload, starts clean --
async function o5Sitting(cdp) {
  const s = scenario('O5')
  if (!(await load(cdp, s, { lang: 'en' }))) return
  for (const key of ['monthly', 'daily', 'less', 'rate3', 'rateLess', 'monthly']) await enter(cdp, s, `en, ${key}`, OFFERS[key])
  await typeBox(cdp, s, 'offer-received', 'abc', 'en, a mistake')
  await typeBox(cdp, s, 'offer-received', '', 'en, a box emptied')
  await click(cdp, s, '[data-offer="card"] summary', 'en, the explanation')
  await chooseWay(cdp, s, 'rate', 'en, the rate way')
  await quiet(cdp, s, 'en, a whole sitting')
  // Away and back by the app's own links, in the one document: what was typed belongs to the
  // page, so the card comes back as it was on the first visit, and nothing was kept or sent.
  await cdp.evaluate('window.__stay = true')
  if (!(await hop(cdp, s, 'en, to the analysis', '/analysis'))) return
  if (!(await hop(cdp, s, 'en, back to the advice', '/advisory'))) return
  await checkCard(cdp, s, 'en, after leaving and coming back', W('en'))
  await quiet(cdp, s, 'en, leaving and coming back')
  // A new document: the card is as it was on the first visit, whatever was typed before.
  if (!(await load(cdp, s, { lang: 'en' }))) return
  await checkCard(cdp, s, 'en, after a reload', W('en'))
}

// --- O6: the sentences in each of the 8 languages ---------------------------------------------
async function o6Languages(cdp) {
  const s = scenario('O6')
  for (const lang of LANGS) {
    if (!(await load(cdp, s, { lang }))) continue
    // together these print every sentence of the result in the language
    for (const key of ['monthly', 'daily', 'less', 'same', 'rateLess', 'rateSame', 'rate3']) {
      const c = OFFERS[key]
      const tag = `${lang}, ${key}`
      await enter(cdp, s, tag, c)
      await checkCard(cdp, s, tag, wantOffer(lang, c.often || 'monthly', c))
    }
    // and a message of each kind
    await typeBox(cdp, s, 'offer-received', 'abc', `${lang}, whole`)
    await typeBox(cdp, s, 'offer-rate', '101', `${lang}, range`)
    await typeBox(cdp, s, 'offer-months', '0', `${lang}, whole months`)
    await checkCard(cdp, s, `${lang}, three messages`, W(lang, {
      way: 'rate',
      often: 'monthly',
      values: { received: 'abc', rate: '101', months: '0' },
      errors: { received: errText(lang, 'whole', 'received', ''), rate: errText(lang, 'range', 'rate', ''), months: errText(lang, 'whole', 'months', '') },
    }))
    await typeBox(cdp, s, 'offer-rate', 'x', `${lang}, rate`)
    await checkCard(cdp, s, `${lang}, a rate message`, W(lang, {
      way: 'rate',
      often: 'monthly',
      values: { received: 'abc', rate: 'x', months: '0' },
      errors: { received: errText(lang, 'whole', 'received', ''), rate: errText(lang, 'rate', 'rate', ''), months: errText(lang, 'whole', 'months', '') },
    }))
    await quiet(cdp, s, `${lang}, sitting`)
  }
}

// --- O7: layout on a small phone with the largest text in the dark, a phone, a desktop ---------
const LAYOUTS = [
  { name: '320 px, largest text, dark', phone: [320, 700], size: 'lg', theme: 'dark', langs: LANGS },
  { name: '390 px, smallest text', phone: [390, 800], size: 'sm', theme: 'light', langs: LANGS },
  { name: '1280 px', phone: null, size: 'md', theme: 'light', langs: ['en', 'hi', 'ta'] },
]
const SCALE = { sm: 0.94, md: 1, lg: 1.18 }

async function layout(cdp, s, tag, phone) {
  const m = await cdp.evaluate(inPage(measureCard, 12))
  if (!m) {
    s.ok(false, 'NO-CARD', `${tag}: there is no loan-offer card to measure`)
    return
  }
  s.ok(m.shown, 'HIDDEN', `${tag}: the card is not drawn (display ${m.display})`)
  s.ok(m.scrollWidth <= m.vw, 'LAYOUT', `${tag}: the page scrolls sideways (${m.scrollWidth} px in a ${m.vw} px window)`)
  s.ok(m.card.left >= -0.5 && m.card.right <= m.vw + 0.5, 'LAYOUT', `${tag}: the card runs from ${Math.round(m.card.left)} to ${Math.round(m.card.right)} px in a ${m.vw} px window`)
  s.ok(m.outside.length === 0, 'LAYOUT', `${tag}: ${q(short(m.outside))} reach outside the card`)
  s.ok(m.clipped.length === 0, 'LAYOUT', `${tag}: ${q(short(m.clipped))} hold more than they show`)
  s.ok(m.small.length === 0, 'LAYOUT', `${tag}: text under 12 px: ${q(short(m.small))}`)
  if (phone) {
    const low = m.touch.filter((t) => t.height < 43.5)
    s.ok(m.touch.length > 0 && low.length === 0, 'LAYOUT', `${tag}: ${m.touch.length ? 'tap targets under 44 px high' : 'no tap target found'}: ${q(short(low.map((t) => `${t.name} ${t.height.toFixed(1)}`)))}`)
    const radios = m.radios.filter((r) => r.width < 43.5 || r.height < 43.5)
    s.ok(m.radios.length > 0 && radios.length === 0, 'LAYOUT', `${tag}: ${m.radios.length ? 'radio buttons under 44 px' : 'no radio button found'}: ${q(short(radios.map((r) => `${r.name} ${r.width.toFixed(1)}x${r.height.toFixed(1)}`)))}`)
  } else {
    // with a mouse the radio button is the page's own 1.35 rem (about 21 px), not the browser's 13 px
    const small = m.radios.filter((r) => r.width < 20 || r.height < 20)
    s.ok(m.radios.length > 0 && small.length === 0, 'LAYOUT', `${tag}: ${m.radios.length ? 'radio buttons under 20 px' : 'no radio button found'}: ${q(short(small.map((r) => `${r.name} ${r.width.toFixed(1)}x${r.height.toFixed(1)}`)))}`)
  }
  const broken = await cdp.evaluate(inPage(brokenFigures))
  s.ok(broken.length === 0, 'FIGURE-WRAP', `${tag}: ${q(short(broken))} break across two lines`)
}

// The page drawn the way a layout case says, or false: the page has to be so, or the layout
// measured is not the one the case names.
async function loadLayout(cdp, s, tag, cfg, lang, fixture) {
  if (!(await load(cdp, s, { lang, fixture, phone: cfg.phone, size: cfg.size, theme: cfg.theme }))) return false
  const scale = parseFloat(await cdp.evaluate(`getComputedStyle(document.documentElement).getPropertyValue('--ui-scale')`))
  const theme = await cdp.evaluate('document.documentElement.dataset.theme')
  if (scale !== SCALE[cfg.size] || theme !== cfg.theme) {
    s.fault(`${tag}: the page has text scale ${scale} and theme ${q(theme)}, not ${SCALE[cfg.size]} and ${q(cfg.theme)}`)
    return false
  }
  return true
}

async function o7Layout(cdp) {
  const s = scenario('O7')
  for (const cfg of LAYOUTS) {
    for (const lang of cfg.langs) {
      const tag = `${cfg.name}, ${lang}`
      if (!(await loadLayout(cdp, s, tag, cfg, lang, 'covered'))) continue
      // everything the card can show at once: a typed offer with its note, a comparison and the priced loan
      await enter(cdp, s, tag, OFFERS.daily)
      await layout(cdp, s, `${tag}, a result`, !!cfg.phone)
      if (lang === 'en') {
        await enter(cdp, s, tag, OFFERS.wide)
        await layout(cdp, s, `${tag}, the largest figures`, !!cfg.phone)
      }
      // three messages at once and the hint under the rate box
      await chooseWay(cdp, s, 'rate', tag)
      await typeBox(cdp, s, 'offer-received', 'abc', tag)
      await typeBox(cdp, s, 'offer-rate', '101', tag)
      await typeBox(cdp, s, 'offer-months', '121', tag)
      await layout(cdp, s, `${tag}, three messages`, !!cfg.phone)
      // the largest figures beside the widest the priced loan can print (a loan of ₹99,99,96,000)
      if (lang === 'en') {
        const widest = `${tag}, the largest priced loan`
        if (!(await loadLayout(cdp, s, widest, cfg, lang, 'wideloan'))) continue
        await enter(cdp, s, widest, OFFERS.wide)
        await layout(cdp, s, widest, !!cfg.phone)
      }
    }
  }
}

// --- O8: what is typed for one way of telling an offer stays with it -------------------------
async function o8Ways(cdp) {
  const s = scenario('O8')
  if (!(await load(cdp, s, { lang: 'en' }))) return
  const a = OFFERS.weekly
  const r = OFFERS.rate3
  await enter(cdp, s, 'en, payments', a)
  await checkCard(cdp, s, 'en, payments typed', wantOffer('en', 'weekly', a))
  await chooseWay(cdp, s, 'rate', 'en, to the rate')
  // nothing typed for the payments is read as a rate, and nothing is worked out
  await checkCard(cdp, s, 'en, the rate way, untouched', W('en', { way: 'rate', often: 'weekly', values: blankValues('rate') }))
  await enter(cdp, s, 'en, rate', r)
  await checkCard(cdp, s, 'en, rate typed', wantOffer('en', 'weekly', r))
  await chooseWay(cdp, s, 'instalments', 'en, back to payments')
  await checkCard(cdp, s, 'en, payments kept', wantOffer('en', 'weekly', a))
  await chooseWay(cdp, s, 'rate', 'en, back to the rate')
  await checkCard(cdp, s, 'en, rate kept', wantOffer('en', 'weekly', r))
  await quiet(cdp, s, 'en, ways')
}

// --- O9: typing one key at a time, backspacing, and an empty box -------------------------------
async function o9Keys(cdp) {
  const s = scenario('O9')
  if (!(await load(cdp, s, { lang: 'en' }))) return
  let tag = 'en, payments'
  await chooseWay(cdp, s, 'instalments', tag)
  await chooseOften(cdp, s, 'monthly', tag)
  await typeBox(cdp, s, 'offer-received', '10000', tag)
  await typeBox(cdp, s, 'offer-instalment', '889', tag)
  await typeBox(cdp, s, 'offer-payments', '', tag)
  const pay = (payments) => ({ received: '10000', instalment: '889', payments })
  const one = { mode: 'instalments', vals: pay('1'), kind: 'less', received: 10000, total: 889 }
  const empty = W('en', { way: 'instalments', often: 'monthly', values: pay('') })
  const bad = W('en', { way: 'instalments', often: 'monthly', values: pay('a'), errors: { payments: errText('en', 'whole', 'payments', 'monthly') } })
  await stroke(cdp, s, `${tag}, 1`, 'offer-payments', '1', wantOffer('en', 'monthly', one))
  await stroke(cdp, s, `${tag}, 12`, 'offer-payments', '2', wantOffer('en', 'monthly', OFFERS.monthly))
  await stroke(cdp, s, `${tag}, back to 1`, 'offer-payments', 'Backspace', wantOffer('en', 'monthly', one))
  await stroke(cdp, s, `${tag}, back to nothing`, 'offer-payments', 'Backspace', empty)
  await stroke(cdp, s, `${tag}, a`, 'offer-payments', 'a', bad)
  await stroke(cdp, s, `${tag}, a removed`, 'offer-payments', 'Backspace', empty)

  tag = 'en, rate'
  await chooseWay(cdp, s, 'rate', tag)
  await typeBox(cdp, s, 'offer-received', '10000', tag)
  await typeBox(cdp, s, 'offer-months', '12', tag)
  await typeBox(cdp, s, 'offer-rate', '', tag)
  const rate = (value, errors = {}) => W('en', { way: 'rate', often: 'monthly', values: { received: '10000', rate: value, months: '12' }, errors })
  await stroke(cdp, s, `${tag}, 3`, 'offer-rate', '3', wantOffer('en', 'monthly', OFFERS.rate3))
  await stroke(cdp, s, `${tag}, 3.`, 'offer-rate', '.', wantOffer('en', 'monthly', OFFERS.rateTrail))
  await stroke(cdp, s, `${tag}, 3.5`, 'offer-rate', '5', wantOffer('en', 'monthly', OFFERS.rateKeys))
  await stroke(cdp, s, `${tag}, back to 3.`, 'offer-rate', 'Backspace', wantOffer('en', 'monthly', OFFERS.rateTrail))
  await stroke(cdp, s, `${tag}, back to 3`, 'offer-rate', 'Backspace', wantOffer('en', 'monthly', OFFERS.rate3))
  await stroke(cdp, s, `${tag}, back to nothing`, 'offer-rate', 'Backspace', rate(''))
  await stroke(cdp, s, `${tag}, a lone point`, 'offer-rate', '.', rate('.', { rate: errText('en', 'rate', 'rate', 'monthly') }))
  await stroke(cdp, s, `${tag}, the point removed`, 'offer-rate', 'Backspace', rate(''))
  await quiet(cdp, s, 'en, keys')
}

// --- O10: a language switch with a result on the card -------------------------------------------
async function switchLanguage(cdp, s, tag, lang, c) {
  if (!(await cdp.evaluate(inPage(chooseLanguage, lang)))) {
    s.fault(`${tag}: the language select would not take ${lang}`)
    return
  }
  const eyebrow = JSON.stringify(text(lang, 'offer.eyebrow'))
  const words = await until(cdp, `((document.querySelector('[data-offer="card"] .ui-eyebrow') || {}).textContent || '').replace(/\\s+/g, ' ').trim() === ${eyebrow}`, 4000)
  s.ok(!!words, 'LANG-SWITCH', `${tag}: the card still has the old words 4 s after the switch`)
  const page = await cdp.evaluate(inPage(readCard))
  const chosen = (set) => ((set && set.radios.find((r) => r.checked)) || {}).value || ''
  const kept = page.present
    && chosen(page.fieldsets[0]) === c.mode
    && (c.mode !== 'instalments' || chosen(page.fieldsets[1]) === c.often)
    && JSON.stringify(page.boxes.map((b) => b.value)) === JSON.stringify(BOXES[c.mode].map((id) => c.vals[id]))
  s.ok(kept, 'LANG-SWITCH', `${tag}: what was chosen and typed did not survive the switch`)
  await checkCard(cdp, s, tag, wantOffer(lang, c.often || 'monthly', c))
}

async function o10Switch(cdp) {
  const s = scenario('O10')
  if (!(await load(cdp, s, { lang: 'en' }))) return
  for (const [name, key, order] of [['payments', 'monthly', ['hi', 'ta', 'en']], ['rate', 'rate3', ['te', 'bn', 'en']]]) {
    const c = OFFERS[key]
    await enter(cdp, s, `en, ${name}`, c)
    for (const lang of order) await switchLanguage(cdp, s, `${name}, switch to ${lang}`, lang, c)
  }
}

// --- O11: print -------------------------------------------------------------------------------
async function o11Print(cdp) {
  const s = scenario('O11')
  if (!(await load(cdp, s, { lang: 'en' }))) return
  await enter(cdp, s, 'en, print', OFFERS.monthly)
  const screen = await cdp.evaluate(inPage(printState))
  s.ok(!!screen && screen.display !== 'none' && screen.height > 0, 'HIDDEN', 'en, print: on the screen the card is not drawn, so print proves nothing')
  await cdp.send('Emulation.setEmulatedMedia', { media: 'print' })
  try {
    const printed = await cdp.evaluate(inPage(printState))
    s.ok(!!printed && printed.display === 'none' && printed.height === 0, 'PRINT', `en, print: the card is shown in print (display ${printed?.display}, ${printed?.height} px high)`)
  } finally {
    await cdp.send('Emulation.setEmulatedMedia', { media: '' })
  }
}

// --- O12: the card is on /advisory and on no other page ---------------------------------------
async function o12Elsewhere(cdp) {
  const s = scenario('O12')
  for (const route of ['/', '/privacy', '/finance', '/analysis', '/schemes', '/report']) {
    if (!(await load(cdp, s, { route, lang: 'en' }))) continue
    const page = await cdp.evaluate(inPage(readCard))
    s.ok(page.present === false, 'NO-CARD', `${route}: the loan-offer card is on a page it does not belong to`)
  }
  // with no result there is no advice page to put it on
  if (await load(cdp, s, { route: '/advisory', lang: 'en', result: null })) {
    const page = await cdp.evaluate(inPage(readCard))
    s.ok(page.present === false, 'NO-CARD', '/advisory with no result: the loan-offer card is shown with nothing to sit beside')
  }
}

const RUNS = [o1Appears, o2Figures, o3Mistakes, o4Priced, o5Sitting, o6Languages, o7Layout, o8Ways, o9Keys, o10Switch, o11Print, o12Elsewhere]

// What each --broken arm has to be seen to cause, or the run exits 2: a refuter that does
// not fire proves nothing.
const REQUIRED = {
  network: ['NETWORK'],
  storage: ['STORAGE'],
  default: ['DEFAULT-CHOSEN'],
  banned: ['BANNED-WORD'],
  figure: ['WRONG-FIGURE'],
  wrap: ['FIGURE-WRAP'],
  overflow: ['LAYOUT'],
  print: ['PRINT'],
  live: ['LIVE-REGION'],
  leak: ['LEAK'],
}

async function main() {
  if (!(await requireServer(APP + '/', 'Start the app first: npm run dev in ./frontend (no backend is needed), or the copy --url= names.'))) return
  // Something already answering on the debug port is another run, or an Edge a killed run
  // left behind. Ours could not bind it, browserWsUrl() would attach to that browser, and
  // killOwnEdge() would end it. No process.exit() here: this follows a fetch.
  const taken = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`, { signal: AbortSignal.timeout(2000) })
    .then(async (res) => { await res.body?.cancel(); return true }, (err) => err.name === 'TimeoutError')
  if (taken) {
    console.error(`offer-ui: port ${DEBUG_PORT} is already answering: another offer-ui, or an Edge a killed run left behind. End it by PID (netstat -ano | grep :${DEBUG_PORT}) and run again.`)
    process.exitCode = 2
    return
  }
  rmSync(OUT, { recursive: true, force: true })
  mkdirSync(OUT, { recursive: true })
  mkdirSync(PROFILE_DIR, { recursive: true })

  edge = spawn(EDGE, [
    '--headless=new',
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${PROFILE_DIR}`,
    '--edge-skip-compat-layer-relaunch',
    '--remote-allow-origins=*',
    '--disable-gpu', '--disable-sync', '--no-first-run',
    '--no-default-browser-check', '--disable-extensions',
    '--disable-features=Translate,MediaRouter',
  ], { stdio: 'ignore' })

  try {
    const cdp = new CDP(await browserWsUrl())
    await cdp.ready
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' }, false)
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true }, false)
    cdp.sessionId = sessionId
    await cdp.send('Page.enable')
    await cdp.send('Runtime.enable')
    await cdp.send('Network.enable')
    for (const run of RUNS) {
      if (ONLY && !ONLY.has(run.name.match(/^o\d+/)[0])) continue
      const started = Date.now()
      await run(cdp)
      console.log(`${run.name} finished in ${Math.round((Date.now() - started) / 1000)} s`)
    }
  } finally {
    killOwnEdge()
  }

  for (const [id, n] of checks) if (n === 0 && !faults.some((f) => f.scn === id)) faults.push({ scn: id, detail: 'evaluated nothing' })
  const kinds = new Set(findings.map((f) => f.kind))
  const unrefuted = [...BROKEN].flatMap((arm) => REQUIRED[arm].filter((kind) => !kinds.has(kind)).map((kind) => `${arm} -> ${kind}`))
  // A partial run (--only) that finds nothing has not looked at everything, so it is not a pass.
  const exit = faults.length || unrefuted.length ? 2 : findings.length ? 1 : ONLY ? 2 : 0

  const perScenario = Object.fromEntries(checks)
  writeFileSync(`${OUT}/report.json`, JSON.stringify({ exit, only: ONLY ? [...ONLY] : null, broken: [...BROKEN], loads, checks: perScenario, findings, faults, unrefuted }, null, 2))
  for (const [id, n] of checks) {
    const mine = findings.filter((f) => f.scn === id)
    const broke = faults.filter((f) => f.scn === id)
    console.log(`${mine.length || broke.length ? 'FAIL' : 'ok  '}  ${id.padEnd(4)} ${String(n).padStart(4)} checks${mine.length ? `  ${mine.length} finding(s)` : ''}${broke.length ? `  ${broke.length} fault(s)` : ''}`)
    for (const f of mine.slice(0, 6)) console.log(`        ${f.kind}  ${f.detail}`)
    if (mine.length > 6) console.log(`        ... ${mine.length - 6} more in report.json`)
    for (const f of broke) console.log(`        FAULT  ${f.detail}`)
  }
  console.log(`\n${loads} page loads, ${[...checks.values()].reduce((a, b) => a + b, 0)} checks, ${findings.length} finding(s), ${faults.length} fault(s).`)
  if (ONLY) console.log(`--only=${[...ONLY].join(',')}: a partial run, never a verdict. It exits 1 on a finding and 2 otherwise.`)
  if (BROKEN.size) console.log(`--broken=${[...BROKEN].join(',')}: ${unrefuted.length ? `NOT REFUTED: ${unrefuted.join('; ')}` : 'every arm was seen to fail the gate'}.`)
  console.log(`report.json in ${OUT}`)
  process.exit(exit)
}

main().catch((err) => {
  console.error('OFFER-UI ERROR:', err.stack || err.message)
  killOwnEdge()
  crashExit()
})
