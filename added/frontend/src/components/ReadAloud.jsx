import { useEffect, useRef, useState } from 'react'
import Button from './Button'
import SpeakerIcon from './SpeakerIcon'
import { useI18n } from '../i18n/LanguageContext'
import { localVoiceFor, speakLines } from '../audio/speak'

// A button that reads aloud, in a voice that is already on this device, the light and
// the sentences a result page gives under it. Where the browser has no such voice for the
// page language it draws nothing at all: audio/speak.js says why a voice reached over the
// network is not used, and this component is the only caller. It sits on the two pages
// that carry the verdict and reads text that is already on the page; the page passes its
// own sentences, and no figure is read (speak.js leaves out a line with a digit in it).
//
// The light's word and its note are read together, as ResultBand prints them together,
// so a page cannot have the word read without the note that says what it is not.
//
// Some browsers list their voices late, so the list is read once, again on
// `voiceschanged` and once more as soon as the listener is in place (a browser can
// announce the list before that: Edge does, on a reload). Pressing the button again,
// switching language and leaving the page each stop the speech. What is remembered is
// the voice that is speaking and not a flag, so a new language (a new voice) reads as
// "not speaking" without a second state to keep in step, and the stop function sits in
// a ref because nothing is drawn from it. The speech is started from a press and from
// nowhere else.
// Whole keys, as ResultBand has them, so keycheck can see each one.
const BAND_KEY = { green: 'band.green', yellow: 'band.yellow', red: 'band.red' }

function ReadAloud({ band, lines }) {
  const { t, language } = useI18n()
  const [voices, setVoices] = useState(() => window.speechSynthesis?.getVoices?.() ?? [])
  const [speakingWith, setSpeakingWith] = useState(null)
  const stopRef = useRef(null)

  useEffect(() => {
    const synth = window.speechSynthesis
    const refresh = () => setVoices(synth?.getVoices?.() ?? [])
    synth?.addEventListener?.('voiceschanged', refresh)
    refresh()
    return () => synth?.removeEventListener?.('voiceschanged', refresh)
  }, [])

  const canSpeak = typeof window.SpeechSynthesisUtterance === 'function'
  const voice = canSpeak ? localVoiceFor(voices, language) : null
  // The voice by name and language, not by object: a browser that lists its voices again
  // may hand back new objects for the same voices, and that must not cut the speech.
  const voiceKey = voice ? `${voice.name}|${voice.lang}` : ''
  const speaking = voiceKey !== '' && speakingWith === voiceKey

  // Runs when the voice changes (a language switch) and when the page is left.
  useEffect(() => () => {
    stopRef.current?.()
    stopRef.current = null
  }, [voiceKey])

  if (!voice) return null

  const toggle = () => {
    if (speaking) {
      stopRef.current?.()
      stopRef.current = null
      setSpeakingWith(null)
      return
    }
    // A result stored before the band existed has none: then only the page's lines.
    const spoken = Object.hasOwn(BAND_KEY, band) ? [t(BAND_KEY[band]), t('band.basis'), ...lines] : lines
    const stop = speakLines(window.speechSynthesis, voice, spoken, window.SpeechSynthesisUtterance, () => {
      stopRef.current = null
      setSpeakingWith(null)
    })
    if (!stop) return
    stopRef.current = stop
    setSpeakingWith(voiceKey)
  }

  return (
    <div className="mt-5 flex flex-col items-start gap-2 print:hidden" data-read-aloud>
      <Button variant="secondary" className="gap-2" onClick={toggle}>
        <SpeakerIcon />
        {t(speaking ? 'ra.stop' : 'ra.listen')}
      </Button>
      <p className="text-[0.94rem] leading-normal text-[var(--color-text-muted)]">{t('ra.note')}</p>
    </div>
  )
}

export default ReadAloud
