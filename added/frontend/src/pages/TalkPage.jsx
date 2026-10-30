import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { applyHelperFill, firstUnansweredStep, useApp } from '../context/AppContext'
import Button from '../components/Button'
import SpeakerIcon from '../components/SpeakerIcon'
import { MAX_SECONDS, micAvailable, startRecording } from '../audio/record'
import useQuestionVoice from '../audio/useQuestionVoice'
import { DEPLOYMENT } from '../config/deployment'
import { MAX_TALK_TEXT } from '../data/limits'
import {
  AREA_LABELS,
  CATEGORY_LABELS,
  FIELD_LABEL_KEYS,
  NO_SPEECH_LANGUAGES,
  QUESTIONS,
  landedFields,
  matchAnswers,
  patchesFor,
  pendingQuestions,
} from '../data/talkAnswers'
import { extractAnswers, isAbortError, transcribeRecording } from '../services/api'
import { LANGUAGES } from '../i18n/languages'
import { useI18n } from '../i18n/LanguageContext'
import { useNoticeText } from '../i18n/noticeText'

const fieldClass = 'mt-2 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4 text-base text-[var(--color-text)] shadow-sm outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary-strong)]'

// The voice-first way in: the page asks about the business, the reader says or types
// the answer, and an AI service run by Meta finds the answers in it. The first question
// asks everything at once; then the page asks, one at a time and aloud, only for what
// is still missing. Nothing it finds reaches the form until the reader has looked at
// each answer and pressed the button. The result, the schemes and the advice are not
// touched by it: they are still worked out by fixed rules from the answers. The form
// itself stays one press away.
function TalkPage() {
  const { applicationData, fillFromHelper } = useApp()
  const { t, language } = useI18n()
  const tn = useNoticeText()
  const navigate = useNavigate()

  // Given for what is sent from this page, so they live here and not in
  // AppContext or sessionStorage, as on /finance: leave and come back, and they
  // are unticked again.
  const [consent, setConsent] = useState(false)
  const [age, setAge] = useState(false)
  const [consentMissing, setConsentMissing] = useState(false)
  const [ageMissing, setAgeMissing] = useState(false)
  const consentRef = useRef(null)
  const ageRef = useRef(null)

  // The language the reader speaks or types in, which is not the language of the
  // page and does not change it. It starts as the page's, and stays put after.
  const [spoken, setSpoken] = useState(language)
  const [text, setText] = useState('')
  const [recording, setRecording] = useState(false)
  // '' | 'transcribing' | 'finding': which request is out.
  const [busy, setBusy] = useState('')
  // A talk.err* code, not a sentence, so it follows a change of language.
  const [error, setError] = useState('')
  // { rows, ignored } once answers have been found in the text, else null.
  const [found, setFound] = useState(null)
  // Fields whose box the reader unticked.
  const [dropped, setDropped] = useState({})
  // The fields answered or skipped on this page, so that no question is asked twice (a
  // blank form is not enough to tell: an answer equal to a field's starting value looks
  // unanswered), and whether the open first question has been used or skipped.
  const [done, setDone] = useState(() => new Set())
  const [openDone, setOpenDone] = useState(false)
  // Counts up to bring the focus back to the question once an answer has been used,
  // skipped or taken back, because the box it was in has gone from the page.
  const [refocus, setRefocus] = useState(0)
  const requestRef = useRef(null)
  const reviewRef = useRef(null)
  const questionRef = useRef(null)

  // Leaving the page abandons the request in flight.
  useEffect(() => () => requestRef.current?.abort(), [])

  // A screen reader or a keyboard lands on the answers when they appear.
  useEffect(() => {
    if (found) reviewRef.current?.focus()
  }, [found])

  useEffect(() => {
    if (refocus > 0) questionRef.current?.focus()
  }, [refocus])

  const pending = pendingQuestions(applicationData, done)
  // While nothing has been answered the page asks for everything at once.
  const open = !openDone && pending.length === QUESTIONS.length
  const question = open ? null : (pending[0] ?? null)
  const finished = !open && question === null
  const lineKey = open ? 'talk.askOpen' : question ? question.key : 'talk.allDone'
  // The question is read aloud from the moment the reader has agreed to what is sent.
  const voice = useQuestionVoice(language, t(lineKey), consent)
  // Where "use the form instead" goes: the first step with something missing.
  const formStep = firstUnansweredStep(applicationData) ?? '/finance'

  const tooLong = text.length > MAX_TALK_TEXT
  const speechSupported = !NO_SPEECH_LANGUAGES.includes(spoken)
  const spokenEntry = LANGUAGES.find((entry) => entry.code === spoken)

  // Both calls send the reader's words to the AI service, so both wait for the
  // box. The buttons are not disabled for it: a disabled button gives no reason.
  // Both also end the spoken question: the microphone must not hear it, and a
  // screen reader must not have to talk over it.
  function agreed() {
    voice.stop()
    const needsAge = DEPLOYMENT.requireAgeCheck && !age
    setConsentMissing(!consent)
    setAgeMissing(needsAge)
    if (!consent) consentRef.current?.focus()
    else if (needsAge) ageRef.current?.focus()
    return consent && !needsAge
  }

  function mayRecord() {
    setError('')
    return agreed()
  }

  // One request at a time: both buttons wait while one is out.
  async function send(kind, call) {
    const controller = new AbortController()
    requestRef.current = controller
    setBusy(kind)
    setError('')
    try {
      await call(controller.signal)
    } catch (failure) {
      if (!isAbortError(failure)) setError(failure.code ?? 'talk.errGeneric')
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null
        setBusy('')
      }
    }
  }

  function transcribe(wav) {
    return send('transcribing', async (signal) => {
      const heard = (await transcribeRecording(wav, spoken, { signal })).trim()
      if (heard === '') {
        setError('talk.errSilence')
        return
      }
      if (question) {
        // The reply to one question is looked into at once and replaces what was there.
        // The boxes stay locked until the answers are back, as during the recording.
        setText(heard)
        setBusy('finding')
        await lookFor(heard, signal)
        return
      }
      // Added after what is there, so a second recording adds a sentence. The
      // reader can fix a misheard word before asking for the answers.
      setText((before) => (before.trim() === '' ? heard : `${before.trim()} ${heard}`))
      setFound(null)
    })
  }

  // `asking` tells the service which question the reply answers, so that a word or
  // two ("Lucknow", "forty thousand") is read as the answer to it.
  async function lookFor(words, signal) {
    const { answers, ignored } = await extractAnswers(words, spoken, { signal, asking: question?.field })
    setFound({ rows: matchAnswers(answers, applicationData.location.state), ignored })
    setDropped({})
  }

  function find() {
    if (!agreed()) return
    return send('finding', (signal) => lookFor(text.trim(), signal))
  }

  // What was on the screen for the last question goes, and the focus goes to the next.
  function nextQuestion() {
    setText('')
    setFound(null)
    setDropped({})
    setError('')
    setRefocus((n) => n + 1)
  }

  function apply() {
    const kept = found.rows.filter((row) => !dropped[row.field])
    const patches = patchesFor(kept, applicationData.location)
    const next = applyHelperFill(applicationData, patches)
    // Only what reached the form is answered: the rest is asked again.
    const answered = new Set([...done, ...landedFields(kept, patches)])
    fillFromHelper(patches)
    setDone(answered)
    setOpenDone(true)
    nextQuestion()
    // Asked everything: on to the first step of the form that still has a gap.
    if (pendingQuestions(next, answered).length === 0) navigate(firstUnansweredStep(next) ?? '/finance')
  }

  function skip() {
    if (open) setOpenDone(true)
    else setDone((before) => new Set(before).add(question.field))
    nextQuestion()
  }

  const usable = found?.rows.some((row) => row.ok)
  // A recording or a request is out: nothing that changes the question may be pressed,
  // because the answer on its way back belongs to the question that was asked.
  const locked = recording || busy !== ''

  return (
    <section className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <Link
          to="/"
          className="inline-flex min-h-11 min-w-11 items-center text-sm font-bold text-[var(--color-primary-strong)] hover:underline"
        >
          <span aria-hidden="true">←</span> {t('nav.home')}
        </Link>
        <Button variant="secondary" to={formStep}>
          {t('talk.toForm')}
        </Button>
      </div>

      <div className="ui-page-intro">
        <h1 className="ui-page-title">{t('talk.title')}</h1>
        <p className="ui-page-subtitle">{t('talk.subtitle')}</p>
      </div>

      <div className="space-y-6">
        <div className="ui-formsection">
          <div className="ui-formsection-head">
            <span className="ui-formsection-num" aria-hidden="true">1</span>
            <h2 className="ui-formsection-title">{t('talk.sendsTitle')}</h2>
          </div>
          <div className="ui-formsection-body space-y-5">
            <p>{t('talk.sendsText')}</p>
            <p>{t('talk.rulesNote')}</p>

            <div>
              <label className="ui-check">
                <input
                  ref={consentRef}
                  type="checkbox"
                  id="talk-consent"
                  name="talk-consent"
                  checked={consent}
                  disabled={locked}
                  onChange={(event) => {
                    setConsent(event.target.checked)
                    setConsentMissing(false)
                  }}
                  aria-required="true"
                  aria-invalid={consentMissing || undefined}
                  aria-describedby={consentMissing ? 'talk-consent-error' : undefined}
                />
                <span>
                  {t('talk.consent')}
                  <span className="ui-required" aria-hidden="true">*</span>
                </span>
              </label>
              {consentMissing && (
                <p id="talk-consent-error" role="alert" className="ui-notice ui-notice-danger mt-3 font-bold text-[var(--color-danger)]">
                  {t('talk.consentRequired')}
                </p>
              )}
            </div>

            {/* The same age answer /finance asks for, on a copy built with
                VITE_REQUIRE_AGE_CHECK=true: a voice is sent from here too. */}
            {DEPLOYMENT.requireAgeCheck && (
              <div>
                <label className="ui-check">
                  <input
                    ref={ageRef}
                    type="checkbox"
                    id="talk-age"
                    name="talk-age"
                    checked={age}
                    disabled={locked}
                    onChange={(event) => {
                      setAge(event.target.checked)
                      setAgeMissing(false)
                    }}
                    aria-required="true"
                    aria-invalid={ageMissing || undefined}
                    aria-describedby={ageMissing ? 'talk-age-error' : undefined}
                  />
                  <span>
                    {tn('consent.age')}
                    <span className="ui-required" aria-hidden="true">*</span>
                  </span>
                </label>
                {ageMissing && (
                  <p id="talk-age-error" role="alert" className="ui-notice ui-notice-danger mt-3 font-bold text-[var(--color-danger)]">
                    {t('talk.consentRequired')}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="ui-formsection">
          <div className="ui-formsection-head">
            <span className="ui-formsection-num" aria-hidden="true">2</span>
            <h2 className="ui-formsection-title">{t('talk.speakTitle')}</h2>
          </div>
          <div className="ui-formsection-body space-y-5">
            <div className="ui-card-soft space-y-3 p-4">
              {question && (
                <p className="text-sm font-semibold text-[var(--color-text-muted)]">
                  {t('talk.progress', { n: QUESTIONS.length - pending.length + 1, total: QUESTIONS.length })}
                </p>
              )}
              <h3 ref={questionRef} tabIndex={-1} className="text-xl font-extrabold leading-snug">
                {t(lineKey)}
              </h3>
              {voice.available && (
                <Button variant="secondary" className="gap-2" onClick={voice.toggle}>
                  <SpeakerIcon />
                  {t(voice.speaking ? 'ra.stop' : 'ra.listen')}
                </Button>
              )}
            </div>

            {finished ? (
              <Button size="lg" to={formStep} className="w-full sm:w-auto">
                {t('common.continue')} <span aria-hidden="true">→</span>
              </Button>
            ) : (
              <>
                <div>
                  <label htmlFor="talk-language" className="block font-bold">{t('talk.langLabel')}</label>
                  <select
                    id="talk-language"
                    className={fieldClass}
                    value={spoken}
                    disabled={recording || busy !== ''}
                    onChange={(event) => {
                      setSpoken(event.target.value)
                      setFound(null)
                    }}
                  >
                    {LANGUAGES.map((entry) => (
                      <option key={entry.code} value={entry.code}>
                        {entry.endonym}{entry.endonym === entry.name ? '' : ` / ${entry.name}`}
                      </option>
                    ))}
                  </select>
                </div>

                {speechSupported && micAvailable() ? (
                  <VoiceRecorder
                    disabled={busy !== ''}
                    beforeStart={mayRecord}
                    onWav={transcribe}
                    onError={setError}
                    onActiveChange={setRecording}
                  />
                ) : (
                  <p className="ui-notice">
                    {speechSupported ? t('talk.errMicNone') : t('talk.langNoSpeech', { language: spokenEntry.endonym })}
                  </p>
                )}

                <div>
                  <label htmlFor="talk-text" className="block font-bold">{t('talk.textLabel')}</label>
                  <span id="talk-text-hint" className="mt-1 block text-sm text-[var(--color-text-muted)]">
                    {t('talk.textHint')}
                  </span>
                  <textarea
                    id="talk-text"
                    name="talk-text"
                    rows={6}
                    className={fieldClass}
                    value={text}
                    onChange={(event) => {
                      setText(event.target.value)
                      setFound(null)
                    }}
                    aria-invalid={tooLong || undefined}
                    aria-describedby={tooLong ? 'talk-text-hint talk-text-error' : 'talk-text-hint'}
                  />
                  {tooLong && (
                    <p id="talk-text-error" role="alert" className="ui-notice ui-notice-danger mt-3 font-bold text-[var(--color-danger)]">
                      {t('talk.tooLong', { max: MAX_TALK_TEXT })}
                    </p>
                  )}
                </div>

                {error && (
                  <div role="alert" className="ui-notice ui-notice-danger font-semibold text-[var(--color-danger)]">
                    {t(error)}
                  </div>
                )}

                {/* Always in the page, so the first message is announced. */}
                <div role="status" className={busy ? 'ui-notice font-semibold' : 'sr-only'}>
                  {busy === 'transcribing' ? t('talk.listening') : busy === 'finding' ? t('talk.finding') : null}
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    size="lg"
                    onClick={find}
                    disabled={busy !== '' || recording || tooLong || text.trim() === ''}
                    className="w-full sm:w-auto"
                  >
                    {t('talk.find')} <span aria-hidden="true">→</span>
                  </Button>
                  {busy && (
                    <Button variant="secondary" size="lg" onClick={() => requestRef.current?.abort()}>
                      {t('talk.cancel')}
                    </Button>
                  )}
                  <Button variant="secondary" size="lg" onClick={skip} disabled={locked} className="w-full sm:w-auto">
                    {t('talk.skip')}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>

        {found && (
          <div className="ui-formsection">
            <div className="ui-formsection-head">
              <span className="ui-formsection-num" aria-hidden="true">3</span>
              <h2 ref={reviewRef} tabIndex={-1} className="ui-formsection-title">{t('talk.reviewTitle')}</h2>
            </div>
            <div className="ui-formsection-body space-y-5">
              {usable && <p>{t('talk.reviewHelp')}</p>}

              {found.rows.length > 0 && (
                <ul className="space-y-3">
                  {found.rows.map((row) => {
                    const body = <Answer row={row} />
                    return (
                      <li key={row.field} className="ui-card-soft p-4">
                        {row.ok ? (
                          <label className="ui-check">
                            <input
                              type="checkbox"
                              checked={!dropped[row.field]}
                              onChange={() => setDropped((before) => ({ ...before, [row.field]: !before[row.field] }))}
                            />
                            {body}
                          </label>
                        ) : (
                          body
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}

              {found.ignored > 0 && (
                <p className="text-sm text-[var(--color-text-muted)]">{t('talk.ignored', { n: found.ignored })}</p>
              )}

              {usable ? (
                <div className="space-y-4">
                  {!question && <p className="text-sm text-[var(--color-text-muted)]">{t('talk.applyNote')}</p>}
                  <Button size="lg" onClick={apply} disabled={locked} className="w-full">
                    {t(question ? 'talk.right' : 'talk.apply')} <span aria-hidden="true">→</span>
                  </Button>
                  {question && (
                    <Button variant="secondary" size="lg" onClick={nextQuestion} disabled={locked} className="w-full">
                      {t('talk.again')}
                    </Button>
                  )}
                </div>
              ) : (
                <p className="ui-notice ui-notice-warn font-semibold">{t(question ? 'talk.noneHere' : 'talk.noneFound')}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

// One found answer: the question, the answer in the form's own words, and the
// reader's own words it was found in. An answer the form cannot hold shows what
// was heard instead and says it is not used.
function Answer({ row }) {
  const { t } = useI18n()

  return (
    <span>
      <span className="block text-sm font-semibold text-[var(--color-text-muted)] first-letter:uppercase">
        {t(FIELD_LABEL_KEYS[row.field])}
      </span>
      <span className="block text-lg font-extrabold">{row.ok ? valueText(row, t) : row.heard}</span>
      {!row.ok && <span className="block text-sm">{t('talk.notUsed')}</span>}
      {row.evidence && (
        <span className="block text-sm font-normal text-[var(--color-text-muted)]">
          {t('talk.said', { quote: row.evidence })}
        </span>
      )}
    </span>
  )
}

// What an accepted answer reads as. Money is whole rupees from 0, so none of the
// pages' negative-amount handling is needed; it is grouped en-IN like theirs.
function valueText(row, t) {
  if (row.field === 'business_category') return t(CATEGORY_LABELS[row.value])
  if (row.field === 'location_type') return t(AREA_LABELS[row.value])
  if (row.field === 'state' || row.field === 'district') return row.value
  return `₹${Number(row.value).toLocaleString('en-IN')}`
}

function micError(failure) {
  const name = failure?.name
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'talk.errMicDenied'
  if (name === 'NotFoundError' || name === 'NotReadableError' || name === 'OverconstrainedError') {
    return 'talk.errMicNone'
  }
  return 'talk.errGeneric'
}

function clock(seconds) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

// The microphone half of the page. It records, and hands the WAV up; what is
// done with it is the page's business. The microphone is let go on Stop, on
// Cancel, when the minute is up and when the reader leaves the page.
function VoiceRecorder({ disabled, beforeStart, onWav, onError, onActiveChange }) {
  const { t } = useI18n()
  // Record is off from the press until the recorder runs, and again from Stop
  // until the recording is finished.
  const [starting, setStarting] = useState(false)
  const [active, setActive] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [level, setLevel] = useState(0)
  const handleRef = useRef(null)
  const timeoutRef = useRef(0)
  const mountedRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false
      clearTimeout(timeoutRef.current)
      handleRef.current?.cancel()
      handleRef.current = null
    }
  }, [])

  // Only the clock and the meter. The minute limit is a timeout set in start().
  useEffect(() => {
    if (!active) return undefined

    const startedAt = Date.now()
    const timer = setInterval(() => {
      setSeconds(Math.floor((Date.now() - startedAt) / 1000))
      setLevel(handleRef.current?.level() ?? 0)
    }, 100)

    return () => clearInterval(timer)
  }, [active])

  async function start() {
    if (!beforeStart()) return

    setStarting(true)
    // The page locks the consent boxes, the language and the other button from
    // here, because the browser can sit on its permission question for as long
    // as it likes and a box unticked in that time would still be sent.
    onActiveChange(true)
    let handle
    try {
      handle = await startRecording()
    } catch (failure) {
      if (mountedRef.current) {
        setStarting(false)
        onActiveChange(false)
        onError(micError(failure))
      }
      return
    }
    // Left the page while the browser was asking: do not keep the microphone.
    if (!mountedRef.current) {
      handle.cancel()
      onActiveChange(false)
      return
    }

    handleRef.current = handle
    setStarting(false)
    setSeconds(0)
    setLevel(0)
    setActive(true)
    timeoutRef.current = setTimeout(finish, MAX_SECONDS * 1000)
  }

  async function finish() {
    clearTimeout(timeoutRef.current)
    const handle = handleRef.current
    if (!handle) return

    handleRef.current = null
    setActive(false)
    // The page stays locked, and Record stays off, until the file is ready to
    // send. The boxes were ticked for this recording, and one unticked between
    // Stop and the file would still be sent. The lock and the request then change
    // in the same render.
    setStarting(true)
    let wav = null
    try {
      wav = await handle.stop()
    } catch {
      // The recording could not be finished; wav stays null and the reader is told.
    }
    onActiveChange(false)
    if (!mountedRef.current) return
    setStarting(false)
    if (wav) onWav(wav)
    else onError('talk.errRecording')
  }

  function cancel() {
    clearTimeout(timeoutRef.current)
    handleRef.current?.cancel()
    handleRef.current = null
    setActive(false)
    onActiveChange(false)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {active ? (
          <>
            <Button size="lg" onClick={finish}>{t('talk.stop')}</Button>
            <Button variant="secondary" size="lg" onClick={cancel}>{t('talk.cancel')}</Button>
          </>
        ) : (
          <Button size="lg" onClick={start} disabled={disabled || starting}>
            <span aria-hidden="true">🎤</span> {t('talk.record')}
          </Button>
        )}
      </div>

      {/* Always in the page, so the first message is announced. */}
      <p role="status" className={active ? 'font-bold' : 'sr-only'}>
        {active ? t('talk.recording', { stop: t('talk.stop') }) : null}
      </p>

      {active && (
        <div aria-hidden="true" className="flex items-center gap-3">
          <div className="ui-bar-track flex-1">
            <div className="ui-bar-fill" style={{ width: `${Math.round(level * 100)}%` }} />
          </div>
          <span className="tabular-nums text-sm font-bold">
            {clock(seconds)} / {clock(MAX_SECONDS)}
          </span>
        </div>
      )}
    </div>
  )
}

export default TalkPage
