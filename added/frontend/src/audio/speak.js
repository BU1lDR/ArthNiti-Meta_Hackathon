// Read-aloud for the result pages, through the voices the browser already has.
//
// Only a voice that runs on this device is used (`localService` is true). A voice the
// browser reaches over the network, such as Edge's "Online (Natural)" voices, sends the
// sentence to a server this app has not told the person or the deployer about: on the
// owner's Windows machine all 321 voices Edge listed were of that kind (29 Oct 2026).
// So where there is no local voice for the page language the button is not drawn, and
// nothing is read. The line is drawn at the device, and this module opens no connection
// of its own (tools/verify/speak-lib-test.mjs greps its source for the usual ways).
//
// What is spoken is only text the page already shows, each line as its own utterance
// (some engines have been reported to stop a long one part-way). No figure is read: a
// voice may say a digit string wrongly, and the verdict sentences carry none, so a line
// with a digit in it, in any script, is left out rather than risk a wrong number.

// The same eight languages as i18n/languages.js; the tag is what a voice reports in
// `lang`. Bengali has voices for both bn-BD and bn-IN, and the Indian one is preferred.
export const SPEECH_LANG = {
  en: 'en-IN',
  hi: 'hi-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  ml: 'ml-IN',
  kn: 'kn-IN',
  mr: 'mr-IN',
  bn: 'bn-IN',
}

// The tag's language is compared whole, not by its first letters: `hil-PH` is not Hindi.
// Android reports `hi_IN`, other systems `hi-IN`; case is not meaningful.
const parts = (tag) => String(tag).toLowerCase().replace(/_/g, '-').split('-')

export function localVoiceFor(voices, code) {
  if (!Object.hasOwn(SPEECH_LANG, code) || !Array.isArray(voices)) return null
  const [language, region] = parts(SPEECH_LANG[code])
  let sameLanguage = null
  for (const voice of voices) {
    if (voice?.localService !== true) continue
    const [l, r] = parts(voice.lang)
    if (l !== language) continue
    if (r === region) return voice
    sameLanguage ??= voice
  }
  return sameLanguage
}

// Speaks the lines one after another and returns a function that stops them, or null
// when there is nothing to say. `onEnd` runs once, when the last line ends or any line
// fails, and never after the returned stop function has been called: the lines a stop
// cancels report an error of their own a moment later, and it must not end a run that
// has replaced this one. A browser can drop the first utterance when `speak` follows
// `cancel` at once, so the cancel is made only when something is playing.
export function speakLines(synth, voice, lines, Utterance = globalThis.SpeechSynthesisUtterance, onEnd = () => {}) {
  const spoken = lines
    .map((line) => (typeof line === 'string' ? line.trim() : ''))
    .filter((line) => line && !/\p{Nd}/u.test(line))
  if (!spoken.length) return null

  let live = true
  const finish = () => {
    if (!live) return
    live = false
    onEnd()
  }

  if (synth.speaking || synth.pending) synth.cancel()
  spoken.forEach((text, index) => {
    const utterance = new Utterance(text)
    utterance.voice = voice
    utterance.lang = voice.lang
    utterance.onerror = finish
    if (index === spoken.length - 1) utterance.onend = finish
    synth.speak(utterance)
  })

  return () => {
    live = false
    synth.cancel()
  }
}
