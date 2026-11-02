// The /talk gate: the "say or type your answers" page, which asks the form's questions
// one at a time, and the voice home (S26-S30) that shares its code, driven in a real Edge.
// The Node tests (talk-lib-test, app-state-test, the pytest suite) cover the
// parts that need no browser; this covers what only a browser has: the permission
// question, the microphone itself, focus, the React state that locks the boxes, and
// the way AppContext and the form pages show what the helper filled in.
//
// Nothing here reaches Meta. The backend is the shipped app with a fake model in
// Meta's place (tools/verify/talk_fake_backend.py), and Edge gets a synthetic
// microphone (--use-fake-device-for-media-stream), so the run needs no key and
// costs nothing. It starts its own backend (8012), three Vites (5182 helper on,
// 5183 helper off, 5184 helper on with the age box) and its own Edge (9379), and
// kills all of them by PID on every exit path. It never kills msedge or node by
// image name: other gates, and the reader's own browser, may be running.
//
//   node tools/verify/talk-ui.mjs                 every scenario
//   node tools/verify/talk-ui.mjs --only=S5,S13   just those (report.json says so)
//
// Run from the repo root. Needs .venv, Edge and frontend/node_modules.
//
//   S0   helper off: no link to /talk anywhere, the form is the landing page's main button,
//        and /talk is the not-found page
//   S1   helper on: the link to /talk from the form, the page, the first (open) question, the
//        starting state
//   S2   consent gate: Find and Record both refuse, say why, focus the box, and send nothing
//   S2b  age gate (a copy built with VITE_REQUIRE_AGE_CHECK=true)
//   S3   typed sentence -> 12 answers to review -> nothing applied until the button ->
//        the form fields, the "filled from what you said" banners, a full reload; the page
//        then asks the one question left, and "use the form" leads on
//   S4   voice: record, stop, the WAV the backend got, the microphone released, a second
//        recording adds to the text
//   S5   the boxes stay locked while the browser asks for the microphone; Cancel and a
//        refusal give them back
//   S6   every error code the backend can send, the transcription failure, api.js limits
//   S7   Cancel while a request is out
//   S8   Malayalam has no speech model: no record button, typing still works
//   S9   microphone refused / missing
//   S10  all 8 languages: title, consent error, no leaked key or placeholder
//   S11  360 px phone, English and Hindi: overflow, tap targets, font size
//   S12  editing a filled answer removes it from the banner, and only it
//   S13  a recorder that will not start leaves the microphone off
//   S14  leaving the page releases the microphone, also when the browser was still asking
//   S15  the consent lock holds from Stop until the recording is sent; a recording that
//        cannot be finished is reported, sends nothing and unlocks
//   S16  the plan card on /advisory at rest: its own consent tick, nothing sent; helper off: no card
//   S17  one plan, written through the four real pages: the request, what the model is shown,
//        the card, the stored plan, a reload, an edited answer
//   S18  a plan in English, then Hindi, then English
//   S19  a refused plan and every other way the request can fail
//   S20  Cancel while the plan is being written
//   S21  a plan in each of the 8 languages
//   S22  360 px phone: the plan card at rest and with a plan
//   S23  the questions one at a time: Skip, a typed reply (the model is told which question),
//        "Yes, that is right" / "No, I will say it again", a reply that answers another
//        question, a reply with no answer, a spoken reply, one reply that answers several
//        questions, the end of the questions
//   S24  the question read aloud (a fake speech engine): nothing before consent, one line at a
//        time, the speaker button, Skip / Find / Record change or stop it, the voice chosen (a
//        local one first), no button when the browser has no voice for the language, a list of
//        voices that comes late, and one the browser announced before the page was listening
//   S25  360 px phone: the open question, a question under review, no answer found, the end
//        of the questions
//   S26  the voice home (the landing page with the helper on): the heading, the open question,
//        the microphone at rest, no text box, the links to the form and to /talk, nothing
//        animating at rest, the consent gate on the microphone
//   S27  the voice home, the spoken way through: one recording to the review of twelve answers,
//        no step number on the consent and the review, the question left, every question
//        skipped, and the way on to the form
//   S28  the voice home, the microphone's states: recording, Cancel, a turned-away recording,
//        Cancel while it is out, the browser asking / refusing / having none, the link to /talk
//        starting a new page and cutting a recording off, Malayalam; the two loops (the ring
//        while recording, the spinner while a request is out): which one, what it moves, that
//        it ends with what began it
//   S29  360 px phone: the voice home at rest and recording in three languages, and the whole
//        microphone on the first screen of a 360 x 640 phone
//   S30  the voice home, the question read aloud: a device voice by itself, pressing the
//        microphone ends it, the recording sent in the page's language, a network voice on a press
//
// S16-S22 reach /advisory the way a reader does, by typing the answers into /business,
// /location and /finance, because the card only exists once there is a result. The plan
// the fake model returns is good_plan(language) from backend/tests/plan_fixtures.py, and
// what the model was shown is read from the fake's log. Meta's real wording is not tested
// here: that is `python -m app.smoke_meta --plan`.
//

// Exit 0: nothing found. 1: a finding. 2: the run could not measure (wrong working
// directory, a port held, a server or Edge would not start or went away, an element
// the probe needs is missing, a wait never ended, the script crashed). A scenario
// that throws is a fault and shows in report.json, never as a pass. 130: a signal.
// report.json starts with `exit`; a run that never started leaves none.
//
// Refuters, by hand (change one line, run with --only=, restore it): the gate is
// only worth what it catches. All thirteen were run on 27 Oct 2026; in brackets, how
// many checks failed.
//   TalkPage.jsx  delete the first onActiveChange(true) in VoiceRecorder.start()   -> S5   [4]
//   TalkPage.jsx  delete the `if (!agreed()) return` in find()                     -> S2   [6]
//   TalkPage.jsx  the same line as a bare `agreed()`: checked, then ignored        -> S2   [2, "nothing was sent"]
//   TalkPage.jsx  `return agreed()` becomes `return true` in mayRecord()           -> S2   [2, and exit 2:
//                 Record then starts and locks the box that S2 ticks next, a fault after the findings]
//   TalkPage.jsx  `return consent && !needsAge` becomes `return consent`           -> S2b  [2]
//   record.js     delete the release() in the catch of startRecording()            -> S13  [1]
//   TalkPage.jsx  delete the handle.cancel() in the `!mountedRef.current` branch   -> S14  [1]
// S15, all in finish() of VoiceRecorder:
//   TalkPage.jsx  put onActiveChange(false) back before setStarting(true)           -> S15  [1]
//                 (the order before the lock was held until the file was sent)
//   TalkPage.jsx  delete the setStarting(true)                                      -> S15  [1]
//   TalkPage.jsx  delete the onActiveChange(false) before the mountedRef check      -> S15  [2]
//   TalkPage.jsx  delete the setStarting(false) before onWav(wav)                   -> S15  [2]
//   TalkPage.jsx  delete the `else onError('talk.errRecording')`                    -> S15  [1]
//   TalkPage.jsx  call onWav(wav) whatever wav is                                   -> S15  [1]
// S16-S22, run on 28 Oct 2026 (PlanWriter in AdvisoryPage.jsx, unless another file is named):
//   AdvisoryPage.jsx  drop `DEPLOYMENT.aiHelper &&` where PlanWriter is mounted      -> S16  [1]
//   AdvisoryPage.jsx  setConsentMissing(!consent) becomes setConsentMissing(false)   -> S16  [2]
//   AdvisoryPage.jsx  `if (!consent) {` becomes `if (false) {` (send without the tick) -> S16  [3]
//   AdvisoryPage.jsx  the setError('') that starts write() becomes setError(error)   -> S19  [1], S20  [4]
//   AdvisoryPage.jsx  requestPlan(request, language, ...) always asks for 'en'       -> S18  [3], S21  [14]
//   AdvisoryPage.jsx  requestPlan(..., false): send_to_meta false                    -> S17  [2, the route says 422 and the scenario stops]
//   AdvisoryPage.jsx  justWritten.current = true becomes false                       -> S17  [1]
//   AdvisoryPage.jsx  setConsent(false) after a plan becomes setConsent(true)        -> S17  [1]
//   AdvisoryPage.jsx  report an abort as an error (no isAbortError test)             -> S20  [2]
//   AdvisoryPage.jsx  the Cancel button does nothing                                 -> S20  [3]
//   AdvisoryPage.jsx  Write not disabled while the request is out                    -> S20  [1]
//   AdvisoryPage.jsx  the consent box not disabled while the request is out          -> S20  [1]
//   api.js            429 maps to the generic error, not to plan.errBusy             -> S19  [1]
//   api.js            skip the isPlan() test on a 200                                -> S19  [1]
//   AppContext.jsx    applyEdit keeps the plan when an answer changes                -> S17  [1]
//   plan_service.py   put "It is in Lucknow." into the facts the model is sent       -> S17  [1]
//   plan_service.py   put a number into those facts                                  -> S17  [1]
//   AdvisoryPage.jsx  one sentence of the card at 10 px                              -> S22  [5]
//   AdvisoryPage.jsx  min-w-[520px] on the Write button                              -> S22  [5]
//   AdvisoryPage.jsx  a 20 px high label round the consent box                       -> S22  [5]
// A fixed width on the Write button (w-[520px]) survived: the buttons sit in a flex row
// and shrink to fit it. min-width cannot be shrunk, so that is the refuter listed.
// The first Cancel refuter exited 2: the plan then arrived, the button read "again", and
// the last step faulted on a "Write my plan" that was no longer there. S20 now stops
// there, so the finding is exit 1. waitForRender() (more than 40 characters in #main)
// cannot tell the page being left from the one being entered after a client-side
// move, which cost two false starts; S16-S22 wait on the h1 (h1Now) instead.
// The first run of the S2 refuter exited 2, not 1: the page no longer showed the
// consent error and waitSnap called that a fault in the instrument. A state the
// page owes the reader is now awaited with settleSnap, so its absence is a finding.
// The last S15 refuter survived at first: "nothing was sent" read fake.calls(), and
// the real route turns a bad WAV away with a 422 before the model client, where the
// fake keeps its log. The check now hooks fetch in the page (window.__stop.fetchAt).
// S15 also waits 1.2 s before pressing Stop: a recording stopped at once is sometimes
// reported as unusable (3 of 40 runs without the wait, 0 of 40 with it, too few to
// call significant), and that report is correct but is not what part 1 is testing.
// S23-S25, run on 30 Oct 2026 (the S24 rows again on 1 Nov 2026): 39 changes, made one at a
// time, each file put back byte for byte after its run. TalkPage.jsx unless another file is
// named; in brackets, how many checks failed. All 39 fail the gate with exit 1. S23, the
// questions one at a time:
//   TalkPage.jsx  lookFor() no longer sends `asking`                                  -> S23  [6]
//   TalkPage.jsx  `asking` also sent in the open turn (`?? 'state'`)                  -> S3   [1]
//   TalkPage.jsx  apply() marks the question asked as answered, landed or not         -> S23  [1]
//   TalkPage.jsx  apply() marks nothing as answered                                   -> S23  [1]
//   TalkPage.jsx  Skip in the open turn does nothing                                  -> S23  [1]
//   TalkPage.jsx  Skip on a form question does not mark it done                       -> S23  [1]
//   TalkPage.jsx  Skip not disabled while a request is out                            -> S23  [1]
//   TalkPage.jsx  a spoken reply waits for Find (`if (question)` becomes `if (false)`) -> S23  [1]
//   TalkPage.jsx  the text box is not emptied for the next question                   -> S23  [1]
//   TalkPage.jsx  a reply is written to the form when found, before "that is right"   -> S23  [4]
//   TalkPage.jsx  the "nothing found" line is always the open turn's                  -> S23  [1]
//   TalkPage.jsx  the end of the list shows the open question's line                  -> S23  [1]
//   TalkPage.jsx  "use the form instead" always leads to /finance                     -> S23  [2]
//   TalkPage.jsx  the question is not given focus after a step                        -> S23  [14]
//   TalkPage.jsx  the number counts from 0 instead of 1                               -> S23  [15]
//   TalkPage.jsx  `open` is always false: the open turn never happens                 -> S1, S3, S23  [5]
//   TalkPage.jsx  the confirming button always says "Use these answers"               -> S23  [2]
//   TalkPage.jsx  the note about the form is shown on every turn                      -> S23  [1]
//   TalkPage.jsx  "No, I will say it again" is never offered                          -> S23  [2]
//   TalkPage.jsx  "Yes, that is right" not disabled while a request is out            -> S23  [1]
//   TalkPage.jsx  "No, I will say it again" not disabled while a request is out       -> S23  [1]
//   TalkPage.jsx  no navigation after the last answer                                 -> S23  [1]
// S24, the question read aloud (run again on 1 Nov 2026, after a voice over the network was
// made to wait for a press of Listen; the row for the second read of the list was added the
// same day, after the real Edge showed the announcement arriving before the listener):
//   TalkPage.jsx  the voice starts without the consent tick                           -> S24  [1]
//   TalkPage.jsx  the question is always read in English                              -> S24  [3]
//   TalkPage.jsx  agreed() (Find, Record) no longer stops the voice                   -> S24  [1]
//   TalkPage.jsx  the spoken line includes the typed words                            -> S24  [1]
//   useQuestionVoice.js  the effect returns no cleanup (new line, untick, leaving)    -> S24  [2]
//   useQuestionVoice.js  the speaker button is offered with no voice                  -> S24  [2]
//   useQuestionVoice.js  no listener for `voiceschanged`                              -> S24  [1]
//   useQuestionVoice.js  no second read of the list once the listener is in place     -> S24  [3]
//   useQuestionVoice.js  a voice over the network also starts by itself               -> S24  [2]
//   useQuestionVoice.js  no voice starts by itself                                    -> S24  [1]
//   useQuestionVoice.js  the speaker button only for a voice on the device            -> S24  [3]
//   speak.js      delete the `if (!live) return` in finish()                          -> S24  [2]
//   speak.js      a local voice is no longer preferred to a network voice             -> S24  [1]
//   speak.js      a voice over the network is never used for the questions            -> S24  [3]
// Not a row: deleting `stopRef.current?.()` at the top of start() in useQuestionVoice.js
// exits 0 (60 checks). Nothing can reach it: the effect returns `stop` in every case and
// toggle() calls start() only when nothing plays. A probe that throws there ran S23-S25
// (229 checks) with no failure and no page error. The line stays as a guard.
// S25, 360 px:
//   TalkPage.jsx  the question heading gets a min-width of 420 px                     -> S25  [7]
//   TalkPage.jsx  the "Question n of 12" line at 10 px                                -> S25  [4]
//   TalkPage.jsx  the language box 20 px high                                         -> S25  [6]
// The voice home replaced the landing page with the helper on (2 Nov 2026), and with it the
// four landing-button rows that stood here (S1). One is left: the form button of the landing
// page with the helper off, in the last row below.
// S26-S30, run on 2 Nov 2026: 17 changes, made one at a time, each file put back byte for
// byte after its run (the hash compared). All 17 fail the gate with exit 1, none exit 2; in
// brackets, how many checks failed.
//   App.jsx       drop key="home" from the home route                                 -> S28  [2, the two "new page" checks]
//                 (the recorder remounts on its own, so the cut-off check still holds)
//   TalkPage.jsx  the Cancel button of a request that is out is never offered         -> S28  [2]
//   TalkPage.jsx  the microphone below the question card, off the first screen        -> S29  [2]
//   index.css     a keyframe animation on the microphone at rest                      -> S26  [1]
//   TalkPage.jsx  the ring's --level always 0                                         -> S28  [1]
//   TalkPage.jsx  `return agreed()` becomes `return true` in mayRecord()              -> S26  [5], S30  [1]
//   TalkPage.jsx  a spoken reply in the open turn waits for Find (`if (question || home)`) -> S27  [1]
//   TalkPage.jsx  the recording is sent in English whatever the page language         -> S28  [2], S30  [1]
//   TalkPage.jsx  Skip not disabled while the recording is out                        -> S28  [2]
//   TalkPage.jsx  the link to /talk leads to /                                        -> S26  [1], S28  [1]
//   index.css     the step number shown on the home page                              -> S27  [1]
//   TalkPage.jsx  the microphone also at the end of the questions                     -> S27  [1]
//   TalkPage.jsx  the heading not hidden on a phone                                   -> S29  [1]
//   TalkPage.jsx  the microphone never disabled                                       -> S28  [2]
//   TalkPage.jsx  agreed() (the microphone) no longer stops the voice                 -> S30  [1]
//   TalkPage.jsx  the cleanup of VoiceRecorder no longer cancels the recording        -> S28  [1]
//   App.jsx       the form button of the helper-off landing page gets variant="secondary" -> S0  [1]
// The motion, run on 2 Nov 2026: 4 more changes, made the same way, each file put back byte
// for byte (the hash compared). All 4 fail the gate with exit 1.
//   index.css     the ring's keyframes also move box-shadow                           -> S28  [1]
//   index.css     the ring drawn at rest (the selector loses [data-recording])        -> S26  [1], S28  [3]
//   TalkPage.jsx  the spinner removed                                                 -> S28  [1]
//   TalkPage.jsx  the spinner drawn at rest (`busy &&` becomes `true &&`)             -> S26  [1], S28  [3]
// The first runs of S28's "the recording was cut off and the microphone released" failed in 7
// of 13 runs with the page intact: the tracks were read between the moment React draws /talk
// and the moment it lets go of the old page. It waits up to 2 s now (settleSnap), 0 failures
// in 5 runs, and the cleanup refuter above still fails it.
// The first run of the 35, against the first version of the gate, was not a pass: 6 exited
// 1, 9 exited 2, 3 survived (the two locks on the review buttons and the navigation after
// the last answer) and 17 never ran, because the next one started before the ports of the
// last were free. What fixed it: a state the page owes is awaited with reach() and
// pressOwed(), which record a finding and stop the scenario instead of faulting; S23 presses
// the review buttons while a request is out; S23 checks the navigation after the last
// answer; the runner waits up to 90 s for the ports. "Open is always false" then exited 2
// once more: untickLucknowAndApply() in S3 still used press() and waitSnap(), which fault on
// a button the page no longer has. It uses pressOwed() and reach() now, and exits 1.
// S24 waits for the silence after leaving the page, not for the new address: the path changes
// a moment before the page is unmounted and the voice stopped.
import { spawn, spawnSync } from 'node:child_process'
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

// A run that ends without reaching its verdict exits 2; the verdict overrides it.
process.exitCode = 2

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const DEBUG_PORT = 9379
const FAKE_PORT = 8012
const VITES = { on: 5182, off: 5183, age: 5184 }
const API = `http://127.0.0.1:${FAKE_PORT}`
const ON = `http://127.0.0.1:${VITES.on}`
const OFF = `http://127.0.0.1:${VITES.off}`
const AGE = `http://127.0.0.1:${VITES.age}`
const OUT = resolve('screenshots/verify/talk-ui')
const PROFILE_DIR = resolve('screenshots/verify/talk-ui/profile')
const PYTHON = resolve('.venv/Scripts/python.exe')
const VITE_BIN = resolve('frontend/node_modules/vite/bin/vite.js')
const APP_CONTEXT = 'frontend/src/context/AppContext.jsx'
const I18N = resolve('frontend/src/i18n')
const LANGS = ['en', 'hi', 'ta', 'te', 'ml', 'kn', 'mr', 'bn']
const ONLY = (process.argv.slice(2).find((a) => a.startsWith('--only=')) ?? '')
  .slice('--only='.length).split(',').filter(Boolean)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
class Fault extends Error {}
// A finding has been recorded and the walk cannot go on without the state it was waiting
// for (see reach). Not a fault: the instrument measured, and the page failed.
class Halt extends Error {}

// --- every process this script starts, and how it dies ----------------------
// By PID tree and nothing else (see market-ui.mjs for why, and for the Edge
// relaunch the command-line match below is the fallback for).
const children = []
function killPid(pid) {
  spawnSync('taskkill', ['/F', '/T', '/PID', String(pid)], { stdio: 'ignore' })
}
function killTree(child) {
  if (!child || child.reaped || child.exitCode !== null || child.signalCode !== null) return
  child.reaped = true
  killPid(child.pid)
}
function ownEdgePids() {
  const script =
    "Get-CimInstance Win32_Process -Filter \"name='msedge.exe'\" | Where-Object { $_.CommandLine -and " +
    "$_.CommandLine.Contains($env:TALK_UI_PROFILE) -and -not $_.CommandLine.Contains('--type=') } | " +
    'ForEach-Object { $_.ProcessId }'
  const r = spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', script], {
    env: { ...process.env, TALK_UI_PROFILE: PROFILE_DIR },
    encoding: 'utf8',
  })
  return (r.stdout || '').split(/\s+/).filter((s) => /^\d+$/.test(s)).map(Number)
}
let edgeStarted = false
function cleanup() {
  for (const child of children.splice(0)) killTree(child)
  if (edgeStarted) {
    edgeStarted = false
    for (const pid of ownEdgePids()) killPid(pid)
  }
}
process.on('exit', cleanup)
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGBREAK']) {
  process.on(signal, () => { cleanup(); process.exit(130) })
}
process.on('uncaughtException', (err) => {
  console.error(err)
  crashExit()
})
// Exiting within about 100 ms of a fetch() can kill node with 0xC0000409; the
// wait blocks this thread. tools/README.md, Exit codes, has the measurements.
function crashExit(code = 2) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000)
  process.exit(code)
}

if (!existsSync(resolve('tools/verify/talk-ui.mjs'))) {
  console.error(`talk-ui: ${process.cwd()} is not the repo root. Run this from the repo root: node tools/verify/talk-ui.mjs`)
  process.exit(2)
}
// A report.json on disk is always from a run that finished.
rmSync(resolve(OUT, 'report.json'), { force: true })

// --- inputs, all read before anything is started ----------------------------
function refuse(message) {
  console.error(`talk-ui: ${message}`)
  process.exit(2)
}
for (const [what, path] of [['the venv python', PYTHON], ['Edge', EDGE], ['Vite', VITE_BIN], ['the fake backend', resolve('tools/verify/talk_fake_backend.py')]]) {
  if (!existsSync(path)) refuse(`${what} not found at ${path}`)
}

// The storage key and version come from AppContext, so a bump reaches this gate
// by itself. Nothing here writes a seed: every scenario starts empty, and the
// state under test is the state the app itself wrote.
const appContext = readFileSync(resolve(APP_CONTEXT), 'utf8')
const STORAGE_KEY = appContext.match(/^const STORAGE_KEY = (['"])([^'"\n]+)\1/m)?.[2]
const STORAGE_VERSION = Number(appContext.match(/^const STORAGE_VERSION = (\d+)/m)?.[1])
const READABLE = appContext.match(/^const READABLE_VERSIONS = new Set\(\[([\d,\s]*)\]\)/m)?.[1]
if (!STORAGE_KEY || !Number.isInteger(STORAGE_VERSION) || READABLE === undefined) {
  refuse(`STORAGE_KEY, STORAGE_VERSION or READABLE_VERSIONS not found in ${APP_CONTEXT}; update the parse in talk-ui.mjs.`)
}
if (!READABLE.split(',').map((v) => Number(v.trim())).includes(STORAGE_VERSION)) {
  refuse(`${APP_CONTEXT} no longer reads its own version ${STORAGE_VERSION} (READABLE_VERSIONS is ${READABLE.trim()}).`)
}

// The merged dictionaries, loaded the way error-banner.mjs loads them:
// strings.js imports its siblings without an extension, which Vite resolves and
// Node does not, so the specifiers become absolute file URLs.
let STRINGS
try {
  const source = readFileSync(resolve(I18N, 'strings.js'), 'utf8').replace(
    /from '\.\/(resultStrings|backendStrings|schemeStrings)'/g,
    (_, name) => `from '${pathToFileURL(resolve(I18N, name + '.js')).href}'`,
  )
  ;({ STRINGS } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64')))
} catch (err) {
  refuse(`the dictionaries in ${I18N} did not load (${err.message}).`)
}
let SENT_FIELDS, FIELD_LABEL_KEYS, QUESTIONS, LANGUAGES
try {
  ;({ SENT_FIELDS } = await import(pathToFileURL(resolve('frontend/src/config/notice.js')).href))
  ;({ FIELD_LABEL_KEYS, QUESTIONS } = await import(pathToFileURL(resolve('frontend/src/data/talkAnswers.js')).href))
  ;({ LANGUAGES } = await import(pathToFileURL(resolve('frontend/src/i18n/languages.js')).href))
} catch (err) {
  refuse(`a frontend module this gate imports did not load (${err.message}).`)
}

const fill = (text, params = {}) => String(text).replace(/\{(\w+)\}/g, (m, k) => (k in params ? String(params[k]) : m))
const norm = (s) => String(s ?? '').replace(/[→🎤]/gu, '').replace(/\s+/g, ' ').trim()
// This language's text, or English per key, as t() falls back. A key the English
// table lacks is refused up front (USED_KEYS below), not mid-run.
const T = (lang, key, params) => {
  const text = STRINGS[lang]?.[key] ?? STRINGS.en?.[key]
  if (typeof text !== 'string') throw new Fault(`no dictionary text for ${key}`)
  return fill(text, params)
}
const en = (key, params) => T('en', key, params)

const USED_KEYS = [
  'talk.title', 'talk.record', 'talk.stop', 'talk.cancel', 'talk.find', 'talk.apply',
  'talk.askOpen', 'talk.progress', 'talk.skip', 'talk.right', 'talk.again', 'talk.toForm', 'talk.allDone', 'talk.noneHere', 'talk.applyNote',
  'talk.noneFound', 'common.continue', 'nav.home', 'ra.listen', 'ra.stop', ...QUESTIONS.map(([, key]) => key),
  'talk.reviewTitle', 'talk.consentRequired', 'talk.errMicDenied', 'talk.errMicNone', 'talk.errUnavailable',
  'talk.errBusy', 'talk.errUnclear', 'talk.errRecording', 'talk.errGeneric', 'talk.langNoSpeech',
  'talk.finding', 'talk.listening', 'talk.recording', 'talk.filledTitle', 'talk.said', 'nf.title',
  'landing.title', 'greeting.hello', 'talk.sendsTitle', 'talk.sendsText', 'talk.rulesNote', 'talk.consent', 'talk.askDistrict',
  'cat.tailoring', 'cat.retail', 'area.rural', ...Object.values(FIELD_LABEL_KEYS),
  'business.submit', 'location.submit', 'finance.submit', 'ad.title', 'ad.notReady', 'ad.planTitle', 'fo.title', 'res.changedTitle',
  'plan.eyebrow', 'plan.title', 'plan.intro', 'plan.sendsText', 'plan.consent', 'plan.write', 'plan.writing',
  'plan.again', 'plan.otherLanguage', 'plan.aiLabel', 'plan.stepsTitle', 'plan.cautionsTitle', 'plan.fixedCaution',
  'plan.how', 'plan.howText', 'plan.howLimit', 'plan.errUnavailable', 'plan.errBusy', 'plan.errNoPlan', 'plan.errGeneric',
]
for (const key of USED_KEYS) {
  if (typeof STRINGS?.en?.[key] !== 'string') refuse(`${key} is not in the en dictionary, so there is no text to look for. Run node tools/keycheck.mjs.`)
}
if (JSON.stringify(SENT_FIELDS.map(([field]) => field)) !== JSON.stringify(Object.keys(FIELD_LABEL_KEYS))) {
  refuse('SENT_FIELDS and FIELD_LABEL_KEYS no longer list the same fields in the same order.')
}
// S23-S25 find the line the page is on by its words, so no two may read alike.
const LINES = ['talk.askOpen', ...QUESTIONS.map(([, key]) => key), 'talk.allDone']
if (new Set(LINES.map((key) => norm(en(key)))).size !== LINES.length) {
  refuse('two of the lines /talk asks read the same in English, so S23 could not tell which one is on screen.')
}

// --- what the typed sentence must turn into ----------------------------------
// The fake finds answers by keyword (talk_fake_backend.py), so this sentence is
// what decides the 12 answers. Rows come back in SENT_FIELDS order.
const SENTENCE =
  'I do tailoring in a village near Lucknow, Uttar Pradesh. I need 50000 to start. I earn 20000 a month. ' +
  'My costs are 5000 a month. I owe 30000 on a loan. I have 10000 saved. We spend 8000 at home. ' +
  'I pay 1500 EMI. My household earns 25000.'
const ROWS = {
  business_category: [(lang) => T(lang, 'cat.tailoring'), 'tailoring'],
  initial_investment: ['₹50,000', 'need 50000 to start'],
  expected_monthly_revenue: ['₹20,000', 'earn 20000 a month'],
  monthly_operating_expenses: ['₹5,000', 'costs are 5000 a month'],
  existing_debt: ['₹30,000', 'owe 30000 on a loan'],
  state: ['Uttar Pradesh', 'Uttar Pradesh'],
  district: ['Lucknow', 'Lucknow'],
  location_type: [(lang) => T(lang, 'area.rural'), 'village'],
  available_capital: ['₹10,000', 'have 10000 saved'],
  monthly_expenses: ['₹8,000', 'spend 8000 at home'],
  monthly_emi: ['₹1,500', 'pay 1500 EMI'],
  household_monthly_income: ['₹25,000', 'household earns 25000'],
}
const FIELD_ORDER = SENT_FIELDS.map(([field]) => field)
if (JSON.stringify(Object.keys(ROWS)) !== JSON.stringify(FIELD_ORDER)) {
  refuse('the 12 expected rows in talk-ui.mjs no longer match SENT_FIELDS; update ROWS.')
}
// What apply must leave in the application data. locationType and the district
// are not listed: the first is the default it already had, the second is
// unticked in S3.
const FILLED_PATHS = [
  'business.category', 'business.initialInvestment', 'business.monthlyRevenue',
  'business.monthlyOperatingExpenses', 'business.existingDebt', 'location.state',
  'finance.availableCapital', 'finance.monthlyExpenses', 'finance.monthlyEmi', 'finance.householdIncome',
]

// --- minimal CDP client, session-aware (as market-ui.mjs) -------------------
class CDP {
  constructor(url) {
    this.ws = new WebSocket(url)
    this.next = 1
    this.pending = new Map()
    this.pageErrors = []
    this.sessionId = null
    this.closed = false

    this.ready = new Promise((res, rej) => {
      this.ws.addEventListener('open', () => res())
      this.ws.addEventListener('error', () => rej(new Error('CDP socket error')))
      this.ws.addEventListener('close', () => rej(new Error('CDP socket closed')))
    })

    // Edge gone: every call still waiting for its reply fails now.
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
      const slot = this.pending.get(msg.id)
      if (!slot) return
      this.pending.delete(msg.id)
      if (msg.error) slot.reject(new Error(slot.method + ': ' + msg.error.message))
      else slot.resolve(msg.result)
    })
  }

  send(method, params = {}, useSession = true) {
    // A frame sent on a socket that is not open is dropped without an error.
    if (this.ws.readyState !== WebSocket.OPEN) return Promise.reject(new Error(method + ': CDP socket closed'))
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

function portInUse(port) {
  return new Promise((done) => {
    const probe = createServer()
    probe.once('error', (err) => done(err.code || err.message))
    probe.once('listening', () => probe.close(() => done(null)))
    probe.listen({ port, host: '127.0.0.1', exclusive: true })
  })
}

// --- the servers --------------------------------------------------------------
async function startFake() {
  const logFd = openSync(`${OUT}/fake_backend.log`, 'w')
  // Its own environment: a MODEL_API_KEY or ARTHNITI_* in the shell is never read.
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^(MODEL_API_KEY|ARTHNITI_)/i.test(k)))
  const child = spawn(PYTHON, ['tools/verify/talk_fake_backend.py', String(FAKE_PORT)], {
    cwd: resolve('.'), env, stdio: ['ignore', logFd, logFd],
  })
  children.push(child)
  closeSync(logFd)
  for (let i = 0; i < 120; i++) {
    if (child.exitCode !== null) throw new Error(`the fake backend exited with ${child.exitCode}; see ${OUT}/fake_backend.log`)
    try {
      const res = await fetch(`${API}/health`, { signal: AbortSignal.timeout(2000) })
      await res.arrayBuffer()
      if (res.ok) return
    } catch { /* not listening yet */ }
    await sleep(250)
  }
  throw new Error(`the fake backend never answered on ${API}`)
}

// The VITE_* values are given in the environment, which beats any .env file.
async function startVite(port, extra) {
  const logFd = openSync(`${OUT}/vite-${port}.log`, 'w')
  const vite = spawn(process.execPath, [VITE_BIN, '--port', String(port), '--strictPort', '--host', '127.0.0.1'], {
    cwd: resolve('frontend'),
    env: { ...process.env, VITE_API_BASE_URL: API, ...extra },
    stdio: ['ignore', logFd, logFd],
  })
  children.push(vite)
  closeSync(logFd)
  for (let i = 0; i < 120; i++) {
    if (vite.exitCode !== null) throw new Error(`Vite exited with ${vite.exitCode}; see ${OUT}/vite-${port}.log`)
    try {
      const res = await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(2000) })
      await res.arrayBuffer()
      if (res.ok) return
    } catch { /* not listening yet */ }
    await sleep(250)
  }
  throw new Error(`Vite never answered on port ${port}`)
}

// --- page side ----------------------------------------------------------------
// Serialised with toString() and installed before the app's own scripts on every
// navigation. (Written as a function, not a template string: a template literal
// would eat the backslashes in its regular expressions.)
function pageLibrary() {
  // getUserMedia, wrapped. 'real' passes through to the fake device and remembers
  // the stream; 'deny' and 'none' fail the way a browser does; 'defer' holds the
  // question open, as a browser does while the permission prompt is up, until the
  // probe calls grant() or refuse().
  const gum = { calls: 0, mode: 'real', streams: [], pending: [] }
  window.__gum = gum
  const devices = navigator.mediaDevices
  const real = devices && devices.getUserMedia ? devices.getUserMedia.bind(devices) : null
  if (real) {
    devices.getUserMedia = (constraints) => {
      gum.calls += 1
      if (gum.mode === 'deny') return Promise.reject(new DOMException('Permission denied', 'NotAllowedError'))
      if (gum.mode === 'none') return Promise.reject(new DOMException('Requested device not found', 'NotFoundError'))
      if (gum.mode === 'defer') return new Promise((resolve, reject) => { gum.pending.push({ constraints, resolve, reject }) })
      return real(constraints).then((stream) => { gum.streams.push(stream); return stream })
    }
  }
  gum.grant = async () => {
    const entry = gum.pending.shift()
    if (!entry) throw new Error('no getUserMedia call is waiting')
    const stream = await real(entry.constraints)
    gum.streams.push(stream)
    entry.resolve(stream)
  }
  gum.refuse = (name) => {
    const entry = gum.pending.shift()
    if (!entry) throw new Error('no getUserMedia call is waiting')
    entry.reject(new DOMException('Permission denied', name))
  }
  // The readyState of every audio track the page was ever given.
  gum.tracks = () => gum.streams.flatMap((stream) => stream.getTracks().map((track) => track.readyState))

  window.__t = {
    norm: (s) => String(s == null ? '' : s).replace(/[→🎤]/gu, '').replace(/\s+/g, ' ').trim(),
    // A React-controlled field only hears the native setter plus an input event.
    type(el, value) {
      const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value)
      el.dispatchEvent(new Event('input', { bubbles: true }))
    },
    choose(el, value) {
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(el, value)
      el.dispatchEvent(new Event('change', { bubbles: true }))
    },
    // `partial` for a button whose text carries a picture before the words
    // (the category buttons), where the words are all that is known.
    button(label, partial = false) {
      return [...document.querySelectorAll('#main button')].find((b) => {
        const text = this.norm(b.innerText)
        return partial ? text.includes(label) : text === label
      })
    },
    // A Button given a `to` is an <a>, not a <button>: "use the form instead" and the
    // Continue of the finished page are links, which button() cannot see.
    link(label) {
      return [...document.querySelectorAll('#main a')].find((a) => this.norm(a.innerText) === label)
    },
  }
}

// The browser's speech engine, as /talk's spoken question meets it. Runs in the page
// before the app's scripts, like pageLibrary. With nothing in sessionStorage under
// 'talk-ui-speech' it HIDES the engine, so a scenario that did not ask for one has no
// speaker button on screen (a real Edge may list voices, and every question would
// then be read aloud and wear a second "Stop" next to Record's). With a config,
// {"voices": [{"name", "lang", "local"}], "delay": 0}, it installs a fake that keeps
// what it was asked to say. The page can be steered through window.__speech:
//   state()           what was spoken, how often the engine was cancelled, who is speaking
//   finish()          the engine has read the line out: the utterance's onend
//   setVoices(list)   the browser lists its voices late: voiceschanged
// `delay` is how long after a cancel the cancelled line reports its error, as a real
// engine does a moment late; the page must not take it for the new line failing.
// `listed: "early"` is an engine whose list is ready the moment the page first asks and
// which announces it in the same breath, before the page has started to listen: the first
// getVoices() returns an empty list, then the list and the voiceschanged event follow in
// the next microtask, ahead of the page's effects. state().announcedTo is how many
// listeners heard it (none, by design: that is the gap).
function speechFake() {
  let config = null
  try { config = JSON.parse(sessionStorage.getItem('talk-ui-speech') || 'null') } catch { config = null }
  if (!config) {
    Object.defineProperty(window, 'speechSynthesis', { value: undefined, configurable: true })
    window.SpeechSynthesisUtterance = undefined
    return
  }
  const make = (v) => ({ name: v.name, lang: v.lang, localService: v.local === true, default: false, voiceURI: v.name })
  const listed = config.voices.map(make)
  const early = config.listed === 'early'
  let voices = early ? [] : listed
  let asked = false
  let announcedTo = null
  const said = []
  const queue = []
  const listeners = new Set()
  let cancels = 0
  class Utterance {
    constructor(text) { this.text = text; this.voice = null; this.lang = ''; this.onend = null; this.onerror = null }
  }
  const synth = {
    get speaking() { return queue.length > 0 },
    get pending() { return queue.length > 1 },
    getVoices: () => {
      if (early && !asked) {
        asked = true
        queueMicrotask(() => {
          voices = listed
          announcedTo = listeners.size
          listeners.forEach((fn) => fn(new Event('voiceschanged')))
        })
      }
      return voices
    },
    speak(u) { said.push({ text: u.text, lang: u.lang, voice: u.voice ? u.voice.name : null }); queue.push(u) },
    cancel() {
      cancels += 1
      const dropped = queue.splice(0)
      setTimeout(() => dropped.forEach((u) => u.onerror && u.onerror({ error: 'canceled' })), config.delay || 0)
    },
    addEventListener(type, fn) { if (type === 'voiceschanged') listeners.add(fn) },
    removeEventListener(type, fn) { listeners.delete(fn) },
  }
  window.__speech = {
    state: () => ({ said: said.map((x) => ({ ...x })), cancels, speaking: queue.length > 0, voices: voices.map((v) => v.name), announcedTo }),
    finish() {
      const u = queue.shift()
      if (u && u.onend) u.onend({})
      return Boolean(u)
    },
    setVoices(list) {
      voices = list.map(make)
      listeners.forEach((fn) => fn(new Event('voiceschanged')))
    },
  }
  Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true })
  window.SpeechSynthesisUtterance = Utterance
}

// What the page shows, as plain data. Runs in the page.
function snapshot() {
  const norm = window.__t.norm
  const q = (selector) => document.querySelector(selector)
  const main = q('#main')
  const box = (el) => (el ? { checked: el.checked, disabled: el.disabled, invalid: el.getAttribute('aria-invalid'), describedby: el.getAttribute('aria-describedby') } : null)
  const language = q('#talk-language')
  const area = q('#talk-text')
  const h1 = q('#main h1')
  // The review's title is the one h2 of a form section that takes focus; on the home page the
  // question is an h2 as well (/talk has it as an h3).
  const reviewHead = q('#main h2.ui-formsection-title[tabindex="-1"]')
  const section = reviewHead ? reviewHead.closest('.ui-formsection') : null
  const active = document.activeElement
  const gum = window.__gum
  const each = (selector) => (main ? [...main.querySelectorAll(selector)] : [])
  const heading = q('#main h3[tabindex="-1"], #main h2[tabindex="-1"]:not(.ui-formsection-title)')
  const above = heading ? heading.previousElementSibling : null
  // The home page's microphone: its look, and where it stands on the screen.
  const micEl = q('#main .ui-mic')
  const micBox = micEl ? micEl.getBoundingClientRect() : null
  return {
    path: location.pathname,
    h1: h1 ? norm(h1.innerText) : '',
    mainText: main ? norm(main.innerText) : '',
    consent: box(q('#talk-consent')),
    age: box(q('#talk-age')),
    language: language ? { value: language.value, disabled: language.disabled } : null,
    text: area ? area.value : null,
    buttons: each('button').map((b) => ({ text: norm(b.innerText), disabled: b.disabled })),
    alerts: each('[role=alert]').map((el) => ({ id: el.id, text: norm(el.innerText) })),
    statuses: each('[role=status]').map((el) => norm(el.innerText)).filter(Boolean),
    notices: each('.ui-notice').map((el) => norm(el.innerText)),
    review: section
      ? {
          title: norm(reviewHead.innerText),
          focused: active === reviewHead,
          rows: [...section.querySelectorAll('ul > li')].map((li) => {
            const tick = li.querySelector('input[type=checkbox]')
            return { checked: tick ? tick.checked : null, spans: [...li.querySelectorAll('span.block')].map((el) => norm(el.innerText)) }
          }),
          buttons: [...section.querySelectorAll('button')].map((b) => ({ text: norm(b.innerText), disabled: b.disabled })),
        }
      : null,
    // The question the page is asking: its words, whether it has focus, and the
    // "Question n of N" line above it (there is none on the open turn or when all are done).
    question: heading
      ? { heading: norm(heading.innerText), focused: active === heading, progress: above && above.tagName === 'P' ? norm(above.innerText) : '' }
      : null,
    links: each('a').map((a) => ({ text: norm(a.innerText), href: a.getAttribute('href') })),
    mic: micEl
      ? {
          recording: micEl.hasAttribute('data-recording'),
          disabled: micEl.disabled,
          level: parseFloat(micEl.style.getPropertyValue('--level')) || 0,
          bottom: Math.round(micBox.bottom),
          viewport: window.innerHeight,
        }
      : null,
    // Keyframe animations running on the page (a transition is not one), each as name:properties it
    // moves. None at rest; the two the page may run are the ring and the spinner (S28).
    loops: document.getAnimations()
      .filter((a) => a instanceof CSSAnimation && a.playState === 'running')
      .map((a) => `${a.animationName}:${[...new Set(a.effect.getKeyframes().flatMap((k) => Object.keys(k)))].filter((p) => !['offset', 'computedOffset', 'easing', 'composite'].includes(p)).sort()}`),
    speech: window.__speech ? window.__speech.state() : null,
    focus: active ? (active.id || active.tagName.toLowerCase()) : '',
    tracks: gum ? gum.tracks() : [],
    gumCalls: gum ? gum.calls : 0,
    pending: gum ? gum.pending.length : 0,
  }
}

// Leaked dictionary keys, unfilled placeholders and stringified nothing. `prefixes`
// are the first parts of the keys to look for; without them, the /talk page's. (Call
// it with no argument or with a real list: inPage turns an undefined one into null.)
function leakScan(prefixes) {
  const text = document.body.innerText
  const found = []
  const keys = (prefixes || ['talk', 'nav', 'common', 'cat', 'area', 'notice', 'consent', 'errf']).join('|')
  const patterns = [
    ['dictionary key', new RegExp('(?:^|[\\s(])(?:' + keys + ')\\.[a-zA-Z]\\w*', 'g')],
    ['placeholder', /\{[a-zA-Z]+\}/g],
    ['stringified nothing', /\[object Object\]|\bundefined\b|\bNaN\b|\bnull%/g],
  ]
  for (const [name, re] of patterns) {
    for (const match of text.matchAll(re)) found.push(name + ': ' + match[0].trim())
  }
  return found
}

// Every state the page passes through from now until it sends a recording. A
// MutationObserver hears each change of the DOM as it happens, which polling from
// outside cannot promise for a moment this short. `at` orders the states and the
// request on one clock; fetchAt is the transcribe request leaving the page.
function stopProbe(recordLabel, stopLabel) {
  const probe = { states: [], fetchAt: null, at: 0 }
  window.__stop = probe
  const state = () => {
    const consent = document.querySelector('#talk-consent')
    const record = window.__t.button(recordLabel)
    return {
      at: ++probe.at,
      consentDisabled: consent ? consent.disabled : null,
      recordDisabled: record ? record.disabled : null,
      stopShown: Boolean(window.__t.button(stopLabel)),
    }
  }
  new MutationObserver(() => probe.states.push(state())).observe(document.body, {
    subtree: true, childList: true, attributes: true, attributeFilter: ['disabled'],
  })
  const realFetch = window.fetch
  window.fetch = function (input, init) {
    const url = String(input && input.url ? input.url : input)
    if (url.includes('/api/intake/transcribe') && probe.fetchAt === null) probe.fetchAt = ++probe.at
    return realFetch.call(this, input, init)
  }
}

// 360 px phone: what is off-screen, too small to tap, or too small to read. Of the
// element at `rootSelector`, or of the `ancestor` that contains it; a root that is
// not there throws, so a page with nothing to measure is a fault and never a pass.
function mobileProbe(rootSelector = '#main', ancestor = '') {
  let main = document.querySelector(rootSelector)
  if (main && ancestor) main = main.closest(ancestor)
  if (!main) throw new Error('mobileProbe: nothing at ' + rootSelector + (ancestor ? ' inside a ' + ancestor : ''))
  const vw = document.documentElement.clientWidth
  const describe = (el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + ' "' + String(el.innerText || el.name || '').replace(/\s+/g, ' ').trim().slice(0, 28) + '"'
  const out = { vw, scrollWidth: document.documentElement.scrollWidth, measured: main.querySelectorAll('*').length, overflow: [], taps: [], small: [] }
  for (const el of main.querySelectorAll('*')) {
    if (el.closest('.sr-only')) continue
    const rect = el.getBoundingClientRect()
    if (rect.width === 0 && rect.height === 0) continue
    if (rect.right > vw + 1) out.overflow.push(describe(el) + ' right=' + Math.round(rect.right))
    const ownText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
    if (ownText && parseFloat(getComputedStyle(el).fontSize) < 12) out.small.push(describe(el))
  }
  for (const el of main.querySelectorAll('button, a, select, input, textarea, summary')) {
    if (el.closest('.sr-only')) continue
    if (el.tagName === 'A' && el.closest('p, li')) continue
    // A checkbox is tapped through its label.
    const target = el.type === 'checkbox' ? el.closest('label') || el : el
    const rect = target.getBoundingClientRect()
    if (rect.width === 0 && rect.height === 0) continue
    if (rect.width < 43.5 || rect.height < 43.5) out.taps.push(describe(el) + ' ' + Math.round(rect.width) + 'x' + Math.round(rect.height))
  }
  return out
}

// Every request the page makes from now on, as the page makes it, with the answer that
// came back. The fake logs only what reaches the model, and a request the page should
// not have made is the thing to catch, so the page's own fetch is watched. A full
// navigation takes it away: install it after the last load. `status` is 'rejected' for a
// request the page abandoned or lost.
function planProbe() {
  const probe = { requests: [], at: 0, failNext: null }
  window.__plan = probe
  const realFetch = window.fetch
  window.fetch = function (input, init) {
    const url = String(input && input.url ? input.url : input)
    const entry = {
      url,
      method: (init && init.method) || 'GET',
      contentType: init && init.headers ? new Headers(init.headers).get('content-type') : null,
      body: init && typeof init.body === 'string' ? init.body : null,
      sent: ++probe.at,
      done: null,
      status: null,
      reply: null,
    }
    probe.requests.push(entry)
    // planFailure() asked for the next plan request to be answered from in here.
    const failure = url.includes('/api/advisor/plan') ? probe.failNext : null
    if (failure) probe.failNext = null
    const answer = !failure ? realFetch.call(this, input, init)
      : failure.how === 'reject' ? Promise.reject(new TypeError('Failed to fetch'))
        : Promise.resolve(new Response(failure.body, { status: failure.status, headers: { 'content-type': 'application/json' } }))
    return answer.then(
      (response) => {
        entry.status = response.status
        // Read from a copy, so the app still gets its own.
        response.clone().text().then((text) => { entry.reply = text; entry.done = ++probe.at })
        return response
      },
      (error) => {
        entry.status = 'rejected'
        entry.done = ++probe.at
        throw error
      },
    )
  }
}

// The next request to the plan route is answered from inside the page, the way a proxy
// or a dropped connection would answer it, and never leaves the page (the probe still
// records it). `how` is 'reject' or 'reply' (with a status and a body). It is used once.
function planFailure(how, status, body) {
  window.__plan.failNext = { how, status, body }
}

// The plan card on /advisory, as plain data. Runs in the page. `card` is null when the
// page has no such card. A line of the plan is the one element that carries `lang`: its
// bold runs are what the fixed rules filled in, its plain runs are the AI's own words.
function planSnapshot() {
  const norm = window.__t.norm
  const main = document.querySelector('#main')
  const box = document.querySelector('#plan-consent')
  const card = box ? box.closest('section') : null
  const active = document.activeElement
  const heading = card ? card.querySelector('h2') : null
  const texts = (selector) => [...card.querySelectorAll(selector)].map((el) => norm(el.innerText))
  const line = (el) => ({
    lang: el.getAttribute('lang'),
    text: norm(el.innerText),
    fills: [...el.querySelectorAll(':scope > strong')].map((x) => norm(x.innerText)),
    plain: [...el.querySelectorAll(':scope > span')].map((x) => norm(x.innerText)),
  })
  const details = card ? card.querySelector('details') : null
  const summary = card ? card.querySelector(':scope > p > span[lang]') : null
  return {
    path: location.pathname,
    h1: main && main.querySelector('h1') ? norm(main.querySelector('h1').innerText) : '',
    headings: main ? [...main.querySelectorAll('h2')].map((el) => norm(el.innerText)) : [],
    card: card && {
      eyebrow: texts(':scope > p.ui-eyebrow')[0] ?? null,
      title: norm(heading.innerText),
      titleFocused: active === heading,
      focus: active ? (active.id || active.tagName.toLowerCase()) : '',
      paragraphs: texts(':scope > p'),
      asks: texts(':scope > div > p'),
      h3: texts('h3'),
      consent: {
        checked: box.checked,
        disabled: box.disabled,
        required: box.getAttribute('aria-required'),
        invalid: box.getAttribute('aria-invalid'),
        describedby: box.getAttribute('aria-describedby'),
        label: norm(box.closest('label').innerText),
      },
      alerts: [...card.querySelectorAll('[role=alert]')].map((el) => ({ id: el.id, text: norm(el.innerText) })),
      statusElements: card.querySelectorAll('[role=status]').length,
      status: texts('[role=status]').join(' '),
      buttons: [...card.querySelectorAll('button')].map((b) => ({ text: norm(b.innerText), disabled: b.disabled })),
      summary: summary ? line(summary) : null,
      steps: [...card.querySelectorAll('ol > li span[lang]')].map(line),
      cautions: [...card.querySelectorAll('ul > li span[lang]')].map(line),
      how: details
        ? { title: norm(details.querySelector('summary').innerText), open: details.open, text: [...details.querySelectorAll('p')].map((el) => norm(el.textContent)) }
        : null,
    },
  }
}

// --- the checks ---------------------------------------------------------------
const results = []
let current = null
let cdp = null

function expect(name, ok, detail = '') {
  const shown = typeof detail === 'string' ? detail : JSON.stringify(detail)
  current.checks.push({ name, ok: Boolean(ok), detail: ok ? '' : shown })
  if (!ok) console.log(`  FAIL ${current.id}: ${name}${shown ? ' :: ' + shown : ''}`)
}

async function run(id, title, fn) {
  if (ONLY.length > 0 && !ONLY.includes(id)) return
  current = { id, title, checks: [], fault: null }
  results.push(current)
  console.log(`${id} ${title}`)
  const errorsBefore = cdp.pageErrors.length
  try {
    await fn()
  } catch (err) {
    if (cdp.closed) throw err
    if (!(err instanceof Halt)) {
      current.fault = String(err.message || err)
      console.log(`  FAULT ${id}: ${current.fault}`)
      return
    }
  }
  const fresh = cdp.pageErrors.slice(errorsBefore)
  expect('no uncaught error in the page', fresh.length === 0, fresh.join(' | '))
}

const inPage = (fn, ...args) => cdp.evaluate(`(${fn.toString()})(...${JSON.stringify(args)})`)
const snap = () => inPage(snapshot)
const has = (selector) => inPage((s) => Boolean(document.querySelector(s)), selector)
const buttonOf = (s, label) => s.buttons.find((b) => b.text === norm(label))
const alertText = (s, id = '') => s.alerts.find((a) => a.id === id)?.text
const isBusy = (s, lang = 'en') => s.statuses.some((x) => x === norm(T(lang, 'talk.finding')) || x === norm(T(lang, 'talk.listening')))
const allEnded = (s) => s.tracks.length > 0 && s.tracks.every((x) => x === 'ended')
const sameSet = (a, b) => a.length === b.length && new Set(a).size === a.length && b.every((x) => a.includes(x))

// `read` is what is looked at: the /talk page by default, the plan card where a
// scenario passes its own reader.
async function waitSnap(what, ms, predicate, read = snap) {
  const end = Date.now() + ms
  let s
  for (;;) {
    s = await read()
    if (predicate(s)) return s
    if (Date.now() > end) throw new Fault(`never reached: ${what}; last state ${JSON.stringify(s).slice(0, 700)}`)
    await sleep(60)
  }
}

// For a state the page under test must reach on its own, such as an error it owes
// the reader. If it never gets there that is a finding, which the expect() that
// follows records. waitSnap would call it a fault in the instrument and exit 2.
async function settleSnap(ms, predicate, read = snap) {
  const end = Date.now() + ms
  for (;;) {
    const s = await read()
    if (predicate(s) || Date.now() > end) return s
    await sleep(60)
  }
}

// A step of a walk where the page owes the reader a state. If it never comes that is a
// finding, recorded here, and the walk stops: the steps after it need that state.
// waitSnap is for what the instrument owes, and says it could not measure.
async function reach(what, ms, predicate, read = snap) {
  const s = await settleSnap(ms, predicate, read)
  const ok = predicate(s)
  expect(`reaches ${what}`, ok, ok ? '' : JSON.stringify(s).slice(0, 700))
  if (!ok) throw new Halt(what)
  return s
}

const tryPress = (label, partial = false) => inPage((want, loose) => {
  const b = window.__t.button(want, loose)
  if (!b) return 'absent'
  const disabled = b.disabled
  b.click()
  return disabled ? 'disabled' : 'clicked'
}, norm(label), partial)

async function press(label, partial = false) {
  const state = await tryPress(label, partial)
  if (state === 'absent') throw new Fault(`there is no button "${norm(label)}" on ${(await snap()).path}`)
  return state
}
// press() for a button the page owes the reader at this point: absent is a finding.
async function pressOwed(label) {
  const state = await tryPress(label)
  expect(`has the button "${norm(label)}"`, state !== 'absent', state === 'absent' ? (await snap()).buttons : '')
  if (state === 'absent') throw new Halt(label)
  return state
}
// A Button with a `to` is a link (see window.__t.link), so press() cannot find it.
async function pressLink(label) {
  const state = await inPage((want) => {
    const a = window.__t.link(want)
    if (!a) return 'absent'
    a.click()
    return 'clicked'
  }, norm(label))
  if (state === 'absent') throw new Fault(`there is no link "${norm(label)}" on ${(await snap()).path}`)
}
async function tick(selector, want = true) {
  const state = await inPage((sel, wanted) => {
    const el = document.querySelector(sel)
    if (!el) return 'absent'
    if (el.checked !== wanted) el.click()
    return el.checked === wanted
  }, selector, want)
  if (state === 'absent') throw new Fault(`there is nothing at ${selector} to tick`)
  if (state !== true) throw new Fault(`${selector} would not ${want ? 'tick' : 'untick'}`)
}
async function type(selector, value) {
  const ok = await inPage((sel, v) => {
    const el = document.querySelector(sel)
    if (!el) return false
    window.__t.type(el, v)
    return true
  }, selector, value)
  if (!ok) throw new Fault(`there is nothing at ${selector} to type into`)
}
async function choose(selector, value) {
  const ok = await inPage((sel, v) => {
    const el = document.querySelector(sel)
    if (!el) return false
    window.__t.choose(el, v)
    return true
  }, selector, value)
  if (!ok) throw new Fault(`there is nothing at ${selector} to choose from`)
}

const fake = {
  async set(body) {
    const res = await fetch(API + '/__fake', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(5000),
    })
    await res.arrayBuffer()
    if (!res.ok) throw new Fault(`the fake backend refused ${JSON.stringify(body)}`)
  },
  reset: () => fake.set({ reset: true }),
  async calls() {
    const res = await fetch(API + '/__fake', { signal: AbortSignal.timeout(5000) })
    return res.json()
  },
}

async function waitForRender() {
  for (let i = 0; i < 75; i++) {
    const len = await cdp.evaluate(`document.querySelector('#main')?.innerText?.trim().length || 0`)
      .catch((err) => { if (cdp.closed) throw err; return 0 })
    if (len > 40) return true
    await sleep(200)
  }
  return false
}
async function navigate(url) {
  const { errorText } = await cdp.send('Page.navigate', { url })
  if (errorText) throw new Error(`${url} did not load (${errorText}); is the app still being served?`)
}

// A fresh visit: the fake forgotten, this language, nothing stored. `keep` goes
// straight to the route and leaves the tab's storage as the last page left it.
// `speech` is a config for speechFake: without one the page has no speech engine,
// and a visit that keeps the tab's storage keeps whatever the last fresh visit chose.
async function open(base, route, { lang = 'en', keep = false, speech = null } = {}) {
  if (!keep) {
    await fake.reset()
    await navigate(base + '/')
    if (!(await waitForRender())) throw new Fault(`${base}/ never rendered`)
    await cdp.evaluate(`(() => {
      localStorage.setItem('sih-language', ${JSON.stringify(lang)})
      localStorage.removeItem('sih-dialect')
      localStorage.setItem('sih-theme', 'light')
      localStorage.setItem('sih-textsize', 'md')
      localStorage.setItem('sih-detail', 'detailed')
      sessionStorage.removeItem(${JSON.stringify(STORAGE_KEY)})
      sessionStorage.removeItem('talk-ui-speech')
      ${speech ? `sessionStorage.setItem('talk-ui-speech', ${JSON.stringify(JSON.stringify(speech))})` : ''}
      return true
    })()`)
  }
  await navigate(base + route)
  if (!(await waitForRender())) throw new Fault(`${base}${route} never rendered`)
}

const stored = () => inPage((key) => {
  const raw = sessionStorage.getItem(key)
  return raw ? JSON.parse(raw) : null
}, STORAGE_KEY)

// Press Find and wait until the request is over. Waits on the backend having been
// asked and the busy line being gone, so a stale error from the last try is not
// mistaken for this one.
async function find(lang = 'en') {
  const before = (await fake.calls()).length
  const state = await press(T(lang, 'talk.find'))
  if (state !== 'clicked') throw new Fault(`the Find button was ${state}`)
  for (let i = 0; i < 150 && (await fake.calls()).length <= before; i++) await sleep(60)
  return waitSnap('the request to finish', 15000, (s) => !isBusy(s, lang))
}

async function startRecording() {
  const state = await press(en('talk.record'))
  if (state !== 'clicked') throw new Fault(`the Record button was ${state}`)
  return waitSnap('recording to start (a Stop button)', 8000, (s) => Boolean(buttonOf(s, en('talk.stop'))))
}
async function recordFor(ms) {
  await startRecording()
  await sleep(ms)
  await press(en('talk.stop'))
}

// --- the plan card: what S16-S22 share ----------------------------------------
// The card is reached by walking the four real pages, so the request it sends is the
// one a reader's answers make and not one this file builds. JOURNEY is what is typed;
// PLAN_REQUEST is the 12 fields FinancePage must make of it. The village is typed too:
// it is local to the tab and must never reach the model.
const JOURNEY = {
  businessName: 'Rahul Tailors', initialInvestment: '50000', monthlyRevenue: '20000',
  monthlyOperatingExpenses: '5000', existingDebt: '30000', village: 'Chinhat',
  availableCapital: '10000', monthlyExpenses: '8000', monthlyEmi: '1500', householdIncome: '25000',
}
const PLAN_REQUEST = {
  business_category: 'tailoring', state: 'Uttar Pradesh', district: 'Lucknow',
  available_capital: 10000, monthly_expenses: 8000, expected_monthly_revenue: 20000, monthly_emi: 1500,
  household_monthly_income: 25000, initial_investment: 50000, monthly_operating_expenses: 5000,
  existing_debt: 30000, location_type: 'rural',
}
const PLAN_URL = API + '/api/advisor/plan'
const PLAN_PREFIXES = ['plan', 'fo', 'ad', 'talk', 'nav', 'common', 'cat', 'area', 'notice', 'consent', 'errf']
// A plan the route must refuse: it has a number of its own. The rest is the English plan
// the fake returns by default (backend/tests/plan_fixtures.py), so the digit is the only
// thing wrong with it (pytest's verify_plan refuses it for "digit" and nothing else).
const DIGIT_PLAN = {
  summary: 'Your business earns {{profit}} each month after costs, but you still need {{gap}} to start it, for 3 months.',
  steps: [
    'Think about a loan of {{loan}} over {{tenure}} months, with a monthly repayment of {{repayment}}.',
    'Ask the nearest office about {{scheme_a}} before you borrow.',
    'Keep a written record of what you earn and spend each month.',
  ],
  cautions: ['These figures are estimates, so check them with a lender before you decide.'],
}

const ownName = (code) => LANGUAGES.find((l) => l.code === code).endonym
const rupees = (n) => (n < 0 ? '-' : '') + '₹' + Math.abs(n).toLocaleString('en-IN')
// JSON with the keys in order, so two objects can be compared as text.
const canon = (value) => JSON.stringify(value, (key, v) =>
  (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : 1))) : v))
const pathNow = () => inPage(() => location.pathname)

// A line of the plan as the route sent it, in the form planSnapshot reports it.
const lineOf = (parts) => ({
  text: norm(parts.map((p) => p.v).join('')),
  fills: parts.filter((p) => p.t === 'fill').map((p) => norm(p.v)),
  plain: parts.filter((p) => p.t === 'text').map((p) => norm(p.v)),
})
const linesOf = (reply) => [reply.summary, ...reply.steps, ...reply.cautions]
// Whether the card shows the plan the route sent: every line, in order, in the plan's
// language, bold where the rules filled a figure in and plain where the AI wrote.
const showsPlan = (card, reply) => {
  const shown = [card.summary, ...card.steps, ...card.cautions]
  const sent = linesOf(reply).map(lineOf)
  return shown.length === sent.length
    && shown.every((line, i) => line && line.lang === reply.language && canon({ text: line.text, fills: line.fills, plain: line.plain }) === canon(sent[i]))
}
// The figures of each line, in no particular order: the word order of another language
// moves a blank around inside its line but not out of it.
const fillSets = (reply) => linesOf(reply).map((parts) => lineOf(parts).fills.sort())

// The page's own heading. The address changes first and the page follows, so a client-side
// move is over when the heading is another one, not when the address is (and not when
// #main has text, which the page being left also has: waitForRender cannot tell).
const h1Now = () => inPage(() => window.__t.norm(document.querySelector('#main h1')?.innerText ?? ''))

// Press a button that moves to another page, and wait until it has.
async function submitTo(label, path) {
  const left = await h1Now()
  const state = await press(label)
  if (state !== 'clicked') throw new Fault(`the button "${norm(label)}" was ${state}`)
  const end = Date.now() + 10000
  while ((await pathNow()) !== path || (await h1Now()) === left) {
    if (Date.now() > end) {
      const said = await inPage(() => [...document.querySelectorAll('#main [role=alert]')].map((el) => el.innerText))
      throw new Fault(`"${norm(label)}" did not reach ${path}; the page is ${await pathNow()} and says ${JSON.stringify(said)}`)
    }
    await sleep(60)
  }
}

// The real four forms, from /business to a result on /analysis.
async function journey(base = ON) {
  await open(base, '/business')
  await type('input[name="businessName"]', JOURNEY.businessName)
  await press(en('cat.tailoring'), true)
  await type('input[name="initialInvestment"]', JOURNEY.initialInvestment)
  await type('input[name="monthlyRevenue"]', JOURNEY.monthlyRevenue)
  await type('input[name="monthlyOperatingExpenses"]', JOURNEY.monthlyOperatingExpenses)
  await type('input[name="existingDebt"]', JOURNEY.existingDebt)
  await submitTo(en('business.submit'), '/location')
  await choose('select[name="state"]', 'Uttar Pradesh')
  await waitSnap('the districts of the state', 4000, Boolean, () => has('select[name="district"] option[value="Lucknow"]'))
  await choose('select[name="district"]', 'Lucknow')
  await type('input[name="village"]', JOURNEY.village)
  await submitTo(en('location.submit'), '/finance')
  await type('input[name="availableCapital"]', JOURNEY.availableCapital)
  await type('input[name="monthlyExpenses"]', JOURNEY.monthlyExpenses)
  await type('input[name="monthlyEmi"]', JOURNEY.monthlyEmi)
  await type('input[name="householdIncome"]', JOURNEY.householdIncome)
  await tick('#consent-notice')
  await submitTo(en('finance.submit'), '/analysis')
  if (!(await stored())?.data?.result) throw new Fault('the journey ended on /analysis with no result stored')
}

// Client-side, by the first link there is: the page is left as it is, so the probes
// installed in it are not lost.
async function toAdvisory() {
  const found = await inPage(() => {
    const link = document.querySelector('#main a[href="/advisory"]') ?? document.querySelector('a[href="/advisory"]')
    if (link) link.click()
    return Boolean(link)
  })
  if (!found) throw new Fault(`there is no link to /advisory on ${await pathNow()}`)
  await waitSnap('the page /advisory', 8000, (h1) => h1 === norm(en('ad.title')), h1Now)
}

async function startOnAdvisory(base = ON) {
  await journey(base)
  await toAdvisory()
  await inPage(planProbe)
}

const planSnap = () => inPage(planSnapshot)
const planRequests = () => inPage(() => window.__plan.requests)
const planView = async () => ({ ...(await planSnap()), requests: await planRequests() })

// Press the card's button and wait until the request is over and the card is idle again.
async function writePlan(label) {
  const before = (await planRequests()).length
  const state = await press(label)
  if (state !== 'clicked') throw new Fault(`the plan button "${norm(label)}" was ${state}`)
  return waitSnap('the plan request to end', 30000,
    (v) => v.requests.length > before && v.requests.at(-1).done !== null && v.card?.status === '', planView)
}

// The language picker in the utility bar: the one select with a Malayalam option.
const chooseLanguage = (code) => choose('select:has(option[value="ml"])', code)

// The i-th question in the form's order (0 is the kind of business) as the page words it,
// and the "Question n of N" line over it.
const ask = (i) => norm(en(QUESTIONS[i][1]))
const progressOf = (n) => norm(en('talk.progress', { n, total: QUESTIONS.length }))
// The voices S24 and S25 give the page. An online Hindi one: the question may use it (it
// is the page's own wording, although a result's read-aloud may not) but only when the
// reader presses Listen. A Hindi one on the device may also start by itself.
const NET_HINDI = { voices: [{ name: 'Net Hindi', lang: 'hi-IN', local: false }], delay: 400 }
const DEVICE_HINDI = { voices: [{ name: 'Device Hindi', lang: 'hi-IN', local: true }], delay: 400 }
// The landing page's buttons in the order they stand: where each leads, and whether it
// has the filled (main) look. Run in the page, so it must stand alone.
const heroButtons = () => [...document.querySelectorAll('.ui-hero a')].map((a) => ({
  href: a.getAttribute('href'),
  main: a.className.includes('bg-[var(--color-btn)]'),
}))
// The voice home's microphone is pressed by its own class and not by its label: with a speech
// engine on the page the question's speaker button reads "Stop" as well.
const pressMic = () => inPage(() => {
  const b = document.querySelector('#main .ui-mic')
  if (!b) return 'absent'
  const disabled = b.disabled
  b.click()
  return disabled ? 'disabled' : 'clicked'
})
// The highest the microphone's ring got in `ms`: the fake microphone beeps now and then, so a
// single reading is often a lull.
async function levelPeak(ms) {
  let peak = 0
  for (const end = Date.now() + ms; Date.now() < end; await sleep(80)) {
    peak = Math.max(peak, await inPage(() => parseFloat(document.querySelector('#main .ui-mic')?.style.getPropertyValue('--level')) || 0))
  }
  return peak
}
const HOME_PREFIXES = ['talk', 'nav', 'common', 'cat', 'area', 'notice', 'consent', 'errf', 'landing', 'greeting', 'ra']

// --- the scenarios ------------------------------------------------------------
async function s0() {
  await open(OFF, '/')
  expect('the landing page has no link to /talk', !(await has('a[href="/talk"]')))
  expect('(sanity) the landing page links to /profile', await has('a[href="/profile"]'))
  const hero = await inPage(heroButtons)
  expect('the first button of the landing page leads to the form, in the main look', hero[0]?.href === '/profile' && hero[0].main === true, hero)
  await open(OFF, '/profile', { keep: true })
  expect('the profile page has no link to /talk', !(await has('a[href="/talk"]')))
  expect('(sanity) the profile page has its form', await has('#main input'))
  await open(OFF, '/talk', { keep: true })
  const s = await snap()
  expect('/talk is the not-found page', s.h1 === norm(en('nf.title')), s.h1)
  expect('/talk has no text box', !(await has('#talk-text')))
}

async function s1() {
  await open(ON, '/profile')
  expect('the profile page links to /talk', await has('a[href="/talk"]'))
  await open(ON, '/talk', { keep: true })
  const s = await snap()
  expect('the title', s.h1 === norm(en('talk.title')), s.h1)
  expect('it opens by asking the open question, with no number on it', s.question?.heading === norm(en('talk.askOpen')) && s.question.progress === '', s.question)
  expect('"use the form instead" leads to the form', s.links.some((l) => l.text === norm(en('talk.toForm')) && l.href === '/profile'), s.links)
  expect('Skip is offered', buttonOf(s, en('talk.skip'))?.disabled === false)
  expect('with no speech engine the question is text only', !buttonOf(s, en('ra.listen')) && !buttonOf(s, en('ra.stop')), s.buttons)
  expect('the consent box starts unticked', s.consent?.checked === false, s.consent)
  expect('there is no age box on this build', s.age === null, s.age)
  expect('Find waits for some text', buttonOf(s, en('talk.find'))?.disabled === true)
  const record = buttonOf(s, en('talk.record'))
  if (!record) throw new Fault('no Record button: does this Edge have no microphone support?')
  expect('Record is offered', record.disabled === false)
  expect('the back link goes home', await has('#main a[href="/"]'))
}

async function s2() {
  await open(ON, '/talk')
  await type('#talk-text', 'I do tailoring.')
  let s = await snap()
  expect('Find is enabled once there is text', buttonOf(s, en('talk.find'))?.disabled === false)

  const asked = await press(en('talk.find'))
  expect('Find was pressed', asked === 'clicked', asked)
  s = await settleSnap(4000, (x) => Boolean(alertText(x, 'talk-consent-error')))
  expect('the error says to tick the box', norm(alertText(s, 'talk-consent-error')) === norm(en('talk.consentRequired')), s.alerts)
  expect('the box has focus', s.focus === 'talk-consent', s.focus)
  expect('the box is marked invalid', s.consent.invalid === 'true', s.consent)
  expect('the box points at its error', (s.consent.describedby || '').split(/\s+/).includes('talk-consent-error'), s.consent)
  expect('nothing was sent', (await fake.calls()).length === 0)

  await inPage(() => document.activeElement.blur())
  const recorded = await press(en('talk.record'))
  expect('Record was pressed', recorded === 'clicked', recorded)
  await sleep(300)
  s = await snap()
  expect('Record did not ask for the microphone', s.gumCalls === 0, s.gumCalls)
  expect('Record put focus on the box too', s.focus === 'talk-consent', s.focus)
  expect('nothing was sent either way', (await fake.calls()).length === 0)

  await tick('#talk-consent')
  s = await snap()
  expect('ticking clears the error', !alertText(s, 'talk-consent-error'), s.alerts)
  expect('and the invalid mark', s.consent.invalid === null, s.consent)
}

async function s2b() {
  await open(AGE, '/talk')
  let s = await snap()
  expect('the age box is on this build', s.age !== null)
  await tick('#talk-consent')
  await type('#talk-text', 'I do tailoring.')
  await press(en('talk.find'))
  s = await settleSnap(4000, (x) => Boolean(alertText(x, 'talk-age-error')))
  expect('the error says to tick the box', norm(alertText(s, 'talk-age-error')) === norm(en('talk.consentRequired')), s.alerts)
  expect('the age box has focus', s.focus === 'talk-age', s.focus)
  expect('the age box is marked invalid', s.age.invalid === 'true', s.age)
  expect('the consent box is not blamed', !alertText(s, 'talk-consent-error'))
  expect('nothing was sent', (await fake.calls()).length === 0)
  await tick('#talk-age')
  await find()
  const calls = await fake.calls()
  expect('with both ticked the request goes', calls.length === 1 && calls[0].call === 'extract', calls)
}

// The review is on screen: untick the Lucknow row (the sentence names it, so it
// is there to untick) and press the apply button. The page stays on /talk and asks
// the one question the sentence left open, the district, and that is what this waits
// for (it returns that state).
async function untickLucknowAndApply() {
  const found = await inPage(() => {
    const norm = window.__t.norm
    const head = document.querySelector('#main h2.ui-formsection-title[tabindex="-1"]')
    const row = [...head.closest('.ui-formsection').querySelectorAll('ul > li')]
      .find((li) => [...li.querySelectorAll('span.block')].map((el) => norm(el.innerText))[1] === 'Lucknow')
    const box = row && row.querySelector('input[type=checkbox]')
    if (!box) return false
    box.click()
    return true
  })
  if (!found) throw new Fault('no Lucknow row with a box to untick in the review')
  const s = await waitSnap('the Lucknow box to be unticked', 3000, (x) => x.review.rows.some((row) => row.spans[1] === 'Lucknow' && row.checked === false))
  expect('only the Lucknow box was unticked', s.review.rows.filter((row) => row.checked === false).length === 1, s.review.rows)
  await pressOwed(en('talk.apply'))
  return reach('the district question', 5000, (x) => x.question?.heading === norm(en('talk.askDistrict')))
}

// "Use the form instead", the link in the page's header: to the first page that
// has an answer missing.
async function goToForm() {
  await pressLink(en('talk.toForm'))
  await waitSnap('the first unanswered page', 5000, (x) => x.path !== '/talk')
}

// The typed sentence, through the review and out of the page by its "use the form"
// link, to the page that comes next. Leaves the application data in the tab's storage.
async function typeAndApply() {
  await open(ON, '/talk')
  await tick('#talk-consent')
  await type('#talk-text', SENTENCE)
  await find()
  await waitSnap('the review', 4000, (x) => x.review !== null)
  await untickLucknowAndApply()
  await goToForm()
}

async function s3() {
  await open(ON, '/talk')
  await tick('#talk-consent')
  await type('#talk-text', SENTENCE)
  await find()
  const sent = await fake.calls()
  expect('the open turn names no question to the model', sent.length === 1 && sent[0].call === 'extract' && sent[0].asking === null, sent)
  let s = await waitSnap('the review', 4000, (x) => x.review !== null)
  expect('the review is titled and has focus', s.review.title === norm(en('talk.reviewTitle')) && s.review.focused, s.review)
  expect('12 answers', s.review.rows.length === 12, s.review.rows.length)
  FIELD_ORDER.forEach((field, i) => {
    const row = s.review.rows[i]
    const [value, evidence] = ROWS[field]
    const want = typeof value === 'function' ? value('en') : value
    expect(`${field}: the question`, norm(row?.spans[0]).toLowerCase() === norm(en(FIELD_LABEL_KEYS[field])).toLowerCase(), row?.spans[0])
    expect(`${field}: the answer`, row?.spans[1] === norm(want), row?.spans[1])
    expect(`${field}: the words it came from`, (row?.spans[2] || '').includes(evidence), row?.spans[2])
    expect(`${field}: ticked`, row?.checked === true, row?.checked)
  })
  const beforeApply = await stored()
  expect('nothing is applied before the button', !beforeApply || (beforeApply.data.business.initialInvestment === '' && beforeApply.data.aiFilled.length === 0), beforeApply?.data)

  const asking = await untickLucknowAndApply()
  expect('the page stays on /talk', asking.path === '/talk', asking.path)
  expect('and asks the one question left, the district, as the last of the list', asking.question.progress === norm(en('talk.progress', { n: QUESTIONS.length, total: QUESTIONS.length })), asking.question)
  expect('the question has focus', asking.question.focused === true, { question: asking.question, focus: asking.focus })
  expect('the review is gone', asking.review === null, asking.review)
  const saved = await stored()
  if (!saved) throw new Fault('the application data is not in the tab storage after the button')
  const d = saved.data
  expect('the storage version', saved.v === STORAGE_VERSION, saved.v)
  expect('business.category', d.business.category === 'tailoring', d.business.category)
  const money = {
    business: { initialInvestment: 50000, monthlyRevenue: 20000, monthlyOperatingExpenses: 5000, existingDebt: 30000 },
    finance: { availableCapital: 10000, monthlyExpenses: 8000, monthlyEmi: 1500, householdIncome: 25000 },
  }
  for (const [section, fields] of Object.entries(money)) {
    for (const [name, want] of Object.entries(fields)) expect(`${section}.${name}`, String(d[section][name]) === String(want), d[section][name])
  }
  expect('location.state', d.location.state === 'Uttar Pradesh', d.location.state)
  expect('the unticked district was not written', d.location.district === '', d.location.district)
  expect('location.locationType', d.location.locationType === 'rural', d.location.locationType)
  expect('aiFilled names exactly what was written', sameSet(d.aiFilled, FILLED_PATHS), d.aiFilled)
  await goToForm()
  expect('"use the form instead" leads to the profile page (no name yet)', (await snap()).path === '/profile')

  // Full reloads: the banner has to come from storage, not from component state.
  const banner = (section) => inPage((name) => {
    const el = document.querySelector(`[data-helper-banner="${name}"]`)
    return el ? [...el.querySelectorAll('li')].map((li) => window.__t.norm(li.innerText)) : null
  }, section)
  await open(ON, '/business', { keep: true })
  let items = await banner('business')
  expect('/business: the banner lists 5', items?.length === 5, items)
  expect('/business: the banner says what it is', (await snap()).mainText.includes(norm(en('talk.filledTitle'))))
  const business = await inPage(() => ({
    pressed: [...document.querySelectorAll('#main button[aria-pressed="true"]')].map((b) => window.__t.norm(b.innerText)),
    values: Object.fromEntries(['initialInvestment', 'monthlyRevenue', 'monthlyOperatingExpenses', 'existingDebt'].map((n) => [n, document.querySelector(`input[name="${n}"]`)?.value])),
  }))
  expect('/business: the category button is pressed', business.pressed.some((text) => text.includes(norm(en('cat.tailoring')))), business.pressed)
  expect('/business: the money is in the fields', JSON.stringify(business.values) === JSON.stringify({ initialInvestment: '50000', monthlyRevenue: '20000', monthlyOperatingExpenses: '5000', existingDebt: '30000' }), business.values)

  await open(ON, '/location', { keep: true })
  items = await banner('location')
  expect('/location: the banner lists 1 (the state)', items?.length === 1, items)
  const place = await inPage(() => ({
    state: document.querySelector('select[name="state"]')?.value,
    district: document.querySelector('select[name="district"]')?.value,
  }))
  expect('/location: the state is chosen', place.state === 'Uttar Pradesh', place)
  expect('/location: the district is still open', place.district === '', place)

  await open(ON, '/finance', { keep: true })
  items = await banner('finance')
  expect('/finance: the banner lists 4', items?.length === 4, items)
  const money2 = await inPage(() => Object.fromEntries(['availableCapital', 'monthlyExpenses', 'monthlyEmi', 'householdIncome'].map((n) => [n, document.querySelector(`input[name="${n}"]`)?.value])))
  expect('/finance: the money is in the fields', JSON.stringify(money2) === JSON.stringify({ availableCapital: '10000', monthlyExpenses: '8000', monthlyEmi: '1500', householdIncome: '25000' }), money2)
}

async function s4() {
  await open(ON, '/talk')
  await tick('#talk-consent')
  await fake.set({ transcript: 'I earn 20000 a month.' })
  await startRecording()
  let s = await snap()
  expect('while recording the status line says so', s.statuses.includes(norm(en('talk.recording', { stop: en('talk.stop') }))), s.statuses)
  expect('while recording Cancel is offered', Boolean(buttonOf(s, en('talk.cancel'))))
  expect('while recording the boxes are locked', s.consent.disabled === true && s.language.disabled === true)
  expect('while recording Find is locked', buttonOf(s, en('talk.find'))?.disabled === true)
  await sleep(1500)
  await press(en('talk.stop'))
  s = await waitSnap('the transcript in the box', 15000, (x) => x.text !== '')
  expect('the transcript lands in the text box', s.text === 'I earn 20000 a month.', s.text)
  const calls = await fake.calls()
  const heard = calls.filter((c) => c.call === 'transcribe')
  expect('the backend got exactly one recording', heard.length === 1, calls)
  const wav = heard[0] || {}
  expect('it is a RIFF/WAVE file', wav.riff === 'RIFF' && wav.wave === 'WAVE', wav)
  expect('mono, 16 kHz', wav.channels === 1 && wav.rate === 16000, wav)
  expect('about the length that was recorded', wav.bytes > 20000 && wav.bytes < 3000000, wav.bytes)
  // The route hands the client the language's name, which is what Meta is told.
  expect('in the page language by default', wav.language === 'English', wav.language)
  expect('the microphone is released after Stop', allEnded(s), s.tracks)
  expect('the boxes are unlocked again', s.consent.disabled === false && s.language.disabled === false)

  await fake.set({ transcript: 'I pay 1500 EMI.' })
  await choose('#talk-language', 'ta')
  await recordFor(1300)
  s = await waitSnap('the second transcript', 15000, (x) => x.text.includes('EMI'))
  expect('a second recording adds to the text', s.text === 'I earn 20000 a month. I pay 1500 EMI.', s.text)
  const again = (await fake.calls()).filter((c) => c.call === 'transcribe')
  expect('and goes to Meta in the language chosen', again.length === 2 && again[1].language === 'Tamil', again.map((c) => c.language))
  expect('both recordings released the microphone', allEnded(s) && s.tracks.length === 2, s.tracks)
}

async function s5() {
  await open(ON, '/talk')
  await tick('#talk-consent')
  await type('#talk-text', 'I do tailoring.')
  await inPage(() => { window.__gum.mode = 'defer' })
  await press(en('talk.record'))
  await waitSnap('the permission question to be open', 5000, (x) => x.pending === 1)
  await sleep(250)
  let s = await snap()
  expect('while the browser asks: the consent box is locked', s.consent.disabled === true, s.consent)
  expect('while the browser asks: the language is locked', s.language.disabled === true, s.language)
  expect('while the browser asks: Find is locked', buttonOf(s, en('talk.find'))?.disabled === true)
  expect('while the browser asks: Record is locked', buttonOf(s, en('talk.record'))?.disabled === true)
  expect('while the browser asks: there is no Stop yet', !buttonOf(s, en('talk.stop')))

  await inPage(() => window.__gum.grant())
  s = await waitSnap('recording after the grant', 8000, (x) => Boolean(buttonOf(x, en('talk.stop'))))
  expect('once granted: Cancel is offered', Boolean(buttonOf(s, en('talk.cancel'))))
  expect('once granted: the consent box stays locked', s.consent.disabled === true)

  await press(en('talk.cancel'))
  s = await waitSnap('the controls back after Cancel', 5000, (x) => x.consent.disabled === false)
  expect('Cancel: the language is unlocked', s.language.disabled === false)
  expect('Cancel: Find is unlocked', buttonOf(s, en('talk.find'))?.disabled === false)
  expect('Cancel: Record is back and enabled', buttonOf(s, en('talk.record'))?.disabled === false)
  expect('Cancel: the microphone is released', allEnded(s), s.tracks)
  expect('Cancel: nothing was sent', (await fake.calls()).length === 0)

  await inPage(() => { window.__gum.mode = 'defer' })
  await press(en('talk.record'))
  await waitSnap('the second question to be open', 5000, (x) => x.pending === 1)
  await inPage(() => window.__gum.refuse('NotAllowedError'))
  s = await waitSnap('the refusal to show', 5000, (x) => Boolean(alertText(x)))
  expect('refused: the page says so', norm(alertText(s)) === norm(en('talk.errMicDenied')), alertText(s))
  expect('refused: the boxes are unlocked again', s.consent.disabled === false && s.language.disabled === false)
  expect('refused: Record is back and enabled', buttonOf(s, en('talk.record'))?.disabled === false)
}

async function s6() {
  await open(ON, '/talk')
  await tick('#talk-consent')
  await type('#talk-text', 'I do tailoring.')
  const codes = [['rate_limited', 'talk.errBusy'], ['auth', 'talk.errUnavailable'], ['bad_output', 'talk.errUnclear']]
  for (const [fail, key] of codes) {
    await fake.set({ fail })
    const s = await find()
    expect(`${fail}: the page says ${key}`, norm(alertText(s)) === norm(en(key)), alertText(s))
    expect(`${fail}: there is no review`, s.review === null)
    expect(`${fail}: Find is back`, buttonOf(s, en('talk.find'))?.disabled === false)
  }

  await fake.reset()
  await fake.set({ fail: 'rate_limited' })
  await recordFor(1300)
  const s = await waitSnap('the transcription error', 15000, (x) => Boolean(alertText(x)))
  expect('a transcription that is turned away says talk.errBusy', norm(alertText(s)) === norm(en('talk.errBusy')), alertText(s))
  expect('and adds nothing to the text', s.text === 'I do tailoring.', s.text)

  await fake.reset()
  const limits = await inPage(async () => {
    const api = await import('/src/services/api.js')
    const code = async (call) => {
      try { await call(); return 'no error' } catch (err) { return err.code ?? 'no code: ' + err.message }
    }
    const wav = (bytes) => new Blob([new Uint8Array(bytes)], { type: 'audio/wav' })
    return {
      tooBig: await code(() => api.transcribeRecording(wav(3000100), 'en')),
      notAWav: await code(() => api.transcribeRecording(wav(100), 'en')),
      tooLong: await code(() => api.extractAnswers('x'.repeat(2001), 'en')),
    }
  })
  expect('a recording over 3 MB is talk.errRecording', limits.tooBig === 'talk.errRecording', limits)
  expect('bytes that are not a WAV are talk.errRecording', limits.notAWav === 'talk.errRecording', limits)
  expect('text over 2,000 characters is talk.errGeneric', limits.tooLong === 'talk.errGeneric', limits)
}

async function s7() {
  await open(ON, '/talk')
  await tick('#talk-consent')
  await type('#talk-text', 'I do tailoring.')
  await fake.set({ delay: 2.5 })
  await press(en('talk.find'))
  let s = await waitSnap('the busy line', 5000, (x) => isBusy(x))
  expect('while it is out: Cancel is offered', Boolean(buttonOf(s, en('talk.cancel'))))
  expect('while it is out: Find is locked', buttonOf(s, en('talk.find'))?.disabled === true)
  await press(en('talk.cancel'))
  s = await waitSnap('Cancel to take effect', 5000, (x) => !buttonOf(x, en('talk.cancel')) && !isBusy(x))
  expect('after Cancel: Find is back', buttonOf(s, en('talk.find'))?.disabled === false)
  expect('after Cancel: no error is shown', s.alerts.length === 0, s.alerts)
  await sleep(3500)
  s = await snap()
  expect('and the late answer is dropped: no review appears', s.review === null)
  expect('and no error appears either', s.alerts.length === 0, s.alerts)
  expect('(sanity) the backend did get the request', (await fake.calls()).filter((c) => c.call === 'extract').length === 1)
  await fake.reset()
}

async function s8() {
  const ml = LANGUAGES.find((l) => l.code === 'ml')
  await open(ON, '/talk', { lang: 'ml' })
  let s = await snap()
  expect('ml: there is no Record button', !buttonOf(s, T('ml', 'talk.record')))
  expect('ml: the page says speaking is not available', s.notices.includes(norm(T('ml', 'talk.langNoSpeech', { language: ml.endonym }))), s.notices)
  await tick('#talk-consent')
  await type('#talk-text', 'I do tailoring.')
  s = await snap()
  expect('ml: typing still enables Find', buttonOf(s, T('ml', 'talk.find'))?.disabled === false)
  await choose('#talk-language', 'en')
  // The page stays in Malayalam; only the language to be spoken changes.
  s = await waitSnap('the Record button after choosing English', 3000, (x) => Boolean(buttonOf(x, T('ml', 'talk.record'))))
  expect('choosing a language with speech brings Record back', Boolean(buttonOf(s, T('ml', 'talk.record'))))
  await choose('#talk-language', 'ml')
  s = await waitSnap('the notice after choosing Malayalam', 3000, (x) => !buttonOf(x, T('ml', 'talk.record')))
  expect('and choosing Malayalam again takes it away', s.notices.includes(norm(T('ml', 'talk.langNoSpeech', { language: ml.endonym }))), s.notices)
}

async function s9() {
  await open(ON, '/talk')
  await tick('#talk-consent')
  for (const [mode, key] of [['deny', 'talk.errMicDenied'], ['none', 'talk.errMicNone']]) {
    await inPage((m) => { window.__gum.mode = m }, mode)
    await press(en('talk.record'))
    const s = await waitSnap(`the ${mode} error`, 5000, (x) => norm(alertText(x)) === norm(en(key)))
    expect(`${mode}: the page says ${key}`, norm(alertText(s)) === norm(en(key)), alertText(s))
    expect(`${mode}: the consent box is unlocked`, s.consent.disabled === false)
    expect(`${mode}: Record is back and enabled`, buttonOf(s, en('talk.record'))?.disabled === false)
    expect(`${mode}: no Stop button`, !buttonOf(s, en('talk.stop')))
  }
}

async function s10() {
  for (const lang of LANGS) {
    await open(ON, '/talk', { lang })
    await type('#talk-text', 'I do tailoring.')
    await press(T(lang, 'talk.find'))
    const s = await settleSnap(4000, (x) => Boolean(alertText(x, 'talk-consent-error')))
    expect(`${lang}: the title`, s.h1 === norm(T(lang, 'talk.title')), s.h1)
    expect(`${lang}: the consent error`, norm(alertText(s, 'talk-consent-error')) === norm(T(lang, 'talk.consentRequired')), alertText(s, 'talk-consent-error'))
    if (lang === 'ml') {
      const ml = LANGUAGES.find((l) => l.code === 'ml')
      expect('ml: the no-speech notice', s.notices.includes(norm(T('ml', 'talk.langNoSpeech', { language: ml.endonym }))), s.notices)
    } else {
      expect(`${lang}: the Record button`, Boolean(buttonOf(s, T(lang, 'talk.record'))), s.buttons)
    }
    const leaks = await inPage(leakScan)
    expect(`${lang}: no leaked key, placeholder or stringified nothing`, leaks.length === 0, leaks.join(' | '))
  }
}

async function s11() {
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 360, height: 740, deviceScaleFactor: 2, mobile: true })
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
  try {
    for (const lang of ['en', 'hi']) {
      await open(ON, '/talk', { lang })
      await tick('#talk-consent')
      await type('#talk-text', SENTENCE)
      await find(lang)
      await waitSnap('the review', 4000, (x) => x.review !== null)
      const probe = await inPage(mobileProbe)
      expect(`${lang}: nothing sticks out past the right edge`, probe.overflow.length === 0 && probe.scrollWidth <= probe.vw + 1, probe)
      expect(`${lang}: every tap target is at least 44 px`, probe.taps.length === 0, probe.taps)
      expect(`${lang}: no text under 12 px`, probe.small.length === 0, probe.small)
    }
  } finally {
    await cdp.send('Emulation.clearDeviceMetricsOverride')
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false })
  }
}

async function s12() {
  await typeAndApply()
  await open(ON, '/business', { keep: true })
  const banner = () => inPage(() => {
    const el = document.querySelector('[data-helper-banner="business"]')
    return el ? [...el.querySelectorAll('li')].map((li) => window.__t.norm(li.innerText).toLowerCase()) : []
  })
  let items = await banner()
  expect('/business starts with 5 filled answers listed', items.length === 5, items)

  await type('input[name="monthlyRevenue"]', '25000')
  await sleep(200)
  items = await banner()
  expect('editing the revenue removes it from the list', items.length === 4 && !items.includes(norm(en('errf.revenue')).toLowerCase()), items)
  expect('and only it', items.includes(norm(en('errf.investment')).toLowerCase()), items)

  const sameCategory = await inPage(() => {
    const button = document.querySelector('#main button[aria-pressed="true"]')
    if (!button) return false
    button.click()
    return true
  })
  if (!sameCategory) throw new Fault('no pressed category button on /business')
  await sleep(200)
  items = await banner()
  expect('pressing the category that is already chosen changes nothing', items.length === 4, items)

  await press(en('cat.retail'), true)
  await sleep(200)
  items = await banner()
  expect('choosing another category removes the category', items.length === 3 && !items.includes(norm(en('errf.category')).toLowerCase()), items)

  // Back on /talk the boxes are unticked again: they are page state, not stored.
  await open(ON, '/talk', { keep: true })
  const s = await snap()
  expect('/talk starts unticked on a second visit', s.consent?.checked === false, s.consent)
}

async function s13() {
  await open(ON, '/talk')
  await tick('#talk-consent')
  await inPage(() => {
    window.MediaRecorder = class { constructor() { throw new Error('this recorder will not start') } }
  })
  const state = await press(en('talk.record'))
  expect('Record was pressed', state === 'clicked', state)
  const s = await waitSnap('the error after the failed setup', 8000, (x) => Boolean(alertText(x)))
  expect('the page says something went wrong', norm(alertText(s)) === norm(en('talk.errGeneric')), alertText(s))
  expect('(sanity) the microphone had been opened', s.tracks.length > 0, s.tracks)
  expect('and it was released', allEnded(s), s.tracks)
  expect('there is no Stop button', !buttonOf(s, en('talk.stop')))
  expect('the consent box is unlocked', s.consent.disabled === false)
  expect('Record is back and enabled', buttonOf(s, en('talk.record'))?.disabled === false)
}

async function s14() {
  const leave = () => inPage(() => { document.querySelector('#main a[href="/"]').click() })

  await open(ON, '/talk')
  await tick('#talk-consent')
  await startRecording()
  await leave()
  let s = await waitSnap('the landing page', 5000, (x) => x.path === '/')
  s = await waitSnap('the microphone to be released', 4000, allEnded).catch(() => snap())
  expect('leaving while recording releases the microphone', allEnded(s), s.tracks)

  await open(ON, '/talk')
  await tick('#talk-consent')
  await inPage(() => { window.__gum.mode = 'defer' })
  await press(en('talk.record'))
  await waitSnap('the permission question to be open', 5000, (x) => x.pending === 1)
  await leave()
  await waitSnap('the landing page', 5000, (x) => x.path === '/')
  await inPage(() => window.__gum.grant())
  s = await waitSnap('the microphone, once given, to be released', 4000, allEnded).catch(() => snap())
  expect('leaving while the browser asks: the microphone, once given, is released', allEnded(s), s.tracks)
  expect('and the landing page shows no error', s.alerts.length === 0, s.alerts)
}

async function s15() {
  const record = norm(en('talk.record'))
  const stop = norm(en('talk.stop'))

  // The lock goes on when Record is pressed and has to hold until the recording
  // is sent: the boxes were ticked for that recording, and the moment between
  // Stop and the finished file is the one place a box could still be unticked.
  await open(ON, '/talk')
  await tick('#talk-consent')
  await fake.set({ transcript: 'I earn 20000 a month.' })
  await startRecording()
  // A recording stopped at once holds no sound, cannot be decoded and is never
  // sent, which would read as a fault in the page.
  await sleep(1200)
  await inPage(stopProbe, record, stop)
  await press(en('talk.stop'))
  for (let i = 0; i < 150 && (await inPage(() => window.__stop.fetchAt)) === null; i++) await sleep(60)
  const probe = await inPage(() => window.__stop)
  if (probe.fetchAt === null) throw new Fault(`the recording was never sent; the page says ${JSON.stringify(alertText(await snap()))}; states seen ${JSON.stringify(probe.states)}`)
  const before = probe.states.filter((x) => x.at < probe.fetchAt)
  expect('(sanity) the page was watched between Stop and the request', before.some((x) => !x.stopShown && x.recordDisabled !== null), probe)
  expect('from Stop until the request leaves, the consent box stays locked', before.every((x) => x.consentDisabled === true), before)
  expect('and Record stays off, so a second recording cannot start in that moment', before.every((x) => x.recordDisabled !== false), before)
  let s = await waitSnap('the transcript in the box', 15000, (x) => x.text !== '')
  expect('the recording is transcribed as before', s.text === 'I earn 20000 a month.', s.text)
  expect('afterwards the boxes are unlocked again', s.consent.disabled === false && s.language.disabled === false)
  expect('and Record is back and enabled', buttonOf(s, en('talk.record'))?.disabled === false)

  // A recording the browser cannot turn into a file must not leave the page locked.
  await open(ON, '/talk')
  await tick('#talk-consent')
  await startRecording()
  await inPage(stopProbe, record, stop)
  await inPage(() => {
    OfflineAudioContext.prototype.decodeAudioData = () => Promise.reject(new Error('this recording cannot be decoded'))
  })
  await press(en('talk.stop'))
  s = await settleSnap(8000, (x) => Boolean(alertText(x)))
  expect('a recording that cannot be finished says so', norm(alertText(s)) === norm(en('talk.errRecording')), alertText(s))
  // The fake only logs what reaches the model, and the real route turns an empty
  // body away before that, so the request itself is watched from the page.
  expect('and no request left the page', (await inPage(() => window.__stop.fetchAt)) === null)
  expect('and nothing reached the model', (await fake.calls()).length === 0)
  expect('the microphone is released', allEnded(s), s.tracks)
  expect('the consent box is unlocked again', s.consent.disabled === false, s.consent)
  expect('Record is back and enabled', buttonOf(s, en('talk.record'))?.disabled === false)
}

// --- S16-S22: the written plan on /advisory -------------------------------------
// The card is the one place the reader's answers go to a third party after the form, so
// it is driven the way a reader drives it: through the four real pages, with the fake in
// Meta's place. What the model is shown is read from the fake, which logs all of it.

async function s16() {
  await startOnAdvisory()
  let v = await planView()
  expect('(sanity) /advisory shows the loan options and the rules own plan above the card', v.path === '/advisory' && v.headings.includes(norm(en('fo.title'))) && v.headings.includes(norm(en('ad.planTitle'))), { path: v.path, headings: v.headings })
  expect('helper on: the plan card is there', v.card !== null, v.headings)
  if (!v.card) return

  const card = v.card
  expect('the card has its eyebrow and its title', card.eyebrow === norm(en('plan.eyebrow')) && card.title === norm(en('plan.title')), [card.eyebrow, card.title])
  expect('before a plan it says what the plan is', canon(card.paragraphs) === canon([norm(en('plan.eyebrow')), norm(en('plan.intro'))]), card.paragraphs)
  expect('and what is sent, before the tick', canon(card.asks) === canon([norm(en('plan.sendsText'))]), card.asks)
  expect('the consent box starts unticked, enabled and required', card.consent.checked === false && card.consent.disabled === false && card.consent.required === 'true', card.consent)
  expect('with no error on it', card.consent.invalid === null && card.consent.describedby === null && card.alerts.length === 0, card)
  expect('its label is the consent sentence', card.consent.label.startsWith(norm(en('plan.consent'))), [card.consent.label, norm(en('plan.consent'))])
  expect('the one button is Write, and it is enabled', canon(card.buttons) === canon([{ text: norm(en('plan.write')), disabled: false }]), card.buttons)
  expect('the status line is in the page for the first message, and empty', card.statusElements === 1 && card.status === '', card)
  expect('no plan is shown', card.summary === null && card.steps.length === 0 && card.cautions.length === 0 && card.how === null && card.h3.length === 0, card)
  expect('nothing was sent from the page', (await planRequests()).length === 0)
  expect('and nothing reached the model', (await fake.calls()).length === 0)
  let leaks = await inPage(leakScan, PLAN_PREFIXES)
  expect('no leaked key, placeholder or stringified nothing', leaks.length === 0, leaks.join(' | '))

  // The tick is asked for, not assumed.
  const pressed = await press(en('plan.write'))
  expect('(sanity) Write was pressed without the tick', pressed === 'clicked', pressed)
  v = await settleSnap(3000, (x) => x.card?.alerts.some((a) => a.id === 'plan-consent-error'), planView)
  const refusal = v.card?.alerts.find((a) => a.id === 'plan-consent-error')
  expect('Write without the tick says the tick is needed', refusal?.text === norm(en('talk.consentRequired')), v.card?.alerts)
  expect('and marks the box invalid and described by that message', v.card?.consent.invalid === 'true' && v.card?.consent.describedby === 'plan-consent-error', v.card?.consent)
  expect('and moves focus to the box', v.card?.focus === 'plan-consent', v.card?.focus)
  expect('and sends nothing', (await planRequests()).length === 0 && (await fake.calls()).length === 0)
  expect('and the card is not left busy', v.card?.status === '' && v.card?.buttons[0]?.disabled === false, v.card)

  await tick('#plan-consent')
  v = await planView()
  expect('ticking the box takes the message and the marks away', v.card.alerts.length === 0 && v.card.consent.invalid === null && v.card.consent.describedby === null && v.card.consent.checked === true, v.card)

  // Built without the helper, the page is the rules alone.
  await startOnAdvisory(OFF)
  v = await planView()
  expect('(sanity) the helper-off build shows the rules own plan', v.path === '/advisory' && v.headings.includes(norm(en('ad.planTitle'))), { path: v.path, headings: v.headings })
  expect('helper off: no plan card and no consent box', v.card === null && !(await has('#plan-consent')), v.headings)
  expect('and nothing was sent', (await planRequests()).length === 0 && (await fake.calls()).length === 0)
  leaks = await inPage(leakScan, PLAN_PREFIXES)
  expect('helper off: no leaked key either', leaks.length === 0, leaks.join(' | '))
}

async function s17() {
  await startOnAdvisory()
  const saved = (await stored()).data
  expect('(sanity) the four pages made the 12 answers they should', canon(saved.request) === canon(PLAN_REQUEST), saved.request)
  const profit = saved.result?.financial_analysis?.monthly_profit
  const gap = saved.result?.financial_analysis?.funding_gap
  expect('(sanity) and a result with the profit and the gap the plan is filled from', profit === 12000 && gap === 40000, { profit, gap })

  await tick('#plan-consent')
  const v = await writePlan(en('plan.write'))
  const call = v.requests.at(-1)
  expect('exactly one request left the page, a POST to the plan route', v.requests.length === 1 && call.method === 'POST' && call.url === PLAN_URL, v.requests.map((r) => `${r.method} ${r.url}`))
  expect('the plan request was answered with 200', call.status === 200, { status: call.status, reply: call.reply })
  expect('the card shows a plan', Boolean(v.card?.summary), v.card)
  if (call.status !== 200 || !v.card?.summary) return

  const reply = JSON.parse(call.reply)
  expect('the request is JSON', call.contentType === 'application/json', call.contentType)
  expect('and carries exactly the 12 answers, the language and the tick', canon(JSON.parse(call.body)) === canon({ answers: PLAN_REQUEST, language: 'en', send_to_meta: true }), call.body)
  expect('the route wrote the plan on its first try, in English', reply.attempts === 1 && reply.language === 'en', { attempts: reply.attempts, language: reply.language })

  // What the model was given. The fake logs all of it.
  const calls = await fake.calls()
  expect('the model was asked once, for English', calls.length === 1 && calls[0].call === 'plan' && calls[0].language === 'en', calls.map((c) => `${c.call}:${c.language}`))
  const given = calls[0]?.text ?? ''
  const digits = given.match(/\p{Nd}+/gu) ?? []
  expect('what the model was given has no digit in it, so no figure', digits.length === 0, digits)
  const names = (saved.result?.scheme_matches ?? []).map((m) => m.name)
  expect('(sanity) the result names schemes that could have leaked', names.length > 0, names)
  const leaked = ['Lucknow', 'Uttar Pradesh', JOURNEY.businessName, 'Rahul', 'Tailors', JOURNEY.village, ...names].filter((word) => given.toLowerCase().includes(word.toLowerCase()))
  expect('and no name, place or scheme from the answers', leaked.length === 0, leaked)
  expect('(sanity) it was told the kind of business and the setting, so the check had something to find', given.includes('tailoring') && given.includes('village') && given.length > 300, given.slice(0, 300))

  const card = v.card
  expect('the heading takes focus: a plan just written is where a keyboard lands', card.titleFocused === true, card.focus)
  expect('the card says an AI wrote it, and carries the fixed caution', card.paragraphs.includes(norm(en('plan.aiLabel'))) && card.paragraphs.includes(norm(en('plan.fixedCaution'))), card.paragraphs)
  expect('the intro and the other-language note are gone', !card.paragraphs.includes(norm(en('plan.intro'))) && !card.paragraphs.includes(norm(en('plan.otherLanguage', { language: ownName('en') }))), card.paragraphs)
  expect('the summary, steps and cautions are what the route sent, line for line, in English', showsPlan(card, reply), { shown: [card.summary, ...card.steps, ...card.cautions], sent: linesOf(reply).map(lineOf) })
  expect('the summary carries the rules own profit and gap, from the result', canon(card.summary.fills) === canon([rupees(profit), rupees(gap)]), card.summary.fills)
  const wording = [card.summary, ...card.steps, ...card.cautions].flatMap((line) => line.plain)
  expect('the AI own words hold no digit', wording.every((run) => !/\p{Nd}/u.test(run)), wording)
  expect('3 steps and 1 caution, under their titles', card.steps.length === 3 && card.cautions.length === 1 && canon(card.h3) === canon([norm(en('plan.stepsTitle')), norm(en('plan.cautionsTitle'))]), { steps: card.steps.length, cautions: card.cautions.length, h3: card.h3 })
  expect('how this plan was made is closed, with both its paragraphs', card.how?.open === false && card.how.title === norm(en('plan.how')) && canon(card.how.text) === canon([norm(en('plan.howText')), norm(en('plan.howLimit'))]), card.how)
  expect('the consent box is unticked again', card.consent.checked === false && card.consent.disabled === false, card.consent)
  expect('the button now offers another plan, naming the language', canon(card.buttons) === canon([{ text: norm(en('plan.again', { language: ownName('en') })), disabled: false }]), card.buttons)
  expect('no error, and the status line is empty', card.alerts.length === 0 && card.status === '', card)
  const leaks = await inPage(leakScan, PLAN_PREFIXES)
  expect('no leaked key, placeholder or stringified nothing', leaks.length === 0, leaks.join(' | '))

  const kept = (await stored()).data.plan
  expect('the plan is stored as the route sent it', Boolean(kept) && kept.language === 'en' && canon([kept.summary, kept.steps, kept.cautions]) === canon([reply.summary, reply.steps, reply.cautions]), kept)

  // A reload keeps the plan and does not write another.
  await open(ON, '/advisory', { keep: true })
  await inPage(planProbe)
  const again = await planView()
  expect('after a reload the same plan is there', Boolean(again.card?.summary) && showsPlan(again.card, reply), again.card)
  expect('and the heading is not grabbed by a plan that was already there', again.card?.titleFocused === false, again.card?.focus)
  await sleep(400)
  expect('and nothing was asked for again', (await planRequests()).length === 0 && (await fake.calls()).length === 1)

  // Changing an answer throws the plan away with the result it belonged to.
  await open(ON, '/finance', { keep: true })
  await type('input[name="monthlyExpenses"]', '8001')
  const edited = await settleSnap(3000, (d) => d.result === null, async () => (await stored()).data)
  expect('changing an answer clears the result, the request and the plan', edited.result === null && edited.request === null && edited.plan === null, { result: edited.result === null, request: edited.request === null, plan: edited.plan === null })
  await toAdvisory()
  const emptied = await planSnap()
  expect('/advisory then says the answers changed and shows no plan card', emptied.card === null && emptied.headings.includes(norm(en('res.changedTitle'))), emptied.headings)
}

async function s18() {
  await startOnAdvisory()
  await tick('#plan-consent')
  let v = await writePlan(en('plan.write'))
  const english = JSON.parse(v.requests.at(-1).reply)
  expect('(sanity) the first plan is English, and shown', english.language === 'en' && Boolean(v.card?.summary) && showsPlan(v.card, english), v.card)

  await chooseLanguage('hi')
  v = await settleSnap(3000, (x) => x.card?.title === norm(T('hi', 'plan.title')), planView)
  expect('in Hindi the card is Hindi', v.card?.title === norm(T('hi', 'plan.title')), v.card?.title)
  expect('the plan stays as it was written, in English', Boolean(v.card?.summary) && showsPlan(v.card, english), v.card)
  expect('and a note says so, in Hindi, naming English', v.card.paragraphs.includes(norm(T('hi', 'plan.otherLanguage', { language: ownName('en') }))), v.card.paragraphs)
  expect('the button offers a plan in Hindi', canon(v.card.buttons) === canon([{ text: norm(T('hi', 'plan.again', { language: ownName('hi') })), disabled: false }]), v.card.buttons)
  expect('switching the language kept the result and asked for nothing', (await stored()).data.result !== null && (await planRequests()).length === 1 && (await fake.calls()).length === 1)

  await tick('#plan-consent')
  v = await writePlan(T('hi', 'plan.again', { language: ownName('hi') }))
  const last = v.requests.at(-1)
  const hindi = last.status === 200 ? JSON.parse(last.reply) : null
  expect('a plan written now is asked for, and comes back, in Hindi', JSON.parse(last.body).language === 'hi' && hindi?.language === 'hi', { status: last.status, language: hindi?.language })
  if (!hindi) return
  expect('every line is Hindi, as the route sent it', Boolean(v.card?.summary) && showsPlan(v.card, hindi), v.card)
  expect('with the same figures as the English plan, line for line', canon(fillSets(hindi)) === canon(fillSets(english)), { hindi: fillSets(hindi), english: fillSets(english) })
  expect('and no note about another language', !v.card.paragraphs.includes(norm(T('hi', 'plan.otherLanguage', { language: ownName('en') }))) && !v.card.paragraphs.includes(norm(T('hi', 'plan.otherLanguage', { language: ownName('hi') }))), v.card.paragraphs)

  await chooseLanguage('en')
  v = await settleSnap(3000, (x) => x.card?.title === norm(en('plan.title')), planView)
  expect('back in English the Hindi plan stays, with a note naming Hindi', Boolean(v.card?.summary) && showsPlan(v.card, hindi) && v.card.paragraphs.includes(norm(en('plan.otherLanguage', { language: ownName('hi') }))), v.card)
  expect('and the result is still there', (await stored()).data.result !== null)
}

async function s19() {
  await startOnAdvisory()
  // Each case: how to break the next try, and what must follow. `calls` is how many
  // times the model was asked (the route tries a plan the checks refuse twice).
  const cases = [
    { what: 'a plan with a number of its own', prepare: () => fake.set({ plan: DIGIT_PLAN }), status: 502, key: 'plan.errNoPlan', calls: 2 },
    { what: 'the model being rate limited', prepare: () => fake.set({ fail: 'rate_limited' }), status: 429, key: 'plan.errBusy', calls: 1 },
    { what: 'a model reply that cannot be used', prepare: () => fake.set({ fail: 'bad_output' }), status: 502, key: 'plan.errNoPlan', calls: 2 },
    { what: 'a dropped connection', prepare: () => inPage(planFailure, 'reject'), status: 'rejected', key: 'plan.errUnavailable', calls: 0 },
    { what: 'a server error with nothing in it', prepare: () => inPage(planFailure, 'reply', 500, '{}'), status: 500, key: 'plan.errGeneric', calls: 0 },
    { what: 'the model refusing the key', prepare: () => fake.set({ fail: 'auth' }), status: 503, key: 'plan.errUnavailable', calls: 1 },
    { what: 'a 200 that is not a plan', prepare: () => inPage(planFailure, 'reply', 200, '{"nope":true}'), status: 200, key: 'plan.errGeneric', calls: 0 },
  ]
  for (const c of cases) {
    await fake.reset()
    await c.prepare()
    await tick('#plan-consent')
    const v = await writePlan(en('plan.write'))
    const call = v.requests.at(-1)
    const errors = (v.card?.alerts ?? []).filter((a) => a.id === '').map((a) => a.text)
    expect(`${c.what}: the page says ${c.key}`, canon(errors) === canon([norm(en(c.key))]), v.card?.alerts)
    expect(`${c.what}: the answer was ${c.status}`, call.status === c.status, call.status)
    expect(`${c.what}: the model was asked ${c.calls} time(s)`, (await fake.calls()).length === c.calls, (await fake.calls()).length)
    expect(`${c.what}: no plan is shown or stored`, v.card?.summary === null && (await stored()).data.plan === null, v.card)
    expect(`${c.what}: Write is back and the status line empty`, canon(v.card?.buttons) === canon([{ text: norm(en('plan.write')), disabled: false }]) && v.card?.status === '', v.card)
    if (c.status === 502 && c.calls === 2 && c.key === 'plan.errNoPlan' && c.what.includes('number')) {
      expect(`${c.what}: its number never reached the page`, !(await inPage(() => document.body.innerText.includes('for 3 months'))))
    }
  }

  await fake.reset()
  await tick('#plan-consent')
  const v = await writePlan(en('plan.write'))
  expect('with the fault gone the same button gives a plan', Boolean(v.card?.summary) && v.card.alerts.length === 0, v.card)
}

async function s20() {
  await startOnAdvisory()
  await tick('#plan-consent')

  // An error from an earlier try is cleared when the next one starts.
  await fake.set({ fail: 'rate_limited' })
  let v = await writePlan(en('plan.write'))
  expect('(sanity) a refused try shows its error', v.card?.alerts.some((a) => a.text === norm(en('plan.errBusy'))), v.card?.alerts)

  await fake.set({ fail: null, delay: 4 })
  await press(en('plan.write'))
  v = await waitSnap('the plan to be on its way', 8000, (x) => x.requests.length === 2 && x.card?.status !== '', planView)
  expect('while the plan is written the card says so', v.card.status === norm(en('plan.writing')), v.card.status)
  expect('the error of the last try is gone', v.card.alerts.length === 0, v.card.alerts)
  expect('Write is off and Cancel is offered', canon(v.card.buttons) === canon([{ text: norm(en('plan.write')), disabled: true }, { text: norm(en('talk.cancel')), disabled: false }]), v.card.buttons)
  expect('the consent box is locked while the request is out', v.card.consent.disabled === true, v.card.consent)

  await press(en('talk.cancel'))
  v = await waitSnap('the card to be idle again', 6000, (x) => x.card?.status === '' && x.requests[1]?.done !== null, planView)
  expect('Cancel ends the wait without an error', v.card.alerts.length === 0, v.card.alerts)
  expect('the page abandoned the request', v.requests[1].status === 'rejected', v.requests[1].status)
  expect('no plan, and Write is back with the box unlocked', v.card.summary === null && canon(v.card.buttons) === canon([{ text: norm(en('plan.write')), disabled: false }]) && v.card.consent.disabled === false, v.card)
  await sleep(4500)
  v = await planView()
  expect('a plan the backend finishes after that is not picked up', v.card.summary === null && v.card.alerts.length === 0 && (await stored()).data.plan === null, v.card)

  await fake.set({ delay: 0 })
  // A Cancel that did nothing lets the plan arrive, and its button then reads "again":
  // the checks above have said so, and a missing button would make this a fault.
  if (v.card?.summary) return
  await tick('#plan-consent')
  v = await writePlan(en('plan.write'))
  expect('a try after Cancel gives a plan', Boolean(v.card?.summary) && v.card.alerts.length === 0, v.card)
}

async function s21() {
  await startOnAdvisory()
  let english = null
  for (const lang of LANGS) {
    if (lang !== 'en') {
      await chooseLanguage(lang)
      await settleSnap(3000, (x) => x.card?.title === norm(T(lang, 'plan.title')), planView)
    }
    await tick('#plan-consent')
    const v = await writePlan(english === null ? T(lang, 'plan.write') : T(lang, 'plan.again', { language: ownName(lang) }))
    const call = v.requests.at(-1)
    const reply = call.status === 200 ? JSON.parse(call.reply) : null
    expect(`${lang}: the plan comes back, in this language`, reply?.language === lang, { status: call.status, language: reply?.language })
    if (!reply) continue
    english ??= reply
    expect(`${lang}: the request asked for it`, JSON.parse(call.body).language === lang, call.body)
    expect(`${lang}: every line is as the route sent it, in ${lang}`, Boolean(v.card?.summary) && showsPlan(v.card, reply), v.card)
    expect(`${lang}: the same figures as the English plan, line for line`, canon(fillSets(reply)) === canon(fillSets(english)), { here: fillSets(reply), english: fillSets(english) })
    expect(`${lang}: 3 steps, 1 caution, under their titles`, v.card.steps.length === 3 && v.card.cautions.length === 1 && canon(v.card.h3) === canon([norm(T(lang, 'plan.stepsTitle')), norm(T(lang, 'plan.cautionsTitle'))]), { steps: v.card.steps.length, cautions: v.card.cautions.length, h3: v.card.h3 })
    expect(`${lang}: the title, the AI label and the fixed caution`, v.card.title === norm(T(lang, 'plan.title')) && v.card.paragraphs.includes(norm(T(lang, 'plan.aiLabel'))) && v.card.paragraphs.includes(norm(T(lang, 'plan.fixedCaution'))), { title: v.card.title, paragraphs: v.card.paragraphs })
    expect(`${lang}: the consent sentence and the button`, v.card.consent.label.startsWith(norm(T(lang, 'plan.consent'))) && canon(v.card.buttons) === canon([{ text: norm(T(lang, 'plan.again', { language: ownName(lang) })), disabled: false }]), { label: v.card.consent.label, buttons: v.card.buttons })
    const leaks = await inPage(leakScan, PLAN_PREFIXES)
    expect(`${lang}: no leaked key, placeholder or stringified nothing`, leaks.length === 0, leaks.join(' | '))
  }
}

async function s22() {
  // The journey is not what is under test: walk it at desktop size, then shrink.
  await startOnAdvisory()
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 360, height: 740, deviceScaleFactor: 2, mobile: true })
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
  const measure = async (what) => {
    const probe = await inPage(mobileProbe, '#plan-consent', 'section')
    expect(`${what}: nothing sticks out past the right edge`, probe.overflow.length === 0 && probe.scrollWidth <= probe.vw + 1, probe)
    expect(`${what}: every tap target is at least 44 px`, probe.taps.length === 0, probe.taps)
    expect(`${what}: no text under 12 px`, probe.small.length === 0, probe.small)
  }
  try {
    await measure('en, at rest')
    await chooseLanguage('hi')
    await settleSnap(3000, (x) => x.card?.title === norm(T('hi', 'plan.title')), planView)
    await measure('hi, at rest')
    await tick('#plan-consent')
    await writePlan(T('hi', 'plan.write'))
    await measure('hi, with a plan')
    await chooseLanguage('en')
    await settleSnap(3000, (x) => x.card?.title === norm(en('plan.title')), planView)
    await measure('en, with a Hindi plan and the note about its language')
    await tick('#plan-consent')
    await writePlan(en('plan.again', { language: ownName('en') }))
    await measure('en, with a plan')
  } finally {
    await cdp.send('Emulation.clearDeviceMetricsOverride')
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false })
  }
}

async function s23() {
  // The questions, one at a time. The page has no speech engine here: this is about the
  // asking, the confirming and the skipping, and S24 is about the voice.
  //
  // First visit: every question skipped, in the form's order, to the end of the list.
  await open(ON, '/talk')
  await tick('#talk-consent')
  let s = await snap()
  expect('it opens on the open question, with no number on it', s.question?.heading === norm(en('talk.askOpen')) && s.question.progress === '', s.question)

  await pressOwed(en('talk.skip'))
  s = await reach('the first question', 4000, (x) => x.question?.heading === ask(0))
  expect('Skip on the open question starts the form questions, at number 1', s.question.progress === progressOf(1), s.question)
  expect('the question has focus', s.question.focused === true, { question: s.question, focus: s.focus })
  expect('the text box is empty', s.text === '', s.text)

  for (let i = 1; i < QUESTIONS.length; i++) {
    await pressOwed(en('talk.skip'))
    s = await reach(`question ${i + 1}`, 4000, (x) => x.question?.heading === ask(i))
    expect(`Skip goes on to question ${i + 1}, with its number and the focus`, s.question.progress === progressOf(i + 1) && s.question.focused === true, s.question)
  }

  // Skipping the last question ends the list.
  await pressOwed(en('talk.skip'))
  s = await reach('the end of the questions', 4000, (x) => x.question?.heading === norm(en('talk.allDone')))
  expect('it says all the questions are done, with no number, and has focus', s.question.progress === '' && s.question.focused === true, s.question)
  expect('there is no text box, no Find and no Skip', s.text === null && !buttonOf(s, en('talk.find')) && !buttonOf(s, en('talk.skip')), { text: s.text, buttons: s.buttons })
  expect('"Continue" leads to the first page with an answer missing: the profile, for the name', s.links.some((l) => l.text === norm(en('common.continue')) && l.href === '/profile'), s.links)
  expect('thirteen skips sent nothing', (await fake.calls()).length === 0)
  const leaks = await inPage(leakScan)
  expect('no leaked key, placeholder or stringified nothing', leaks.length === 0, leaks.join(' | '))
  await pressLink(en('common.continue'))
  await reach('the profile page', 5000, (x) => x.path === '/profile')
  expect('(sanity) the profile page has its form', await has('#main input'))

  // Second visit: the answers. A typed reply: the model is told which question it
  // answers, and the reader is asked whether it is right, not to apply it to a form.
  await open(ON, '/talk')
  await tick('#talk-consent')
  await pressOwed(en('talk.skip'))
  await reach('the first question, second visit', 4000, (x) => x.question?.heading === ask(0))

  await type('#talk-text', 'I do tailoring.')
  await find()
  s = await reach('the review of the first reply', 4000, (x) => x.review !== null)
  let calls = await fake.calls()
  expect('the model was told the reply is about the kind of business', calls.length === 1 && calls[0].asking === 'business_category', calls)
  expect('one answer to confirm', s.review.rows.length === 1, s.review.rows)
  expect('the buttons are "that is right" and "say it again"', canon(s.review.buttons.map((b) => b.text)) === canon([norm(en('talk.right')), norm(en('talk.again'))]), s.review.buttons)
  expect('there is no note about the form', !s.mainText.includes(norm(en('talk.applyNote'))))
  const before = await stored()
  expect('nothing is on the form before "that is right"', !before || before.data.business.category === '', before?.data.business)

  // "No, I will say it again": what was found is dropped and the question stays.
  await pressOwed(en('talk.again'))
  s = await reach('the question again', 4000, (x) => x.review === null && x.question?.focused === true)
  expect('it is the same question, with the same number', s.question.heading === ask(0) && s.question.progress === progressOf(1), s.question)
  expect('the text box was emptied', s.text === '', s.text)
  expect('nothing reached the form', (await stored())?.data.business.category !== 'tailoring')

  await type('#talk-text', 'I do tailoring.')
  await find()
  await reach('the review of the second try', 4000, (x) => x.review?.rows.length === 1)
  await pressOwed(en('talk.right'))
  s = await reach('the second question', 4000, (x) => x.question?.heading === ask(1))
  expect('"that is right" moves on, to number 2', s.question.progress === progressOf(2) && s.review === null, { question: s.question, review: s.review })
  expect('the next question has focus', s.question.focused === true, s.question)
  let data = (await stored()).data
  expect('the kind of business is on the form', data.business.category === 'tailoring', data.business.category)
  expect('and marked as filled by the helper', data.aiFilled.includes('business.category'), data.aiFilled)

  // A reply to another question than the one asked: it is shown and written all the same,
  // and the question that was asked stays open, so the number goes up.
  await type('#talk-text', 'I earn 20000 a month.')
  await find()
  s = await reach('the review of the earnings', 4000, (x) => x.review?.rows.length === 1)
  calls = await fake.calls()
  expect('the model was told the reply is about the money to start', calls.at(-1).asking === 'initial_investment', calls.at(-1))
  expect('what was found is the monthly earnings, which was not asked', s.review.rows[0].spans[0].toLowerCase() === norm(en(FIELD_LABEL_KEYS.expected_monthly_revenue)).toLowerCase(), s.review.rows[0])
  await pressOwed(en('talk.right'))
  s = await reach('the review to go', 4000, (x) => x.review === null && x.question?.progress === progressOf(3))
  data = (await stored()).data
  expect('the earnings are on the form', String(data.business.monthlyRevenue) === '20000', data.business.monthlyRevenue)
  expect('the money to start is still the question, with the number up', s.question.heading === ask(1), s.question)

  // Skip: the question is left out and the next one still open comes.
  await pressOwed(en('talk.skip'))
  s = await reach('the next question', 4000, (x) => x.question?.heading === ask(3))
  expect('the earnings are answered, so Skip goes to the monthly costs, number 4', s.question.progress === progressOf(4) && s.question.focused === true, s.question)
  expect('the skipped answer stays blank', (await stored()).data.business.initialInvestment === '')

  // While a reply is being looked at nothing else can be pressed.
  await fake.set({ delay: 1.5 })
  await type('#talk-text', 'Hello there')
  await pressOwed(en('talk.find'))
  s = await reach('the busy line', 4000, (x) => isBusy(x))
  expect('Skip, Find and the consent box are locked meanwhile', buttonOf(s, en('talk.skip'))?.disabled === true && buttonOf(s, en('talk.find'))?.disabled === true && s.consent.disabled === true, { buttons: s.buttons, consent: s.consent })
  s = await reach('the answer', 10000, (x) => !isBusy(x) && x.review !== null)
  await fake.set({ delay: 0 })
  expect('a reply with no answer in it says so', s.notices.includes(norm(en('talk.noneHere'))), s.notices)
  expect('and offers nothing to confirm', s.review.rows.length === 0 && s.review.buttons.length === 0, s.review)
  expect('what was said is kept, to change or to say again', s.text === 'Hello there', s.text)
  expect('the question is the same', s.question.heading === ask(3), s.question)

  // A spoken reply goes straight on to be looked at: the question is known, so there is
  // no Find to press.
  await fake.set({ transcript: 'My costs are 5000 a month.' })
  await recordFor(1300)
  s = await reach('the spoken reply to be looked at', 15000, (x) => x.review?.rows.length === 1 && !isBusy(x))
  expect('the words it heard are in the text box', s.text === 'My costs are 5000 a month.', s.text)
  calls = await fake.calls()
  expect('the recording went first, then its words', calls.slice(-2).map((c) => c.call).join() === 'transcribe,extract', calls.slice(-2))
  expect('and the model was told the question', calls.at(-1).asking === 'monthly_operating_expenses', calls.at(-1))

  // The same words looked at again while their review is on screen: the two buttons of the
  // review wait as well. Otherwise "that is right" could move on to the next question
  // before the answer on its way back, which belongs to this one, has come.
  await fake.set({ delay: 1.5 })
  await pressOwed(en('talk.find'))
  s = await reach('the busy line, with the review still on screen', 4000, (x) => isBusy(x) && x.review !== null)
  expect('the two buttons of that review are locked meanwhile', s.review.buttons.length === 2 && s.review.buttons.every((b) => b.disabled === true), s.review.buttons)
  await reach('the review again', 10000, (x) => !isBusy(x) && x.review?.rows.length === 1)
  await fake.set({ delay: 0 })
  await pressOwed(en('talk.right'))
  s = await reach('the next question after the spoken one', 4000, (x) => x.question?.heading === ask(4))
  expect('"that is right" moves on to the debt, number 5', s.question.progress === progressOf(5), s.question)
  expect('the monthly costs are on the form', String((await stored()).data.business.monthlyOperatingExpenses) === '5000')

  // One reply that answers several questions: all of it is shown, and the questions it
  // answered are not asked again.
  await type('#talk-text', 'I owe 30000 on a loan. Uttar Pradesh. Lucknow. village. I have 10000 saved. I spend 8000 at home. I pay 1500 EMI.')
  await find()
  s = await reach('the review of seven answers', 4000, (x) => x.review?.rows.length === 7)
  expect('seven answers are shown, all ticked', s.review.rows.every((row) => row.checked === true), s.review.rows)
  expect('and the model was told the debt question', (await fake.calls()).at(-1).asking === 'existing_debt')
  await pressOwed(en('talk.right'))
  s = await reach('the last question', 5000, (x) => x.review === null && x.question?.heading === ask(11))
  expect('only the household income is left, number 12', s.question.progress === progressOf(12), s.question)
  expect('the page stays on /talk while a question is open', s.path === '/talk', s.path)
  data = (await stored()).data
  const got = {
    debt: String(data.business.existingDebt), state: data.location.state, district: data.location.district, area: data.location.locationType,
    capital: String(data.finance.availableCapital), spending: String(data.finance.monthlyExpenses), emi: String(data.finance.monthlyEmi), household: String(data.finance.householdIncome),
  }
  const want = { debt: '30000', state: 'Uttar Pradesh', district: 'Lucknow', area: 'rural', capital: '10000', spending: '8000', emi: '1500', household: '' }
  expect('the form holds what was said, and no household income', canon(got) === canon(want), { got, want })

  // Answering the last question ends the list. The reader is taken on at once to the first
  // page with something missing, the profile for the name; there is no end page to read.
  await type('#talk-text', 'My household earns 12000.')
  await find()
  await reach('the review of the last answer', 4000, (x) => x.review?.rows.length === 1)
  expect('and the model was told the household question', (await fake.calls()).at(-1).asking === 'household_monthly_income')
  await pressOwed(en('talk.right'))
  await reach('the profile page, taken there', 5000, (x) => x.path === '/profile')
  expect('(sanity) the profile page has its form', await has('#main input'))
  expect('the household income is on the form', String((await stored()).data.finance.householdIncome) === '12000', (await stored()).data.finance)

  const asked = (await fake.calls()).filter((c) => c.call === 'extract').map((c) => c.asking)
  expect('every look at a reply named its question', canon(asked) === canon(['business_category', 'business_category', 'initial_investment', 'monthly_operating_expenses', 'monthly_operating_expenses', 'monthly_operating_expenses', 'existing_debt', 'household_monthly_income']), asked)
}

async function s24() {
  const hi = (key) => norm(T('hi', key))
  const lineHi = (i) => hi(QUESTIONS[i][1])

  // An online Hindi voice only, which is what many Windows browsers have. Reading a line in
  // it sends the line to the browser maker's speech service, and the box the reader ticks
  // names Meta, so the line is read when Listen is pressed and not before.
  await open(ON, '/talk', { lang: 'hi', speech: NET_HINDI })
  let s = await snap()
  expect('the question has a speaker button, reading Listen in Hindi', Boolean(buttonOf(s, T('hi', 'ra.listen'))), s.buttons)
  expect('nothing is read before the box is ticked', s.speech.said.length === 0, s.speech)

  await tick('#talk-consent')
  await sleep(700)
  s = await snap()
  expect('ticking the box does not read the question in an online voice', s.speech.said.length === 0 && s.speech.speaking === false && Boolean(buttonOf(s, T('hi', 'ra.listen'))), { speech: s.speech, buttons: s.buttons })
  await pressOwed(T('hi', 'ra.listen'))
  s = await reach('the open question to be read', 3000, (x) => x.speech.said.length === 1)
  expect('Listen reads the open question, in Hindi', norm(s.speech.said[0].text) === hi('talk.askOpen'), s.speech.said)
  expect('in the browser\'s online Hindi voice', s.speech.said[0].voice === 'Net Hindi' && s.speech.said[0].lang === 'hi-IN', s.speech.said)
  expect('while it is read the button says Stop', Boolean(buttonOf(s, T('hi', 'ra.stop'))) && s.speech.speaking === true, { buttons: s.buttons, speech: s.speech })

  // Skip cuts the line off, and the next question waits for a press as well.
  await pressOwed(T('hi', 'talk.skip'))
  await reach('the first question', 3000, (x) => x.question?.heading === lineHi(0))
  await sleep(700)
  s = await snap()
  expect('Skip cuts the line off and the next question is not read in an online voice', s.speech.said.length === 1 && s.speech.speaking === false && Boolean(buttonOf(s, T('hi', 'ra.listen'))), { speech: s.speech, buttons: s.buttons })
  await pressOwed(T('hi', 'ra.listen'))
  s = await reach('the first question to be read', 3000, (x) => x.speech.said.length === 2)
  expect('Listen reads the question that is on the screen', norm(s.speech.said[1].text) === lineHi(0), s.speech.said)

  // Taking the tick away cuts a line the reader started.
  const pressed = s.speech.cancels
  await tick('#talk-consent', false)
  s = await reach('the voice to stop when the box is unticked', 3000, (x) => x.speech.speaking === false)
  expect('unticking the consent box cuts a line started with Listen off', s.speech.cancels > pressed, s.speech)

  // A voice on the device is the one that may start by itself; the rest of this scenario has one.
  await open(ON, '/talk', { lang: 'hi', speech: DEVICE_HINDI })
  s = await snap()
  expect('the question has a speaker button, reading Listen in Hindi', Boolean(buttonOf(s, T('hi', 'ra.listen'))), s.buttons)
  expect('nothing is read before the box is ticked', s.speech.said.length === 0, s.speech)

  await tick('#talk-consent')
  s = await reach('the open question to be read', 3000, (x) => x.speech.said.length === 1)
  expect('ticking the box reads the open question, in Hindi', norm(s.speech.said[0].text) === hi('talk.askOpen'), s.speech.said)
  expect('in the Hindi voice on the device', s.speech.said[0].voice === 'Device Hindi' && s.speech.said[0].lang === 'hi-IN', s.speech.said)
  expect('while it is read the button says Stop', Boolean(buttonOf(s, T('hi', 'ra.stop'))) && s.speech.speaking === true, { buttons: s.buttons, speech: s.speech })

  // The speaker button: stop, then read it again.
  const cancelled = s.speech.cancels
  await pressOwed(T('hi', 'ra.stop'))
  s = await reach('the speaker to stop', 3000, (x) => Boolean(buttonOf(x, T('hi', 'ra.listen'))))
  expect('Stop cancels the engine and the button goes back to Listen', s.speech.cancels > cancelled && s.speech.speaking === false, s.speech)
  await pressOwed(T('hi', 'ra.listen'))
  s = await reach('the line to be read again', 3000, (x) => x.speech.said.length === 2)
  expect('Listen reads the same line again', norm(s.speech.said[1].text) === hi('talk.askOpen'), s.speech.said)
  await inPage(() => window.__speech.finish())
  s = await reach('the end of the line', 3000, (x) => Boolean(buttonOf(x, T('hi', 'ra.listen'))))
  expect('once the engine has read it out the button is Listen again', s.speech.speaking === false, s.speech)

  // Skip while a line is being read: the new question is read, and the engine reporting
  // the cancelled line a moment late does not end it.
  await pressOwed(T('hi', 'ra.listen'))
  await reach('the line to be read a third time', 3000, (x) => x.speech.said.length === 3)
  await pressOwed(T('hi', 'talk.skip'))
  s = await reach('the first question to be read', 3000, (x) => x.question?.heading === lineHi(0) && x.speech.said.length === 4)
  expect('Skip moves to the next question and reads that one', norm(s.speech.said[3].text) === lineHi(0), s.speech.said)
  await sleep(900)
  s = await snap()
  expect('the cancelled line reporting late does not stop the new one', s.speech.speaking === true && Boolean(buttonOf(s, T('hi', 'ra.stop'))), { speech: s.speech, buttons: s.buttons })

  // Find stops the question: the reader's words are being sent and a voice over them
  // helps nobody. "That is right" brings the next question, which is read at once.
  await type('#talk-text', 'I do tailoring.')
  expect('(sanity) a question is being read when Find is pressed', (await snap()).speech.speaking === true)
  await find('hi')
  s = await reach('the review', 4000, (x) => x.review?.rows.length === 1)
  expect('Find stopped the question being read', s.speech.speaking === false && Boolean(buttonOf(s, T('hi', 'ra.listen'))), { speech: s.speech, buttons: s.buttons })
  await pressOwed(T('hi', 'talk.right'))
  s = await reach('the next question to be read', 3000, (x) => x.question?.heading === lineHi(1) && x.speech.said.length === 5)
  expect('after "that is right" the next question is read without a press', norm(s.speech.said[4].text) === lineHi(1) && s.speech.speaking === true, s.speech)

  const lines = new Set(LINES.map(hi))
  expect('only the page\'s own wording was ever read, never what the reader said', s.speech.said.every((x) => lines.has(norm(x.text))) && !s.speech.said.some((x) => /tailoring/i.test(x.text)), s.speech.said)
  const leaks = await inPage(leakScan)
  expect('no leaked key, placeholder or stringified nothing', leaks.length === 0, leaks.join(' | '))

  // Taking the tick away takes the voice away: the line being read is cut off. So is a
  // line being read when the reader leaves the page.
  s = await snap()
  expect('(sanity) the next question is still being read', s.speech.speaking === true, s.speech)
  const beforeUntick = s.speech.cancels
  await tick('#talk-consent', false)
  s = await reach('the voice to stop when the box is unticked', 3000, (x) => x.speech.speaking === false)
  expect('unticking the consent box cuts the question off', s.speech.cancels > beforeUntick, s.speech)
  await tick('#talk-consent')
  s = await reach('the question to be read again when the box is ticked again', 3000, (x) => x.speech.speaking === true)
  const beforeLeaving = s.speech.cancels
  await inPage(() => document.querySelector('#main a[href="/"]')?.click())
  // The address changes before the page is torn down, so wait for the silence, not for the address.
  s = await reach('the landing page, with nothing being read', 4000, (x) => x.path === '/' && x.speech.speaking === false)
  expect('leaving the page cut the question off', s.speech.cancels > beforeLeaving, s.speech)

  // A voice on the device is chosen before an online one, even of another region.
  await open(ON, '/talk', { speech: { voices: [{ name: 'Net English India', lang: 'en-IN', local: false }, { name: 'Local English US', lang: 'en-US', local: true }], delay: 0 } })
  await tick('#talk-consent')
  s = await reach('the open question to be read', 3000, (x) => x.speech.said.length === 1)
  expect('the voice on the device is chosen over the online one', s.speech.said[0].voice === 'Local English US' && s.speech.said[0].lang === 'en-US', s.speech.said)
  expect('and it reads the English question', norm(s.speech.said[0].text) === norm(en('talk.askOpen')), s.speech.said)

  // No voice for the page's language (Tamil, with only Hindi on offer): no button, no sound.
  await open(ON, '/talk', { lang: 'ta', speech: NET_HINDI })
  await tick('#talk-consent')
  await sleep(500)
  s = await snap()
  expect('(sanity) this is the Tamil page', s.h1 === norm(T('ta', 'talk.title')), s.h1)
  expect('with no Tamil voice there is no speaker button', !buttonOf(s, T('ta', 'ra.listen')) && !buttonOf(s, T('ta', 'ra.stop')), s.buttons)
  expect('and nothing is read', s.speech.said.length === 0, s.speech)

  // The browser has not listed its voices yet (some fill the list late): the question that
  // was waiting is read once they come.
  await open(ON, '/talk', { speech: { voices: [], delay: 0 } })
  await tick('#talk-consent')
  await sleep(500)
  s = await snap()
  expect('with no voice listed yet there is no speaker button and nothing is read', !buttonOf(s, en('ra.listen')) && !buttonOf(s, en('ra.stop')) && s.speech.said.length === 0, { buttons: s.buttons, speech: s.speech })
  await inPage(() => window.__speech.setVoices([{ name: 'Late Voice', lang: 'en-IN', local: true }]))
  s = await reach('the waiting question to be read', 3000, (x) => x.speech.said.length === 1)
  expect('once the voices arrive the waiting question is read, with its button', s.speech.said[0].voice === 'Late Voice' && norm(s.speech.said[0].text) === norm(en('talk.askOpen')) && Boolean(buttonOf(s, en('ra.stop'))), { speech: s.speech, buttons: s.buttons })

  // The browser had the list ready the moment the page first asked and announced it before
  // the page had started to listen (a list it kept from an earlier page comes back at once).
  // The page has to read the list again once it is listening, and not wait for an event that
  // has gone by. Found on the owner's Edge on 1 Nov 2026: 326 voices listed, no speaker button.
  // The owner's Hindi page first (their only Hindi voices are online ones): the button has to
  // be there, and the box alone reads nothing. It has no reach(), so the English walk below,
  // which halts when the page never reads, cannot hide it.
  await open(ON, '/talk', { lang: 'hi', speech: { ...NET_HINDI, listed: 'early' } })
  s = await snap()
  expect('(sanity) the engine listed its voices, and told nobody: the page was not yet listening', s.speech.voices.length === 1 && s.speech.announcedTo === 0, s.speech)
  expect('an online Hindi voice announced early still gives the Hindi page its Listen button', Boolean(buttonOf(s, T('hi', 'ra.listen'))), s.buttons)
  await tick('#talk-consent')
  await sleep(700)
  s = await snap()
  expect('and ticking the box reads nothing in an online voice', s.speech.said.length === 0 && s.speech.speaking === false, s.speech)

  await open(ON, '/talk', { speech: { voices: [{ name: 'Early Voice', lang: 'en-IN', local: true }], delay: 0, listed: 'early' } })
  s = await snap()
  expect('(sanity) the same, with a voice on the device', s.speech.voices.length === 1 && s.speech.announcedTo === 0, s.speech)
  expect('a list announced before the page was listening still gives the speaker button', Boolean(buttonOf(s, en('ra.listen'))), s.buttons)
  await tick('#talk-consent')
  s = await reach('the open question to be read', 3000, (x) => x.speech.said.length === 1)
  expect('and ticking the box reads the open question in that voice on the device', s.speech.said[0].voice === 'Early Voice' && norm(s.speech.said[0].text) === norm(en('talk.askOpen')), s.speech.said)
}

async function s25() {
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 360, height: 740, deviceScaleFactor: 2, mobile: true })
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
  const measure = async (what) => {
    const probe = await inPage(mobileProbe)
    expect(`${what}: nothing sticks out past the right edge`, probe.overflow.length === 0 && probe.scrollWidth <= probe.vw + 1, probe)
    expect(`${what}: every tap target is at least 44 px`, probe.taps.length === 0, probe.taps)
    expect(`${what}: no text under 12 px`, probe.small.length === 0, probe.small)
  }
  try {
    // English with no speech engine; then Hindi, with the speaker button the voice brings.
    await open(ON, '/talk', { lang: 'en' })
    await measure('en, the open question')
    await tick('#talk-consent')
    await pressOwed(en('talk.skip'))
    await reach('the first question', 4000, (x) => x.question?.heading === ask(0))
    await measure('en, a question with its number')

    await open(ON, '/talk', { lang: 'hi', speech: NET_HINDI })
    await measure('hi, the open question with its speaker button')
    await tick('#talk-consent')
    await pressOwed(T('hi', 'talk.skip'))
    await reach('the first question', 4000, (x) => x.question?.heading === norm(T('hi', QUESTIONS[0][1])))
    await measure('hi, a question with its number and its speaker button')
    await type('#talk-text', 'I do tailoring.')
    await find('hi')
    await reach('the review', 4000, (x) => x.review?.rows.length === 1)
    await measure('hi, a question under review')
    await pressOwed(T('hi', 'talk.again'))
    await reach('the question again', 4000, (x) => x.review === null)
    await type('#talk-text', 'Hello there')
    await find('hi')
    await reach('the answer', 4000, (x) => x.review?.rows.length === 0)
    await measure('hi, no answer found')
    // Skip to the end: question 1 is on screen, so it is 12 skips to "all done".
    for (let i = 1; i <= QUESTIONS.length; i++) {
      await pressOwed(T('hi', 'talk.skip'))
      const line = i < QUESTIONS.length ? QUESTIONS[i][1] : 'talk.allDone'
      await reach(`the line ${line}`, 4000, (x) => x.question?.heading === norm(T('hi', line)))
    }
    await measure('hi, all the questions done')
  } finally {
    await cdp.send('Emulation.clearDeviceMetricsOverride')
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false })
  }
}

// --- the voice home: the landing page when the helper is on ---------------------
// The same TalkPage as /talk with a big microphone in place of the text box. S26-S30 hold the
// differences; the questions, the review and the consent lock are S2-S25's on the other page.
async function s26() {
  await open(ON, '/')
  let s = await snap()
  expect('the landing page is the voice home: its heading is the landing title', s.h1 === norm(en('landing.title')), s.h1)
  expect('it asks the open question, with no number on it', s.question?.heading === norm(en('talk.askOpen')) && s.question.progress === '', s.question)
  expect('a microphone stands at rest and enabled', s.mic?.recording === false && s.mic.disabled === false, s.mic)
  expect('and says what it does', Boolean(buttonOf(s, en('talk.record'))), s.buttons)
  expect('there is no text box, no language box and no Find', s.text === null && s.language === null && !buttonOf(s, en('talk.find')), { text: s.text, language: s.language, buttons: s.buttons })
  expect('Skip is offered', buttonOf(s, en('talk.skip'))?.disabled === false, s.buttons)
  expect('"use the form instead" leads to the form', s.links.some((l) => l.text === norm(en('talk.toForm')) && l.href === '/profile'), s.links)
  expect('the page where the answers can be typed is one link away', s.links.some((l) => l.text === norm(en('talk.title')) && l.href === '/talk'), s.links)
  expect('what is sent, and to whom, is on the page before the first press', s.mainText.includes(norm(en('talk.sendsText'))), 'talk.sendsText is not on the page')
  expect('the consent box starts unticked', s.consent?.checked === false, s.consent)
  expect('there is no age box on this build', s.age === null, s.age)
  expect('no keyframe animation runs at rest', s.loops.length === 0, s.loops)
  const leaks = await inPage(leakScan, HOME_PREFIXES)
  expect('no leaked key, placeholder or stringified nothing', leaks.length === 0, leaks.join(' | '))

  // The microphone refuses until the box is ticked, says why, and sends nothing.
  const pressed = await pressMic()
  expect('the microphone was pressed', pressed === 'clicked', pressed)
  s = await settleSnap(4000, (x) => Boolean(alertText(x, 'talk-consent-error')))
  expect('the error says to tick the box', norm(alertText(s, 'talk-consent-error')) === norm(en('talk.consentRequired')), s.alerts)
  expect('the box has focus', s.focus === 'talk-consent', s.focus)
  expect('the box is marked invalid', s.consent.invalid === 'true', s.consent)
  expect('the microphone was not asked for', s.gumCalls === 0, s.gumCalls)
  expect('the microphone is still at rest', s.mic.recording === false, s.mic)
  expect('nothing was sent', (await fake.calls()).length === 0)
  // A page that let the press through is recording and has locked the box: end that first.
  if (s.mic.recording) {
    await tryPress(en('talk.cancel'))
    await sleep(300)
  }
  await tick('#talk-consent')
  s = await snap()
  expect('ticking clears the error and the invalid mark', !alertText(s, 'talk-consent-error') && s.consent.invalid === null, { alerts: s.alerts, consent: s.consent })
}

async function s27() {
  // One recording says everything. The answers are looked for the moment it ends (there is no
  // Find), the reader checks them, the page asks what is left, and the reader is taken on.
  await open(ON, '/')
  await tick('#talk-consent')
  await fake.set({ transcript: SENTENCE })
  await recordFor(1300)
  let s = await reach('the review of what was said', 15000, (x) => x.review?.rows.length === 12 && !isBusy(x))
  let calls = await fake.calls()
  expect('the recording went first, then its words, and the open turn names no question', calls.map((c) => c.call).join() === 'transcribe,extract' && calls[1].asking === null, calls)
  expect('it was sent in the page language', calls[0].language === 'English', calls[0])
  expect('the review is titled and has focus', s.review.title === norm(en('talk.reviewTitle')) && s.review.focused, s.review)
  const nums = await inPage(() => [...document.querySelectorAll('#main .ui-formsection-num')].map((el) => getComputedStyle(el).display))
  expect('the consent and the review carry no step number on the home page', nums.length === 2 && nums.every((d) => d === 'none'), nums)
  FIELD_ORDER.forEach((field, i) => {
    const [value] = ROWS[field]
    const want = typeof value === 'function' ? value('en') : value
    expect(`${field}: the answer, ticked`, s.review.rows[i]?.spans[1] === norm(want) && s.review.rows[i].checked === true, s.review.rows[i])
  })
  expect('"use these answers" is offered', s.review.buttons.some((b) => b.text === norm(en('talk.apply')) && b.disabled === false), s.review.buttons)
  const before = await stored()
  expect('nothing is applied before the button', !before || (before.data.business.initialInvestment === '' && before.data.aiFilled.length === 0), before?.data)

  await untickLucknowAndApply()
  s = await settleSnap(2000, (x) => x.question?.focused === true)
  expect('the page stays on the home page', s.path === '/', s.path)
  expect('and asks the one question left, the district, as the last of the list', s.question.progress === progressOf(QUESTIONS.length) && s.question.focused === true, s.question)
  expect('the review is gone', s.review === null, s.review)
  const saved = await stored()
  expect('aiFilled names exactly what was written', sameSet(saved.data.aiFilled, FILLED_PATHS), saved.data.aiFilled)
  expect('the unticked district was not written', saved.data.location.district === '', saved.data.location.district)

  // The question left, answered aloud: the model is told which question it is.
  await fake.set({ transcript: 'Lucknow' })
  await recordFor(1300)
  s = await reach('the review of the district', 15000, (x) => x.review?.rows.length === 1 && !isBusy(x))
  calls = await fake.calls()
  expect('the recording went first, then its words, and the model was told the question', calls.slice(-2).map((c) => c.call).join() === 'transcribe,extract' && calls.at(-1).asking === 'district', calls.slice(-2))
  expect('the buttons are "that is right" and "say it again"', canon(s.review.buttons.map((b) => b.text)) === canon([norm(en('talk.right')), norm(en('talk.again'))]), s.review.buttons)
  await pressOwed(en('talk.right'))
  await reach('the profile page, taken there for the name', 5000, (x) => x.path === '/profile')
  expect('the district is on the form', (await stored()).data.location.district === 'Lucknow', (await stored()).data.location)

  // Every question skipped: the open one, then the twelve, to the end. No microphone then,
  // and the way on is a link; thirteen skips send nothing.
  await open(ON, '/')
  await tick('#talk-consent')
  for (let i = 0; i <= QUESTIONS.length; i++) {
    await pressOwed(en('talk.skip'))
    const line = i < QUESTIONS.length ? QUESTIONS[i][1] : 'talk.allDone'
    await reach(`the line ${line}`, 4000, (x) => x.question?.heading === norm(en(line)))
  }
  s = await snap()
  expect('the end says all the questions are done, with no number, and has focus', s.question.progress === '' && s.question.focused === true, s.question)
  expect('the microphone and Skip are gone', s.mic === null && !buttonOf(s, en('talk.skip')), { mic: s.mic, buttons: s.buttons })
  expect('"Continue" leads to the first page with an answer missing: the profile, for the name', s.links.some((l) => l.text === norm(en('common.continue')) && l.href === '/profile'), s.links)
  expect('thirteen skips sent nothing', (await fake.calls()).length === 0)
  const leaks = await inPage(leakScan, HOME_PREFIXES)
  expect('no leaked key, placeholder or stringified nothing', leaks.length === 0, leaks.join(' | '))
}

async function s28() {
  // The microphone through its states, and every way out of them.
  await open(ON, '/')
  await tick('#talk-consent')
  await startRecording()
  let s = await snap()
  expect('while recording the microphone is red and says Stop', s.mic?.recording === true && Boolean(buttonOf(s, en('talk.stop'))), s.mic)
  expect('the status line says to speak and press Stop', s.statuses.includes(norm(en('talk.recording', { stop: en('talk.stop') }))), s.statuses)
  expect('Cancel is offered', Boolean(buttonOf(s, en('talk.cancel'))), s.buttons)
  expect('the consent box and Skip are locked', s.consent.disabled === true && buttonOf(s, en('talk.skip'))?.disabled === true, { consent: s.consent, buttons: s.buttons })
  expect('one loop runs: the ring, which moves opacity and transform and nothing that is painted', s.loops.join() === 'ui-mic-ping:opacity,transform', s.loops)
  const peak = await levelPeak(2500)
  expect('the ring follows the voice: the level rose above 0 while the fake microphone beeped', peak > 0, peak)

  await pressOwed(en('talk.cancel'))
  s = await reach('the microphone back after Cancel', 5000, (x) => x.mic?.recording === false && x.consent.disabled === false)
  expect('Cancel: the microphone is released', allEnded(s), s.tracks)
  expect('Cancel: the microphone is back and enabled', Boolean(buttonOf(s, en('talk.record'))) && s.mic.disabled === false, s.mic)
  expect('Cancel: the ring stops', s.loops.length === 0, s.loops)
  expect('Cancel: Skip is unlocked', buttonOf(s, en('talk.skip'))?.disabled === false, s.buttons)
  expect('Cancel: nothing was sent', (await fake.calls()).length === 0)

  // A recording the service turns away: the reason, and the microphone back for another try.
  await fake.set({ fail: 'rate_limited' })
  await recordFor(1300)
  s = await reach('the transcription error', 15000, (x) => Boolean(alertText(x)) && x.mic?.recording === false && !isBusy(x))
  expect('a recording that is turned away says talk.errBusy', norm(alertText(s)) === norm(en('talk.errBusy')), alertText(s))
  expect('the microphone is back and enabled', s.mic.disabled === false, s.mic)
  expect('the box and Skip are unlocked', s.consent.disabled === false && buttonOf(s, en('talk.skip'))?.disabled === false, { consent: s.consent, buttons: s.buttons })
  expect('there is no review', s.review === null, s.review)

  // Cancel while the recording is out: nothing the late answer brings is shown.
  await fake.reset()
  await fake.set({ delay: 2.5, transcript: SENTENCE })
  await recordFor(1300)
  s = await reach('the busy line', 5000, (x) => isBusy(x))
  expect('while the recording is out: Cancel is offered, the microphone and the box are locked', Boolean(buttonOf(s, en('talk.cancel'))) && s.mic.disabled === true && s.consent.disabled === true, { buttons: s.buttons, mic: s.mic, consent: s.consent })
  expect('one loop runs: the spinner, which turns and moves transform only', s.loops.join() === 'spin:transform', s.loops)
  await pressOwed(en('talk.cancel'))
  s = await reach('Cancel to take effect', 5000, (x) => !buttonOf(x, en('talk.cancel')) && !isBusy(x))
  expect('after Cancel: the microphone is back and no error is shown', s.mic.disabled === false && s.alerts.length === 0, { mic: s.mic, alerts: s.alerts })
  expect('after Cancel: the spinner stops', s.loops.length === 0, s.loops)
  await sleep(3500)
  s = await snap()
  expect('and the late answer is dropped: no review and no error', s.review === null && s.alerts.length === 0, { review: s.review, alerts: s.alerts })
  const late = await fake.calls()
  expect('(sanity) the backend got the recording, and was never asked to look for answers', late.filter((c) => c.call === 'transcribe').length === 1 && late.filter((c) => c.call === 'extract').length === 0, late)
  await fake.reset()

  // The browser asks for the microphone, and refuses, or has none.
  await inPage(() => { window.__gum.mode = 'defer' })
  await pressOwed(en('talk.record'))
  await reach('the permission question to be open', 5000, (x) => x.pending === 1)
  await sleep(250)
  s = await snap()
  expect('while the browser asks: the box and Skip are locked, the microphone is off and there is no Stop', s.consent.disabled === true && buttonOf(s, en('talk.skip'))?.disabled === true && s.mic.disabled === true && !buttonOf(s, en('talk.stop')), { consent: s.consent, buttons: s.buttons, mic: s.mic })
  await inPage(() => window.__gum.refuse('NotAllowedError'))
  s = await reach('the refusal', 5000, (x) => norm(alertText(x)) === norm(en('talk.errMicDenied')))
  expect('refused: the box and Skip are unlocked and the microphone is back', s.consent.disabled === false && buttonOf(s, en('talk.skip'))?.disabled === false && s.mic.disabled === false, { consent: s.consent, buttons: s.buttons, mic: s.mic })
  await inPage(() => { window.__gum.mode = 'none' })
  await pressOwed(en('talk.record'))
  s = await reach('the no-microphone error', 5000, (x) => norm(alertText(x)) === norm(en('talk.errMicNone')))
  expect('no microphone: the box is unlocked and the microphone is back', s.consent.disabled === false && s.mic.disabled === false, { consent: s.consent, mic: s.mic })

  // Leaving for /talk in the middle of a recording: the two pages share one component, so
  // the lock, the tick and the microphone must not be carried over.
  await inPage(() => { window.__gum.mode = 'real' })
  await startRecording()
  await pressLink(en('talk.title'))
  s = await reach('/talk', 5000, (x) => x.path === '/talk' && x.h1 === norm(en('talk.title')))
  expect('/talk starts as a new page: the box is unticked and unlocked', s.consent.checked === false && s.consent.disabled === false, s.consent)
  expect('and Skip and the microphone are unlocked', buttonOf(s, en('talk.skip'))?.disabled === false && buttonOf(s, en('talk.record'))?.disabled === false, s.buttons)
  // React lets go of the old page a moment after the new one is drawn, so the tracks get
  // a short while to end; a recording that is never cut off still fails.
  s = await settleSnap(2000, allEnded)
  expect('the recording was cut off and the microphone released', allEnded(s), s.tracks)

  // Malayalam has no speech model: the notice stands where the microphone would.
  const ml = LANGUAGES.find((l) => l.code === 'ml')
  await open(ON, '/', { lang: 'ml' })
  s = await snap()
  expect('ml: there is no microphone', s.mic === null && !buttonOf(s, T('ml', 'talk.record')), { mic: s.mic, buttons: s.buttons })
  expect('ml: the page says speaking is not available', s.notices.includes(norm(T('ml', 'talk.langNoSpeech', { language: ml.endonym }))), s.notices)
  expect('ml: Skip and the way to the form are still there', buttonOf(s, T('ml', 'talk.skip'))?.disabled === false && s.links.some((l) => l.href === '/profile'), { buttons: s.buttons, links: s.links })
}

async function s29() {
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 360, height: 740, deviceScaleFactor: 2, mobile: true })
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
  const measure = async (what) => {
    const probe = await inPage(mobileProbe)
    expect(`${what}: nothing sticks out past the right edge`, probe.overflow.length === 0 && probe.scrollWidth <= probe.vw + 1, probe)
    expect(`${what}: every tap target is at least 44 px`, probe.taps.length === 0, probe.taps)
    expect(`${what}: no text under 12 px`, probe.small.length === 0, probe.small)
  }
  try {
    for (const lang of ['en', 'hi', 'ta']) {
      await open(ON, '/', { lang })
      await measure(`${lang}, at rest`)
      await tick('#talk-consent')
      const pressed = await pressMic()
      if (pressed !== 'clicked') throw new Fault(`the microphone was ${pressed}`)
      await reach(`${lang}: recording to start`, 8000, (x) => x.mic?.recording === true)
      await measure(`${lang}, recording`)
      await pressOwed(T(lang, 'talk.cancel'))
      await reach(`${lang}: the microphone back`, 5000, (x) => x.mic?.recording === false)
    }
    // The microphone has to be on the first screen of a small phone, under the app's header.
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 360, height: 640, deviceScaleFactor: 2, mobile: true })
    for (const lang of ['en', 'hi']) {
      await open(ON, '/', { lang })
      const s = await snap()
      expect(`${lang}: the whole microphone is on the first screen of a 360 x 640 phone`, s.mic !== null && s.mic.bottom <= s.mic.viewport, s.mic)
    }
  } finally {
    await cdp.send('Emulation.clearDeviceMetricsOverride')
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: false })
  }
}

async function s30() {
  const hi = (key) => norm(T('hi', key))
  // A voice on the device reads the open question by itself once the box is ticked, and
  // pressing the microphone ends it, so that the microphone does not hear the question.
  await open(ON, '/', { lang: 'hi', speech: DEVICE_HINDI })
  let s = await snap()
  expect('the question has a speaker button, reading Listen in Hindi', Boolean(buttonOf(s, T('hi', 'ra.listen'))), s.buttons)
  expect('nothing is read before the box is ticked', s.speech.said.length === 0, s.speech)
  await tick('#talk-consent')
  s = await reach('the open question to be read', 3000, (x) => x.speech.said.length === 1)
  expect('ticking the box reads the open question, in Hindi, in the voice on the device', norm(s.speech.said[0].text) === hi('talk.askOpen') && s.speech.said[0].voice === 'Device Hindi', s.speech.said)
  expect('while it is read the button says Stop', Boolean(buttonOf(s, T('hi', 'ra.stop'))) && s.speech.speaking === true, { buttons: s.buttons, speech: s.speech })
  const cancelled = s.speech.cancels
  const pressed = await pressMic()
  if (pressed !== 'clicked') throw new Fault(`the microphone was ${pressed}`)
  s = await reach('the recording to start', 8000, (x) => x.mic?.recording === true)
  expect('pressing the microphone ends the question being read', s.speech.speaking === false && s.speech.cancels > cancelled, s.speech)
  // The recording is sent in the page's language, not in English (S27's is English).
  await sleep(1300)
  await pressMic()
  let calls = []
  for (let i = 0; i < 250 && calls.length === 0; i++) { await sleep(60); calls = await fake.calls() }
  expect('the recording went to Meta in Hindi', calls[0]?.call === 'transcribe' && calls[0].language === 'Hindi', calls.map((c) => `${c.call}:${c.language}`))
  await settleSnap(15000, (x) => !isBusy(x, 'hi'))

  // A voice over the network reads the question when Listen is pressed and not before.
  await open(ON, '/', { lang: 'hi', speech: NET_HINDI })
  await tick('#talk-consent')
  await sleep(700)
  s = await snap()
  expect('an online voice reads nothing by itself', s.speech.said.length === 0 && s.speech.speaking === false, s.speech)
  await pressOwed(T('hi', 'ra.listen'))
  s = await reach('the open question to be read', 3000, (x) => x.speech.said.length === 1)
  expect('Listen reads the open question once, in the online voice', norm(s.speech.said[0].text) === hi('talk.askOpen') && s.speech.said[0].voice === 'Net Hindi', s.speech.said)
  const leaks = await inPage(leakScan, HOME_PREFIXES)
  expect('no leaked key, placeholder or stringified nothing', leaks.length === 0, leaks.join(' | '))
}

// --- main ---------------------------------------------------------------------
async function main() {
  for (const [what, port] of [['the debugging port', DEBUG_PORT], ['the fake backend', FAKE_PORT], ['Vite (helper on)', VITES.on], ['Vite (helper off)', VITES.off], ['Vite (age box)', VITES.age]]) {
    const held = await portInUse(port)
    if (held) throw new Error(`port ${port} (${what}) is already in use (${held}); free it before running this gate`)
  }

  rmSync(OUT, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
  mkdirSync(PROFILE_DIR, { recursive: true })

  await startFake()
  // One after the other: they share frontend/node_modules/.vite.
  await startVite(VITES.on, { VITE_AI_HELPER: 'true', VITE_REQUIRE_AGE_CHECK: 'false' })
  await startVite(VITES.off, { VITE_AI_HELPER: 'false', VITE_REQUIRE_AGE_CHECK: 'false' })
  await startVite(VITES.age, { VITE_AI_HELPER: 'true', VITE_REQUIRE_AGE_CHECK: 'true' })

  edgeStarted = true
  const edge = spawn(EDGE, [
    '--headless=new',
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${PROFILE_DIR}`,
    '--remote-allow-origins=*',
    '--window-size=1280,900',
    '--disable-gpu', '--disable-sync', '--no-first-run',
    '--no-default-browser-check', '--disable-extensions',
    '--disable-features=Translate,MediaRouter',
    '--edge-skip-compat-layer-relaunch',
    // A synthetic microphone, and no permission question to answer by hand.
    '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream',
    '--autoplay-policy=no-user-gesture-required',
  ], { stdio: 'ignore' })
  children.push(edge)

  cdp = new CDP(await browserWsUrl())
  await cdp.ready
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' }, false)
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true }, false)
  cdp.sessionId = sessionId
  await cdp.send('Page.enable')
  await cdp.send('Runtime.enable')
  await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: true })
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: `(${pageLibrary.toString()})();(${speechFake.toString()})()` })

  await run('S0', 'helper off: no link, /talk is the not-found page', s0)
  await run('S1', 'helper on: links, page, starting state', s1)
  await run('S2', 'consent gate', s2)
  await run('S2b', 'age gate', s2b)
  await run('S3', 'typed sentence -> review -> apply -> banners', s3)
  await run('S4', 'voice: record, stop, WAV, microphone released', s4)
  await run('S5', 'boxes stay locked while the browser asks for the microphone', s5)
  await run('S6', 'error codes, a failed transcription, api.js limits', s6)
  await run('S7', 'Cancel while a request is out', s7)
  await run('S8', 'Malayalam: no speech, typing works', s8)
  await run('S9', 'microphone refused or missing', s9)
  await run('S10', 'all 8 languages', s10)
  await run('S11', '360 px phone', s11)
  await run('S12', 'editing a filled answer removes only it', s12)
  await run('S13', 'a recorder that will not start leaves the microphone off', s13)
  await run('S14', 'leaving the page releases the microphone', s14)
  await run('S15', 'the consent lock holds until the recording is sent', s15)
  await run('S16', 'the plan card at rest: its own consent tick, nothing sent', s16)
  await run('S17', 'one plan: the request, what the model sees, the card, the stored plan', s17)
  await run('S18', 'a plan in English, then Hindi, then English', s18)
  await run('S19', 'a refused plan and every way to fail', s19)
  await run('S20', 'Cancel while the plan is being written', s20)
  await run('S21', 'a plan in each of the 8 languages', s21)
  await run('S22', '360 px phone: the plan card at rest and with a plan', s22)
  await run('S23', 'the questions one at a time', s23)
  await run('S24', 'the question read aloud', s24)
  await run('S25', '360 px phone: the guided questions', s25)
  await run('S26', 'voice home: the page at rest and the consent gate on the microphone', s26)
  await run('S27', 'voice home: the spoken way through, to the form', s27)
  await run('S28', 'voice home: recording, failing, Cancel, no speech, no microphone, the link to /talk', s28)
  await run('S29', '360 px phone: the voice home', s29)
  await run('S30', 'voice home: the question read aloud', s30)

  cdp.ws.close()
  cleanup()

  const failures = results.flatMap((r) => r.checks.filter((c) => !c.ok).map((c) => ({ scenario: r.id, name: c.name, detail: c.detail })))
  const faults = results.filter((r) => r.fault).map((r) => ({ scenario: r.id, fault: r.fault }))
  const exit = faults.length > 0 ? 2 : failures.length > 0 ? 1 : 0
  const checks = results.reduce((n, r) => n + r.checks.length, 0)

  writeFileSync(resolve(OUT, 'report.json'), JSON.stringify({
    exit,
    only: ONLY.length > 0 ? ONLY : null,
    checks,
    scenarios: results.map((r) => ({
      id: r.id, title: r.title, checks: r.checks.length,
      failed: r.checks.filter((c) => !c.ok).length, fault: r.fault,
    })),
    failures,
    faults,
    pageErrors: cdp.pageErrors,
  }, null, 2))

  console.log('')
  for (const r of results) {
    const failed = r.checks.filter((c) => !c.ok).length
    console.log(`${r.fault ? 'FAULT' : failed ? 'FAIL ' : 'ok   '} ${r.id.padEnd(4)} ${r.title} (${r.checks.length} checks${failed ? `, ${failed} failed` : ''})`)
  }
  console.log(`\n${checks} checks, ${failures.length} failed, ${faults.length} scenario(s) could not be measured. Exit ${exit}.${ONLY.length > 0 ? ` Partial run: ${ONLY.join(',')}.` : ''}`)
  process.exitCode = exit
  // A half-closed socket must not hold the run open. Unref'd, so a clean exit is
  // untouched; it only fires if something else is still keeping node alive.
  setTimeout(() => crashExit(exit), 5000).unref()
}

main().catch((err) => {
  console.error(err)
  cleanup()
  process.exitCode = 2
  setTimeout(() => crashExit(2), 5000).unref()
})
