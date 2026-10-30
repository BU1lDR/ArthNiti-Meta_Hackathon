import { useCallback, useEffect, useRef, useState } from 'react'
import { promptVoiceFor, speakLines } from './speak'

// Reads one fixed line aloud: the question /talk is asking. It starts by itself when
// `text` changes while `enabled` is true, and `toggle` repeats it or stops it. The line
// is the page's own wording, so nothing the person said comes near a speech engine
// (promptVoiceFor in speak.js says why that lets it use a voice over the network).
//
// The speech stops when the line changes, when `enabled` goes false, on `stop()` and
// when the page is left. Where the browser has no voice for the language, `available` is
// false and the page shows the question as text only. A browser that will not start
// speech before the person has pressed something simply stays quiet until the button.
// Some browsers list their voices late, so the list is read once and again on
// `voiceschanged`, and a list that arrives late speaks the question that is waiting.
export default function useQuestionVoice(code, text, enabled) {
  const [voices, setVoices] = useState(() => window.speechSynthesis?.getVoices?.() ?? [])
  const [speakingText, setSpeakingText] = useState('')
  const stopRef = useRef(null)

  useEffect(() => {
    const synth = window.speechSynthesis
    const refresh = () => setVoices(synth.getVoices())
    synth?.addEventListener?.('voiceschanged', refresh)
    return () => synth?.removeEventListener?.('voiceschanged', refresh)
  }, [])

  // The voice by name and language, not by object: a browser that lists its voices again
  // may hand back new objects for the same voices, and that must not cut the speech.
  const voice = typeof window.SpeechSynthesisUtterance === 'function' ? promptVoiceFor(voices, code) : null
  const voiceKey = voice ? `${voice.name}|${voice.lang}` : ''

  const stop = useCallback(() => {
    stopRef.current?.()
    stopRef.current = null
    setSpeakingText('')
  }, [])

  const start = useCallback(
    (line) => {
      const synth = window.speechSynthesis
      const chosen = promptVoiceFor(synth?.getVoices?.() ?? [], code)
      if (!chosen) return
      stopRef.current?.()
      stopRef.current = speakLines(synth, chosen, [line], window.SpeechSynthesisUtterance, () => {
        stopRef.current = null
        setSpeakingText('')
      })
      setSpeakingText(stopRef.current ? line : '')
    },
    [code],
  )

  // The cleanup is returned in every case: speech the person started with the button
  // must also end when the line changes or the page is left.
  useEffect(() => {
    if (enabled && voiceKey && text) start(text)
    return stop
  }, [enabled, voiceKey, text, start, stop])

  const toggle = () => (stopRef.current ? stop() : start(text))

  return { available: voiceKey !== '', speaking: speakingText !== '' && speakingText === text, toggle, stop }
}
