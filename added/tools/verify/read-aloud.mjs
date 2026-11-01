// Read-aloud gate: the Listen button on /analysis and /advisory (components/ReadAloud.jsx,
// audio/speak.js). The speech is the browser's, so this replaces the browser's speech
// engine with a fake it controls and watches what the app asks of it. Nothing is spoken
// aloud, no model and no network is involved, and the backend is not needed: the result
// pages are seeded from the driver's saved responses (screenshots/verify/case_*.json,
// from refresh-cases.mjs). The fake is installed before the page's own scripts run, so
// the app meets it exactly as it would meet a real engine.
//
// What it reports, in order of how badly each one lets a reader down:
//
//   BUTTON-WITHOUT-VOICE  a Listen button where the browser has no voice on the device
//                         for the page language: none at all, one reached over the
//                         network, one for another language, no speech engine, or no
//                         utterance constructor. The press would be silent or would send
//                         the sentence to a server the notice does not name.
//   REMOTE-VOICE-USED     a press spoke in a voice that is not on the device. The
//                         voices are listed with the network one FIRST, so a build that
//                         takes the first voice of the language is caught.
//   WRONG-VOICE           a press spoke in a local voice of another language.
//   DIGIT-SPOKEN          a spoken line has a digit in it, in any script the app has. A
//                         voice may read a digit string wrongly, so no figure is read.
//   WRONG-LINES           what a press speaks is not, line for line, the light's word and
//                         its note and the page's two sentences, as the page prints them
//                         (a line with a digit left out). The page is read for them, not
//                         the app's own variables, so a sentence that is spoken and not
//                         shown is caught as well as one that is shown and not spoken.
//   SILENT                a press spoke nothing.
//   AUTO-SPEECH           anything spoken before a press.
//   NOT-STOPPED           speech left running after a second press, a language switch, a
//                         voice taken away, or leaving the page.
//   ENDED-EARLY           the button went back to Listen before the last line had ended.
//   STALE-EVENT           the late error event of a line a stop cancelled ended or
//                         flipped the speech that replaced it. Real engines report a
//                         cancelled line a moment after the cancel, and the fake does the
//                         same (500 ms in that scenario).
//   NO-BUTTON             a voice on the device for the page language, and no button; also
//                         after the voices arrive late (`voiceschanged`), and when the
//                         browser announced the list before the page was listening.
//   LABEL                 the button or the note is not the dictionary's wording for that
//                         language, or the button does not read Stop while speaking and
//                         Listen after.
//   ICON                  the speaker drawing is not hidden from a screen reader.
//   LEAK                  a `voiceschanged` listener is left behind after leaving the page.
//   NETWORK               a request or a socket was opened between the press and the end.
//   PRINT                 the block is shown in print.
//   LAYOUT                sideways scroll, a block outside the viewport or its card, a clipped
//                         button or note, a button under 44 px high, a note under 12 px.
//   COVERED               another element sits on the button's centre, so a thumb would not
//                         reach it.
//   FOCUS-LOST            after the press that stops the speech the button no longer has focus.
//   PAGE-ERROR            an exception, or a console error, on any page of the run.
//
// Scenarios: R1 the button appears, with the dictionary's words, for a local voice in each
// of the 8 languages on both pages, and nothing is spoken before a press; R2 nothing is
// drawn without a local voice; R3 a press speaks the right lines in the local voice
// (every language; the three lights in English and Hindi); R5 a second press stops, and a
// stale cancel event is ignored; R6 the speech runs to its end and can be started again;
// R7 voices that arrive late, and a list announced before the page was listening; R7b a voice
// taken away mid-speech; R8 a language switch;
// R9 leaving the page; R10 a line with a digit is on the page and not spoken; R11 nothing
// leaves the machine; R12 print; R13 layout at 320 px with the largest text in the dark
// (all 8 languages), at 390 px and on a desktop; R14 both Simple and Detailed.
//
// Fixtures are screenshots/verify/case_green.json, case_good.json and case_empty.json, the
// green, yellow and red results; the gate stops with exit 2 if one is missing or is not the
// colour its name says. Run the Vite dev server first (no backend), then:
//   node tools/verify/read-aloud.mjs
// Exit 0: nothing found. 1: a finding. 2: the run could not measure: the app is not
// answering; the working directory is wrong; a fixture is missing or the wrong colour;
// port 9381 is already answering; AppContext no longer reads the seed's version; a load
// is NOT-RENDERED or UNSEEDED; the fake engine did not install (NO-FAKE); a page does not
// have the shape the gate reads (the two sentences under the light); a scenario evaluated
// nothing; Edge's DevTools socket closed; or the run crashed or ended before its verdict.
// report.json starts with `exit`; a crash, or a run that never started, leaves none.
//
// --broken[=cancel|local|digits]  make the FAKE engine misbehave, and expect the gate to
//   notice. cancel: cancel() does nothing (NOT-STOPPED). local: every voice reports itself
//   as on the device (REMOTE-VOICE-USED and BUTTON-WITHOUT-VOICE). digits: every spoken line
//   has a digit added (DIGIT-SPOKEN and WRONG-LINES). Bare --broken applies all three. It
//   exits 1 when each arm's findings appear and 2 when one is missing ("unrefuted"), and it
//   writes under screenshots/verify/read-aloud-broken.
//
// Defects planted in the app itself, one at a time (a script outside the repo edited the
// source, ran this gate, put the file back and checked its sha256), and what the gate
// reported (all 21 exit 1, the unplanted baseline exit 0; the first twenty on 29 and 30 Oct
// 2026, before R7 had the early announcement, the last on 1 Nov 2026). A "+" marks
// findings that came from the same fault in other scenarios; tools/README.md has the rest:
//   speak.js     no localService test in localVoiceFor   REMOTE-VOICE-USED, BUTTON-WITHOUT-VOICE
//                                                        + WRONG-VOICE, NOT-STOPPED, WRONG-LINES
//   speak.js     no digit filter in speakLines           DIGIT-SPOKEN, WRONG-LINES
//   ReadAloud    no cleanup effect                       NOT-STOPPED
//   ReadAloud    cleanup on unmount only (deps [])       NOT-STOPPED
//   speak.js     no live guard on a cancelled line       STALE-EVENT + SILENT
//   ReadAloud    speech starts on mount                  AUTO-SPEECH + WRONG-LINES, ENDED-EARLY,
//                                                        SILENT, NOT-STOPPED
//   ReadAloud    no voiceschanged listener               NO-BUTTON, LEAK + BUTTON-WITHOUT-VOICE,
//                                                        NOT-STOPPED
//   speak.js     onend on every line, not the last       ENDED-EARLY
//   ReadAloud    speaker drawing without aria-hidden     ICON
//   ReadAloud    block without the print-hidden class    PRINT
//   speak.js     language matched by prefix              BUTTON-WITHOUT-VOICE
//   ReadAloud    the light's note left out of the lines  WRONG-LINES
//   ReadAloud    a fetch() when Listen is pressed        NETWORK
//   speak.js     no voice set on the utterance           REMOTE-VOICE-USED, WRONG-VOICE + WRONG-LINES
//   ReadAloud    the note at 0.6rem                      LAYOUT
//   ReadAloud    the button remounts on every press      FOCUS-LOST
//   ReadAloud    an exception after the speech starts    PAGE-ERROR
//   ReadAloud    a second press restarts, not stops      NOT-STOPPED + SILENT, STALE-EVENT
//   ReadAloud    the voice is always looked up for 'en'  WRONG-VOICE, BUTTON-WITHOUT-VOICE
//                                                        + NOT-STOPPED, LABEL, WRONG-LINES
//   ReadAloud    a full-size element laid over the       COVERED + SILENT, WRONG-LINES, LABEL,
//                button (the press never lands)          ENDED-EARLY, NOT-STOPPED, FOCUS-LOST,
//                                                        STALE-EVENT
//   ReadAloud    no second read of the list once the     NO-BUTTON
//                listener is in place
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const DEBUG_PORT = 9381
const ARGS = process.argv.slice(2)
const argValue = (name) => {
  const hit = ARGS.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : ''
}
const APP = (argValue('url') || 'http://localhost:5173').replace(/\/+$/, '')
const ARMS = ['cancel', 'local', 'digits']
const brokenArg = ARGS.find((a) => a === '--broken' || a.startsWith('--broken='))
const BROKEN = new Set(!brokenArg ? [] : brokenArg === '--broken' ? ARMS : brokenArg.slice('--broken='.length).split(','))
for (const arm of BROKEN) {
  if (!ARMS.includes(arm)) {
    console.error(`read-aloud: --broken= takes ${ARMS.join(', ')}, not ${JSON.stringify(arm)}`)
    process.exit(2)
  }
}
// A fixed folder per mode. main() empties it before it writes.
const OUT = resolve('screenshots/verify', BROKEN.size ? 'read-aloud-broken' : 'read-aloud')
const PROFILE_DIR = resolve('screenshots/verify/edge-profile-readaloud')

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Our Edge dies by PID and nothing else, never by image name, which would close the Edge
// the person running the gate has open. Same technique as mobile-audit.mjs: the browser
// process that carries OUR profile path and no --type= (taskkill /T takes its children).
let edge = null
function ownEdgePids() {
  const script =
    "$p = [regex]::Escape($env:READALOUD_EDGE_PROFILE) + '(?=[\"\\s]|$)'; " +
    "Get-CimInstance Win32_Process -Filter \"name='msedge.exe'\" | Where-Object { $_.CommandLine -and " +
    "$_.CommandLine -match $p -and $_.CommandLine -notmatch '--type=' } | ForEach-Object { $_.ProcessId }"
  const r = spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', script], {
    env: { ...process.env, READALOUD_EDGE_PROFILE: PROFILE_DIR },
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
if (!existsSync(resolve('tools/verify/read-aloud.mjs'))) {
  console.error(`read-aloud: ${process.cwd()} is not the repo root. Run this from the repo root: node tools/verify/read-aloud.mjs`)
  process.exit(2)
}
// A report.json on disk is always from a run that finished.
rmSync(resolve(OUT, 'report.json'), { force: true })

async function requireServer(url, start) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
    await res.body?.cancel()
    if (res.ok) return true
    console.error(`read-aloud: ${url} answered HTTP ${res.status}. ${start}`)
  } catch (err) {
    console.error(`read-aloud: nothing answered at ${url} (${err.cause?.code || err.name}). ${start}`)
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
      ? `read-aloud: ${file} no longer reads version ${SEED_VERSION} payloads (READABLE_VERSIONS is ${m[1].trim()}). Rewrite the seed in the current shape and raise SEED_VERSION.`
      : `read-aloud: READABLE_VERSIONS not found in ${file}; update the parse in read-aloud.mjs.`)
    process.exit(2)
  }
}

// The words the page must print, from the dictionary itself, with the same per-key English
// fallback t() has.
const { RESULT_STRINGS } = await import(pathToFileURL(resolve('frontend/src/i18n/resultStrings.js')).href)
const norm = (s) => String(s ?? '').replace(/\s+/g, ' ').trim()
const text = (lang, key) => {
  const value = RESULT_STRINGS[lang]?.[key] ?? RESULT_STRINGS.en[key]
  if (typeof value !== 'string') throw new Error(`${key} is not defined in resultStrings.js`)
  return norm(value)
}
const q = (value) => JSON.stringify(value)

// The three lights. Each fixture has to be the colour its name says, or the run measures
// something other than what it reports.
const CASES = {}
for (const [band, file] of [['green', 'case_green'], ['yellow', 'case_good'], ['red', 'case_empty']]) {
  const path = resolve(`screenshots/verify/${file}.json`)
  if (!existsSync(path)) {
    console.error(`read-aloud: ${path} is missing. Start the backend and run node tools/verify/refresh-cases.mjs.`)
    process.exit(2)
  }
  const result = JSON.parse(readFileSync(path, 'utf8'))
  if (result?.mvp_summary?.band !== band) {
    console.error(`read-aloud: ${file}.json has band ${q(result?.mvp_summary?.band)}, not ${q(band)}. Run node tools/verify/refresh-cases.mjs.`)
    process.exit(2)
  }
  CASES[band] = result
}

const LANGS = ['en', 'hi', 'ta', 'te', 'ml', 'kn', 'mr', 'bn']
const PAGES = ['/analysis', '/advisory']
// What a voice reports in `lang`. Tamil's is Android's spelling on purpose.
const TAG = { en: 'en-IN', hi: 'hi-IN', ta: 'ta_IN', te: 'te-IN', ml: 'ml-IN', kn: 'kn-IN', mr: 'mr-IN', bn: 'bn-IN' }
// The voice list a browser might give: the network voice for the language FIRST, then a
// local voice of another language, then the local one that is right.
const voicesFor = (lang) => [
  { name: `Remote ${lang} (Online)`, lang: TAG[lang].replace('_', '-'), local: false },
  { name: 'Local en-US', lang: 'en-US', local: true },
  { name: `Local ${lang}`, lang: TAG[lang], local: true },
]
// Written independently of the app's \p{Nd}: the digits of the scripts the app has, plus
// the other Indian scripts.
const DIGIT = /[0-9\u0660-\u0669\u0966-\u096F\u09E6-\u09EF\u0A66-\u0A6F\u0AE6-\u0AEF\u0B66-\u0B6F\u0BE6-\u0BEF\u0C66-\u0C6F\u0CE6-\u0CEF\u0D66-\u0D6F\uFF10-\uFF19]/

// --- the fake speech engine, installed before the page's own scripts -------------------
// Written as a real function and sent as its source, so it is checked by the same eyes and
// the same editor as the rest of this file. It runs in the page, not here.
function installFake(cfg, seed, version) {
  if (!/^https?:$/.test(location.protocol)) return
  sessionStorage.setItem('sih-application', JSON.stringify({ v: version, data: { result: seed.result } }))
  localStorage.setItem('sih-language', seed.lang)
  localStorage.setItem('sih-theme', seed.theme)
  localStorage.setItem('sih-textsize', seed.size)
  localStorage.setItem('sih-detail', seed.detail)
  localStorage.removeItem('sih-dialect')

  const spoken = []
  const queue = []
  const listeners = new Set()
  let cancels = 0
  // `isLocal` is the truth the gate knows; `localService` is what the browser reports, and
  // --broken=local makes it lie.
  const make = (v) => {
    const voice = { name: v.name, lang: v.lang, localService: cfg.allLocal ? true : !!v.local, default: false, voiceURI: v.name }
    Object.defineProperty(voice, 'isLocal', { value: !!v.local })
    return voice
  }
  // `early`: the list is ready the moment the page first asks, and the engine announces it
  // before the page's effects have run, when nobody is listening yet (a browser that kept
  // the list from an earlier page answers at once). The first getVoices() still returns [].
  // `announcedTo` is how many listeners heard the announcement; the gate needs 0, or the
  // case measures nothing.
  let voices = cfg.late || cfg.early ? [] : cfg.voices.map(make)
  let asked = false
  let announcedTo = null

  class Utterance {
    constructor(line) {
      this.text = cfg.appendDigit ? line + ' 7' : line
      this.lang = ''
      this.voice = null
      this.rate = 1
      this.pitch = 1
      this.volume = 1
      this.onend = null
      this.onerror = null
    }
  }

  const synth = {
    paused: false,
    get speaking() { return queue.length > 0 },
    get pending() { return queue.length > 1 },
    getVoices: () => {
      if (cfg.early && !asked) {
        asked = true
        queueMicrotask(() => { voices = cfg.voices.map(make); announcedTo = listeners.size; announce() })
      }
      return voices
    },
    speak(u) {
      queue.push(u)
      spoken.push({ text: u.text, lang: u.lang, voice: u.voice ? u.voice.name : null, trueLocal: u.voice ? u.voice.isLocal : null })
    },
    cancel() {
      cancels++
      if (cfg.cancelInert) return
      const dropped = queue.splice(0)
      // A real engine reports a cancelled line a moment later, as an error.
      setTimeout(() => { for (const u of dropped) if (u.onerror) u.onerror({ error: 'canceled' }) }, cfg.staleDelay || 0)
    },
    addEventListener(type, fn) { if (type === 'voiceschanged') listeners.add(fn) },
    removeEventListener(type, fn) { listeners.delete(fn) },
  }
  const announce = () => { for (const fn of [...listeners]) fn(new Event('voiceschanged')) }

  window.__ra = {
    synth,
    state: () => ({ spoken: spoken.slice(), cancels, queued: queue.length, listeners: listeners.size, announcedTo }),
    // The head line ends, as an engine reports it.
    advance() {
      const u = queue.shift()
      if (!u) return -1
      if (u.onend) u.onend({})
      return queue.length
    },
    release() { voices = cfg.voices.map(make); announce() },
    setVoices(list) { voices = list.map(make); announce() },
  }
  Object.defineProperty(window, 'speechSynthesis', { value: cfg.noSynth ? undefined : synth, configurable: true })
  window.SpeechSynthesisUtterance = cfg.noUtterance ? undefined : Utterance
}

// --- what is read from, and done to, the page ------------------------------------------
// Each of these runs in the page. `inPage` sends the function's source with its arguments.
const inPage = (fn, ...args) => `(${fn.toString()})(...${JSON.stringify(args)})`

function readPage() {
  const clean = (s) => (s || '').replace(/\s+/g, ' ').trim()
  const block = document.querySelector('[data-read-aloud]')
  const band = document.querySelector('.ui-band')
  const button = block ? block.querySelector('button') : null
  const note = block ? block.querySelector('p') : null
  const sentence = block ? block.previousElementSibling : null
  const heading = sentence ? sentence.previousElementSibling : null
  return {
    path: location.pathname,
    block: !!block,
    button: button ? clean(button.textContent) : null,
    note: note ? clean(note.textContent) : null,
    iconHidden: !!(button && button.querySelector('svg[aria-hidden="true"]')),
    // The light's word and note, then the two sentences the block sits under.
    lines: [
      clean(band && band.querySelector('.ui-band-label') && band.querySelector('.ui-band-label').textContent),
      clean(band && band.querySelector('.ui-band-basis') && band.querySelector('.ui-band-basis').textContent),
      clean(heading && heading.textContent),
      clean(sentence && sentence.textContent),
    ],
    tags: [heading ? heading.tagName : '', sentence ? sentence.tagName : ''],
    focused: !!(button && document.activeElement === button),
    synth: typeof window.speechSynthesis,
    utterance: typeof window.SpeechSynthesisUtterance,
    fake: !!(window.__ra && (window.speechSynthesis === undefined || window.speechSynthesis === window.__ra.synth)),
  }
}

function labelIs(label) {
  const button = document.querySelector('[data-read-aloud] button')
  return !!button && button.textContent.replace(/\s+/g, ' ').trim() === label
}

function noBlock() {
  return !document.querySelector('[data-read-aloud]')
}

function hasBlock() {
  return !!document.querySelector('[data-read-aloud]')
}

// Where to press, and whether anything else is on that spot.
function buttonSpot() {
  const button = document.querySelector('[data-read-aloud] button')
  if (!button) return null
  button.scrollIntoView({ block: 'center', behavior: 'instant' })
  const r = button.getBoundingClientRect()
  const x = r.left + r.width / 2
  const y = r.top + r.height / 2
  const hit = document.elementFromPoint(x, y)
  const covered = !(hit && (hit === button || button.contains(hit)))
  return { x, y, covered, by: hit ? `${hit.tagName.toLowerCase()}.${String(hit.className).slice(0, 40)}` : 'nothing' }
}

function chooseLanguage(code) {
  const select = document.querySelector('select.ui-utility-select')
  if (!select) return false
  Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(select, code)
  select.dispatchEvent(new Event('change', { bubbles: true }))
  return select.value === code
}

function clickNav(path) {
  const link = document.querySelector(`.ui-navbar a[href="${path}"]`)
  if (!link) return false
  link.click()
  return true
}

function measure() {
  const doc = document.documentElement
  const block = document.querySelector('[data-read-aloud]')
  if (!block) return null
  const button = block.querySelector('button')
  const note = block.querySelector('p')
  const card = block.closest('section')
  const box = (el) => {
    const r = el.getBoundingClientRect()
    return { left: r.left, right: r.right, width: r.width, height: r.height }
  }
  const style = getComputedStyle(block)
  return {
    vw: doc.clientWidth,
    scrollWidth: doc.scrollWidth,
    block: box(block),
    button: box(button),
    card: card ? box(card) : null,
    noteClip: note.scrollWidth > note.clientWidth + 1,
    buttonClip: button.scrollWidth > button.clientWidth + 1,
    notePx: parseFloat(getComputedStyle(note).fontSize),
    shown: style.display !== 'none' && style.visibility !== 'hidden' && block.getBoundingClientRect().height > 0,
    display: style.display,
  }
}

// --- minimal CDP client, session-aware (as in mobile-audit.mjs) ------------------------
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
      if (msg.method === 'Network.requestWillBeSent') this.requests.push(msg.params?.request?.url || '')
      if (msg.method === 'Network.webSocketCreated') this.requests.push(msg.params?.url || '')
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

// --- scenarios: findings and faults --------------------------------------------------
const findings = []
const faults = []
const checks = new Map()
let loads = 0

function scenario(id) {
  checks.set(id, 0)
  return {
    ok(condition, kind, detail) {
      checks.set(id, checks.get(id) + 1)
      if (!condition) findings.push({ scn: id, kind, detail })
    },
    fault(detail) { faults.push({ scn: id, detail }) },
  }
}

const BASE = { voices: [], late: false, early: false, cancelInert: false, allLocal: false, appendDigit: false, staleDelay: 0, noSynth: false, noUtterance: false }
const FLAWS = { cancelInert: BROKEN.has('cancel'), allLocal: BROKEN.has('local'), appendDigit: BROKEN.has('digits') }

let scriptId = null

// A fresh document with the seed and the fake engine in place, and the page drawn.
async function load(cdp, s, o) {
  const { route, lang = 'en', result = CASES.yellow, cfg = {}, detail = 'detailed', size = 'md', theme = 'light', phone = null } = o
  const full = { ...BASE, ...cfg, ...FLAWS }
  if (scriptId) await cdp.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: scriptId })
  const added = await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `(${installFake.toString()})(${JSON.stringify(full)}, ${JSON.stringify({ result, lang, theme, size, detail })}, ${SEED_VERSION})`,
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
  cdp.pageErrors.length = 0
  // The old document answers until the new one commits, so it is marked, and the new one
  // is the first without the mark.
  await cdp.evaluate('window.__old = true').catch(() => {})
  const { errorText } = await cdp.send('Page.navigate', { url: APP + route })
  if (errorText) throw new Error(`${route} did not load (${errorText}). Is the app still running?`)
  loads++
  const drawn = await until(cdp, `!window.__old && (document.querySelector('#main')?.innerText?.trim().length || 0) > 40 && !!document.querySelector('.ui-band')`, 12000)
  if (!drawn) {
    s.fault(`${route} (${lang}) never drew a result page with a light: NOT-RENDERED, or the seed was not read (UNSEEDED)`)
    return false
  }
  const seeded = await cdp.evaluate(`(() => { try { return !!JSON.parse(sessionStorage.getItem('sih-application')).data.result } catch { return false } })()`)
  if (!seeded) {
    s.fault(`${route} (${lang}): UNSEEDED, the app discarded the seed`)
    return false
  }
  if (!(await cdp.evaluate('!!window.__ra'))) {
    s.fault(`${route} (${lang}): NO-FAKE, the fake engine did not install`)
    return false
  }
  await sleep(300)
  return true
}

const read = (cdp) => cdp.evaluate(inPage(readPage))
const raState = (cdp) => cdp.evaluate('window.__ra.state()')
const errors = (cdp, s, tag) => s.ok(!cdp.pageErrors.length, 'PAGE-ERROR', `${tag}: ${cdp.pageErrors[0]}`)

// A press as a thumb makes it: a real mouse click at the button's centre.
async function press(cdp, s, tag) {
  const spot = await cdp.evaluate(inPage(buttonSpot))
  if (!spot) {
    s.fault(`${tag}: there is no button to press`)
    return null
  }
  s.ok(!spot.covered, 'COVERED', `${tag}: ${spot.by} sits on the button's centre`)
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: spot.x, y: spot.y })
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: spot.x, y: spot.y, button: 'left', clickCount: 1 })
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: spot.x, y: spot.y, button: 'left', clickCount: 1 })
  await sleep(250)
  return spot
}

const wantedLines = (page) => page.lines.filter((line) => line && !DIGIT.test(line))

// --- R1: the button appears, with the dictionary's words, and nothing is spoken --------
async function r1Appears(cdp) {
  const s = scenario('R1')
  for (const lang of LANGS) {
    for (const route of PAGES) {
      const tag = `${lang} ${route}`
      if (!(await load(cdp, s, { route, lang, cfg: { voices: voicesFor(lang) } }))) continue
      const page = await read(cdp)
      const ra = await raState(cdp)
      s.ok(page.block, 'NO-BUTTON', `${tag}: there is a local ${lang} voice and no Listen button`)
      if (page.block) {
        s.ok(page.button === text(lang, 'ra.listen'), 'LABEL', `${tag}: the button reads ${q(page.button)}, the dictionary has ${q(text(lang, 'ra.listen'))}`)
        s.ok(page.note === text(lang, 'ra.note'), 'LABEL', `${tag}: the note reads ${q(page.note)}, the dictionary has ${q(text(lang, 'ra.note'))}`)
        s.ok(page.iconHidden, 'ICON', `${tag}: the speaker drawing is not aria-hidden`)
      }
      s.ok(ra.spoken.length === 0 && ra.queued === 0, 'AUTO-SPEECH', `${tag}: ${ra.spoken.length} line(s) were spoken before any press`)
      errors(cdp, s, tag)
    }
  }
}

// --- R2: nothing is drawn without a voice on the device for the page language ----------
const ABSENT = [
  ['no voices at all', 'en', { voices: [] }],
  ['only a network voice', 'hi', { voices: [{ name: 'Remote hi (Online)', lang: 'hi-IN', local: false }] }],
  ['only an English voice on a Hindi page', 'hi', { voices: [{ name: 'Local en', lang: 'en-IN', local: true }] }],
  ['hil-PH is not Hindi', 'hi', { voices: [{ name: 'Local hil', lang: 'hil-PH', local: true }] }],
  ['no speechSynthesis', 'en', { noSynth: true, voices: voicesFor('en') }],
  ['no SpeechSynthesisUtterance', 'en', { noUtterance: true, voices: voicesFor('en') }],
]
async function r2Absent(cdp) {
  const s = scenario('R2')
  for (const [why, lang, cfg] of ABSENT) {
    for (const route of PAGES) {
      const tag = `${why}, ${lang} ${route}`
      if (!(await load(cdp, s, { route, lang, cfg }))) continue
      const page = await read(cdp)
      // The case must really be the case: a "no engine" load with an engine measures nothing.
      if ((cfg.noSynth && page.synth !== 'undefined') || (cfg.noUtterance && page.utterance !== 'undefined')) {
        s.fault(`${tag}: the engine is not missing as the case says (speechSynthesis ${page.synth}, utterance ${page.utterance})`)
        continue
      }
      s.ok(!page.block, 'BUTTON-WITHOUT-VOICE', `${tag}: a Listen button is drawn`)
      errors(cdp, s, tag)
    }
  }
}

// --- R3 and R6: a press speaks the right lines in the right voice, to the end ----------
async function speakRun(cdp, s3, s6, s11, o) {
  const { lang, route, band, tag } = o
  if (!(await load(cdp, s3, { route, lang, result: CASES[band], cfg: { voices: voicesFor(lang) } }))) return
  const page = await read(cdp)
  if (!page.block) {
    s3.ok(false, 'NO-BUTTON', `${tag}: there is a local ${lang} voice and no button to press`)
    return
  }
  if (page.tags.join() !== 'H2,P' || page.lines[0] !== text(lang, `band.${band}`) || page.lines[1] !== text(lang, 'band.basis')) {
    s3.fault(`${tag}: the page is not the shape the gate reads (tags ${page.tags.join()}, light ${q(page.lines[0])})`)
    return
  }
  const want = wantedLines(page)
  const before = cdp.requests.length
  await press(cdp, s3, tag)
  await until(cdp, inPage(labelIs, text(lang, 'ra.stop')), 1500)
  const ra = await raState(cdp)
  const got = ra.spoken.map((u) => u.text)
  s3.ok(got.length > 0, 'SILENT', `${tag}: the press spoke nothing`)
  s3.ok(JSON.stringify(got) === JSON.stringify(want), 'WRONG-LINES', `${tag}: spoke ${q(got)}, the page shows ${q(want)}`)
  s3.ok(got[0] === text(lang, `band.${band}`) && got[1] === text(lang, 'band.basis'), 'WRONG-LINES', `${tag}: the light's word and note do not come first (${q(got.slice(0, 2))})`)
  s3.ok(!got.some((line) => DIGIT.test(line)), 'DIGIT-SPOKEN', `${tag}: a spoken line has a digit in it (${q(got.filter((line) => DIGIT.test(line)))})`)
  s3.ok(ra.spoken.every((u) => u.trueLocal === true), 'REMOTE-VOICE-USED', `${tag}: spoke in ${q([...new Set(ra.spoken.filter((u) => u.trueLocal !== true).map((u) => u.voice))])}, which is not on the device`)
  s3.ok(ra.spoken.every((u) => u.voice === `Local ${lang}` && u.lang === TAG[lang]), 'WRONG-VOICE', `${tag}: spoke in ${q([...new Set(ra.spoken.map((u) => `${u.voice} ${u.lang}`))])}, not Local ${lang} ${TAG[lang]}`)
  s3.ok(await cdp.evaluate(inPage(labelIs, text(lang, 'ra.stop'))), 'LABEL', `${tag}: the button did not read ${q(text(lang, 'ra.stop'))} while speaking`)

  // R6: the lines end one by one, and only the last one ends the speech.
  for (let i = 0; i < got.length - 1; i++) await cdp.evaluate('window.__ra.advance()')
  await sleep(200)
  s6.ok(await cdp.evaluate(inPage(labelIs, text(lang, 'ra.stop'))), 'ENDED-EARLY', `${tag}: the button went back to Listen with ${got.length - (got.length - 1)} line(s) still to speak`)
  await cdp.evaluate('window.__ra.advance()')
  s6.ok(await until(cdp, inPage(labelIs, text(lang, 'ra.listen')), 1500), 'LABEL', `${tag}: the button did not go back to ${q(text(lang, 'ra.listen'))} after the last line`)
  s11.ok(cdp.requests.length === before, 'NETWORK', `${tag}: ${cdp.requests.length - before} request(s) between the press and the end: ${q(cdp.requests.slice(before, before + 3))}`)
  // And it can be started again: the same lines once more.
  await press(cdp, s6, tag)
  const again = await raState(cdp)
  s6.ok(again.spoken.length === 2 * got.length, 'SILENT', `${tag}: a second run spoke ${again.spoken.length - got.length} line(s), not ${got.length}`)
  errors(cdp, s3, tag)
}

async function r3Speaks(cdp) {
  const s3 = scenario('R3')
  const s6 = scenario('R6')
  const s11 = scenario('R11')
  for (const lang of LANGS) {
    for (const route of PAGES) await speakRun(cdp, s3, s6, s11, { lang, route, band: 'yellow', tag: `yellow ${lang} ${route}` })
  }
  for (const band of ['green', 'red']) {
    for (const lang of ['en', 'hi']) {
      for (const route of PAGES) await speakRun(cdp, s3, s6, s11, { lang, route, band, tag: `${band} ${lang} ${route}` })
    }
  }
}

// --- R5: a second press stops the speech, and a stale cancel event is ignored ----------
async function r5Stops(cdp) {
  const s = scenario('R5')
  for (const [lang, route] of [['en', '/analysis'], ['hi', '/advisory']]) {
    const tag = `${lang} ${route}`
    if (!(await load(cdp, s, { route, lang, cfg: { voices: voicesFor(lang) } }))) continue
    if (!(await press(cdp, s, tag))) continue
    const started = await raState(cdp)
    s.ok(started.queued > 0, 'SILENT', `${tag}: the first press queued nothing`)
    await press(cdp, s, tag)
    const stopped = await raState(cdp)
    s.ok(stopped.cancels > started.cancels && stopped.queued === 0, 'NOT-STOPPED', `${tag}: after the second press ${stopped.queued} line(s) are still queued and ${stopped.cancels - started.cancels} cancel(s) were made`)
    s.ok(await until(cdp, inPage(labelIs, text(lang, 'ra.listen')), 1500), 'LABEL', `${tag}: the button did not go back to ${q(text(lang, 'ra.listen'))} after the stop`)
    s.ok((await read(cdp)).focused, 'FOCUS-LOST', `${tag}: the button lost focus when it stopped the speech`)
    await press(cdp, s, tag)
    const again = await raState(cdp)
    s.ok(again.spoken.length === 2 * started.spoken.length, 'SILENT', `${tag}: pressing again after a stop spoke ${again.spoken.length - started.spoken.length} line(s), not ${started.spoken.length}`)
    errors(cdp, s, tag)
  }

  // Press, press to stop, press again: the stopped lines report their cancel 500 ms later,
  // after the new speech has begun. That report must not end the new speech.
  const tag = 'stale cancel, en /analysis'
  if (await load(cdp, s, { route: '/analysis', lang: 'en', cfg: { voices: voicesFor('en'), staleDelay: 500 } })) {
    await press(cdp, s, tag)
    await press(cdp, s, tag)
    await press(cdp, s, tag)
    const restarted = await raState(cdp)
    s.ok(restarted.queued > 0 && await cdp.evaluate(inPage(labelIs, text('en', 'ra.stop'))), 'SILENT', `${tag}: the third press did not start a speech (${restarted.queued} queued)`)
    await sleep(900)
    const later = await raState(cdp)
    s.ok(later.queued > 0 && await cdp.evaluate(inPage(labelIs, text('en', 'ra.stop'))), 'STALE-EVENT', `${tag}: after the cancelled lines reported, the speech that replaced them is ${later.queued ? 'running but the button reads Listen' : 'gone'}`)
    errors(cdp, s, tag)
  }
}

// --- R7: voices that arrive late; R7b: a voice taken away mid-speech -------------------
async function r7Voices(cdp) {
  const s = scenario('R7')
  for (const route of PAGES) {
    const tag = `late voices, hi ${route}`
    if (!(await load(cdp, s, { route, lang: 'hi', cfg: { voices: voicesFor('hi'), late: true } }))) continue
    s.ok((await read(cdp)).block === false, 'BUTTON-WITHOUT-VOICE', `${tag}: a button is drawn before the browser lists any voice`)
    await cdp.evaluate('window.__ra.release()')
    s.ok(await until(cdp, inPage(hasBlock), 1500), 'NO-BUTTON', `${tag}: no button after the voices arrived (voiceschanged)`)
    s.ok((await raState(cdp)).spoken.length === 0, 'AUTO-SPEECH', `${tag}: the voices arriving started a speech`)
    errors(cdp, s, tag)
  }
  // The list is ready the moment the page first asks and is announced before the page has
  // started to listen, so the page has to read it again once it is listening and not wait
  // for an event that has gone by. Found on the owner's Edge on 1 Nov 2026 (326 voices,
  // no speaker button on /talk, whose hook subscribes the same way).
  for (const route of PAGES) {
    const tag = `list announced before the page listened, en ${route}`
    if (!(await load(cdp, s, { route, lang: 'en', cfg: { voices: voicesFor('en'), early: true } }))) continue
    const heard = (await raState(cdp)).announcedTo
    if (heard !== 0) {
      s.fault(`${tag}: the fake announced the list to ${heard} listener(s), not 0, so this measures nothing`)
      continue
    }
    s.ok(await until(cdp, inPage(hasBlock), 1500), 'NO-BUTTON', `${tag}: no button, though the browser had a voice on the device before the page listened`)
    s.ok((await raState(cdp)).spoken.length === 0, 'AUTO-SPEECH', `${tag}: the list arriving started a speech`)
    errors(cdp, s, tag)
  }
  const tag = 'voice taken away, en /analysis'
  if (await load(cdp, s, { route: '/analysis', lang: 'en', cfg: { voices: voicesFor('en') } })) {
    await press(cdp, s, tag)
    const started = await raState(cdp)
    await cdp.evaluate(`window.__ra.setVoices([{ name: 'Remote en (Online)', lang: 'en-IN', local: false }])`)
    s.ok(await until(cdp, inPage(noBlock), 1500), 'BUTTON-WITHOUT-VOICE', `${tag}: the button stays after the device's voice went away`)
    const after = await raState(cdp)
    s.ok(after.cancels > started.cancels && after.queued === 0, 'NOT-STOPPED', `${tag}: ${after.queued} line(s) are still queued after the voice went away`)
    errors(cdp, s, tag)
  }
}

// --- R8: a language switch --------------------------------------------------------------
async function r8Switch(cdp) {
  const s = scenario('R8')
  {
    const tag = 'hi to en, /analysis'
    if (await load(cdp, s, { route: '/analysis', lang: 'hi', cfg: { voices: [...voicesFor('hi'), ...voicesFor('en')] } })) {
      await press(cdp, s, tag)
      const started = await raState(cdp)
      s.ok(await cdp.evaluate(inPage(chooseLanguage, 'en')), 'LABEL', `${tag}: the language select could not be driven`)
      await sleep(400)
      const after = await raState(cdp)
      s.ok(after.cancels > started.cancels && after.queued === 0, 'NOT-STOPPED', `${tag}: ${after.queued} Hindi line(s) are still queued after the switch to English`)
      const page = await read(cdp)
      s.ok(page.block && page.button === text('en', 'ra.listen'), 'LABEL', `${tag}: after the switch the button reads ${q(page.button)}, not ${q(text('en', 'ra.listen'))}`)
      s.ok(after.spoken.length === started.spoken.length, 'AUTO-SPEECH', `${tag}: the switch started a speech`)
      // And it speaks the new language, in the new voice.
      await press(cdp, s, tag)
      const spoken = (await raState(cdp)).spoken.slice(started.spoken.length)
      const want = wantedLines(await read(cdp))
      s.ok(JSON.stringify(spoken.map((u) => u.text)) === JSON.stringify(want) && spoken.every((u) => u.voice === 'Local en'), 'WRONG-LINES', `${tag}: after the switch it spoke ${q(spoken.map((u) => `${u.voice}: ${u.text}`))}`)
      errors(cdp, s, tag)
    }
  }
  {
    const tag = 'hi to ta (no voice), /advisory'
    if (await load(cdp, s, { route: '/advisory', lang: 'hi', cfg: { voices: voicesFor('hi') } })) {
      await press(cdp, s, tag)
      const started = await raState(cdp)
      await cdp.evaluate(inPage(chooseLanguage, 'ta'))
      s.ok(await until(cdp, inPage(noBlock), 1500), 'BUTTON-WITHOUT-VOICE', `${tag}: the button stays on a Tamil page with no Tamil voice`)
      const after = await raState(cdp)
      s.ok(after.cancels > started.cancels && after.queued === 0, 'NOT-STOPPED', `${tag}: ${after.queued} line(s) are still queued after the switch to a language with no voice`)
      errors(cdp, s, tag)
    }
  }
}

// --- R9: leaving the page ----------------------------------------------------------------
async function r9Leave(cdp) {
  const s = scenario('R9')
  const tag = 'en /analysis, to /schemes, to /advisory'
  if (!(await load(cdp, s, { route: '/analysis', lang: 'en', cfg: { voices: voicesFor('en') } }))) return
  await press(cdp, s, tag)
  const started = await raState(cdp)
  s.ok(started.listeners === 1, 'LEAK', `${tag}: ${started.listeners} voiceschanged listener(s) on the page that has the button, not 1`)
  s.ok(await cdp.evaluate(inPage(clickNav, '/schemes')), 'NOT-STOPPED', `${tag}: the /schemes link was not found`)
  await until(cdp, `location.pathname === '/schemes'`, 3000)
  await sleep(300)
  const left = await raState(cdp)
  s.ok(left.cancels > started.cancels && left.queued === 0, 'NOT-STOPPED', `${tag}: ${left.queued} line(s) are still queued after leaving for /schemes`)
  s.ok(left.listeners === 0, 'LEAK', `${tag}: ${left.listeners} voiceschanged listener(s) left behind on /schemes`)
  s.ok(await cdp.evaluate(inPage(clickNav, '/advisory')), 'NOT-STOPPED', `${tag}: the /advisory link was not found`)
  await until(cdp, inPage(hasBlock), 3000)
  const page = await read(cdp)
  const there = await raState(cdp)
  s.ok(page.block && page.path === '/advisory' && page.button === text('en', 'ra.listen'), 'LABEL', `${tag}: on /advisory the button reads ${q(page.button)}`)
  s.ok(there.spoken.length === started.spoken.length, 'AUTO-SPEECH', `${tag}: arriving on /advisory started a speech`)
  s.ok(there.listeners === 1, 'LEAK', `${tag}: ${there.listeners} voiceschanged listener(s) on /advisory, not 1`)
  errors(cdp, s, tag)
}

// --- R10: a line with a digit is on the page and is not spoken -----------------------------
const DIGITS = { en: '4', hi: '४', ta: '௪', bn: '৪' }
async function r10Digits(cdp) {
  const s = scenario('R10')
  for (const lang of Object.keys(DIGITS)) {
    for (const route of PAGES) {
      const tag = `a digit line, ${lang} ${route}`
      // An unknown code, so the page falls back to the English the backend sent, which is
      // this line.
      const result = structuredClone(CASES.yellow)
      const line = `x ${DIGITS[lang]} x`
      if (route === '/analysis') {
        result.mvp_summary.message_code = 'zz.noSuchMessage'
        result.mvp_summary.simple_message = line
      } else {
        result.business_analysis.observation_codes[0] = 'zz.noSuchObservation'
        result.business_analysis.observations[0] = line
      }
      if (!(await load(cdp, s, { route, lang, result, cfg: { voices: voicesFor(lang) } }))) continue
      const page = await read(cdp)
      const digitLines = page.lines.filter((l) => DIGIT.test(l))
      if (!page.block || digitLines.length !== 1 || digitLines[0] !== line) {
        s.fault(`${tag}: the page does not show the digit line ${q(line)} (it has ${q(digitLines)}), so this measures nothing`)
        continue
      }
      await press(cdp, s, tag)
      const got = (await raState(cdp)).spoken.map((u) => u.text)
      s.ok(!got.includes(line) && !got.some((l) => DIGIT.test(l)), 'DIGIT-SPOKEN', `${tag}: spoke ${q(got.filter((l) => DIGIT.test(l)))}`)
      s.ok(JSON.stringify(got) === JSON.stringify(wantedLines(page)) && got.length === 3, 'WRONG-LINES', `${tag}: spoke ${q(got)}, expected the other three lines ${q(wantedLines(page))}`)
      errors(cdp, s, tag)
    }
  }
}

// --- R12: print --------------------------------------------------------------------------
async function r12Print(cdp) {
  const s = scenario('R12')
  for (const route of PAGES) {
    const tag = `print, en ${route}`
    if (!(await load(cdp, s, { route, lang: 'en', cfg: { voices: voicesFor('en') } }))) continue
    const screen = await cdp.evaluate(inPage(measure))
    s.ok(screen?.shown, 'NO-BUTTON', `${tag}: the block is not shown on screen, so print proves nothing`)
    await cdp.send('Emulation.setEmulatedMedia', { media: 'print' })
    const print = await cdp.evaluate(inPage(measure))
    await cdp.send('Emulation.setEmulatedMedia', { media: '' })
    s.ok(print && !print.shown, 'PRINT', `${tag}: the block is shown in print (display ${print?.display})`)
  }
}

// --- R13: layout; R14: both Simple and Detailed --------------------------------------------
const LAYOUTS = [
  { name: '320 lg dark', phone: [320, 640], size: 'lg', theme: 'dark', langs: LANGS, shot: 'hi' },
  { name: '390 md', phone: [390, 844], size: 'md', theme: 'light', langs: ['hi', 'ml'] },
  { name: '1280 md', phone: null, size: 'md', theme: 'light', langs: ['en', 'hi'] },
]
async function r13Layout(cdp) {
  const s = scenario('R13')
  for (const view of LAYOUTS) {
    for (const lang of view.langs) {
      for (const route of PAGES) {
        const tag = `${view.name}, ${lang} ${route}`
        if (!(await load(cdp, s, { route, lang, cfg: { voices: voicesFor(lang) }, phone: view.phone, size: view.size, theme: view.theme }))) continue
        const m = await cdp.evaluate(inPage(measure))
        if (!m) {
          s.ok(false, 'NO-BUTTON', `${tag}: no block to measure`)
          continue
        }
        s.ok(m.scrollWidth <= m.vw + 1, 'LAYOUT', `${tag}: the page scrolls sideways (${m.scrollWidth} in ${m.vw})`)
        s.ok(m.block.left >= -0.5 && m.block.right <= m.vw + 0.5, 'LAYOUT', `${tag}: the block is outside the viewport (${m.block.left.toFixed(1)} to ${m.block.right.toFixed(1)} of ${m.vw})`)
        s.ok(!m.card || (m.block.left >= m.card.left - 0.5 && m.block.right <= m.card.right + 0.5), 'LAYOUT', `${tag}: the block sticks out of its card`)
        s.ok(!m.noteClip && !m.buttonClip, 'LAYOUT', `${tag}: the ${m.buttonClip ? 'button' : 'note'} is wider than its box`)
        s.ok(m.button.height >= 43.5, 'LAYOUT', `${tag}: the button is ${m.button.height.toFixed(1)} px high, under 44`)
        s.ok(m.notePx >= 12, 'LAYOUT', `${tag}: the note is ${m.notePx.toFixed(1)} px, under 12`)
        s.ok(m.shown, 'LAYOUT', `${tag}: the block is not shown`)
        errors(cdp, s, tag)
        if (view.shot === lang) {
          await cdp.evaluate(inPage(buttonSpot))
          const shot = await cdp.send('Page.captureScreenshot', { format: 'png' })
          writeFileSync(`${OUT}/${lang}-${view.name.replace(/ /g, '-')}${route.replace('/', '-')}.png`, Buffer.from(shot.data, 'base64'))
        }
      }
    }
  }
}

async function r14Detail(cdp) {
  const s = scenario('R14')
  for (const detail of ['simple', 'detailed']) {
    for (const route of PAGES) {
      const tag = `${detail}, en ${route}`
      if (!(await load(cdp, s, { route, lang: 'en', detail, cfg: { voices: voicesFor('en') } }))) continue
      const html = await cdp.evaluate('document.documentElement.dataset.detail')
      if (html !== detail) {
        s.fault(`${tag}: <html data-detail> is ${q(html)}, so the page is not in the mode the case says`)
        continue
      }
      s.ok((await cdp.evaluate(inPage(measure)))?.shown === true, 'NO-BUTTON', `${tag}: the block is not shown`)
      errors(cdp, s, tag)
    }
  }
}

const RUNS = [r1Appears, r2Absent, r3Speaks, r5Stops, r7Voices, r8Switch, r9Leave, r10Digits, r12Print, r13Layout, r14Detail]

// What each --broken arm has to be seen to cause, or the run exits 2: a refuter that does
// not fire proves nothing.
const REQUIRED = {
  cancel: ['NOT-STOPPED'],
  local: ['REMOTE-VOICE-USED', 'BUTTON-WITHOUT-VOICE'],
  digits: ['DIGIT-SPOKEN', 'WRONG-LINES'],
}

async function main() {
  if (!(await requireServer(APP + '/', 'Start the app first: npm run dev in ./frontend, or the copy --url= names.'))) return
  // Something already answering on the debug port is another run, or an Edge a killed run
  // left behind. Ours could not bind it, browserWsUrl() would attach to that browser, and
  // killOwnEdge() would end it. No process.exit() here: this follows a fetch.
  const taken = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`, { signal: AbortSignal.timeout(2000) })
    .then(async (res) => { await res.body?.cancel(); return true }, (err) => err.name === 'TimeoutError')
  if (taken) {
    console.error(`read-aloud: port ${DEBUG_PORT} is already answering: another read-aloud, or an Edge a killed run left behind. End it by PID (netstat -ano | grep :${DEBUG_PORT}) and run again.`)
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
    for (const run of RUNS) await run(cdp)
  } finally {
    killOwnEdge()
  }

  for (const [id, n] of checks) if (n === 0 && !faults.some((f) => f.scn === id)) faults.push({ scn: id, detail: 'evaluated nothing' })
  const kinds = new Set(findings.map((f) => f.kind))
  const unrefuted = [...BROKEN].flatMap((arm) => REQUIRED[arm].filter((kind) => !kinds.has(kind)).map((kind) => `${arm} -> ${kind}`))
  const exit = faults.length || unrefuted.length ? 2 : findings.length ? 1 : 0

  const perScenario = Object.fromEntries(checks)
  writeFileSync(`${OUT}/report.json`, JSON.stringify({ exit, broken: [...BROKEN], loads, checks: perScenario, findings, faults, unrefuted }, null, 2))
  for (const [id, n] of checks) {
    const mine = findings.filter((f) => f.scn === id)
    const broke = faults.filter((f) => f.scn === id)
    console.log(`${mine.length || broke.length ? 'FAIL' : 'ok  '}  ${id.padEnd(4)} ${String(n).padStart(3)} checks${mine.length ? `  ${mine.length} finding(s)` : ''}${broke.length ? `  ${broke.length} fault(s)` : ''}`)
    for (const f of mine.slice(0, 6)) console.log(`        ${f.kind}  ${f.detail}`)
    if (mine.length > 6) console.log(`        ... ${mine.length - 6} more in report.json`)
    for (const f of broke) console.log(`        FAULT  ${f.detail}`)
  }
  console.log(`\n${loads} page loads, ${[...checks.values()].reduce((a, b) => a + b, 0)} checks, ${findings.length} finding(s), ${faults.length} fault(s).`)
  if (BROKEN.size) console.log(`--broken=${[...BROKEN].join(',')}: ${unrefuted.length ? `NOT REFUTED: ${unrefuted.join('; ')}` : 'every arm was seen to fail the gate'}.`)
  console.log(`Screenshots and report.json in ${OUT}`)
  process.exit(exit)
}

main().catch((err) => {
  console.error('READ-ALOUD ERROR:', err.message)
  killOwnEdge()
  crashExit()
})
