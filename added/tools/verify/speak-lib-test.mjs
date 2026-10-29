// Unit tests for frontend/src/audio/speak.js, the read-aloud on the result pages.
//
// The pure parts are checked here: which voice may be used for a language, and what is
// spoken, in what order, when the person presses Stop. The pages are checked in Edge
// against a fake speechSynthesis (tools/verify/read-aloud.mjs). No network, no key, no
// server. Run from the repo root:
//
//   node --test tools/verify/speak-lib-test.mjs
//
// The rule the first block pins is a privacy rule, not a taste: a voice the browser
// reaches over the network sends the sentence to a server this app has not told the
// person or the deployer about. Edge's default voices are all of that kind (321 of 321 on
// the owner's machine, 29 Oct 2026), so a voice counts only when `localService` is true.

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { SPEECH_LANG, localVoiceFor, speakLines } from '../../frontend/src/audio/speak.js'
import { LANGUAGES } from '../../frontend/src/i18n/languages.js'

const voice = (lang, localService = true, name = `${lang} voice`) => ({ name, lang, localService })

describe('SPEECH_LANG', () => {
  test('has a speech tag for each of the 8 languages and for nothing else', () => {
    assert.deepEqual(Object.keys(SPEECH_LANG).sort(), LANGUAGES.map((l) => l.code).sort())
  })

  test('every tag is the language followed by IN', () => {
    for (const [code, tag] of Object.entries(SPEECH_LANG)) assert.equal(tag, `${code}-IN`)
  })
})

describe('localVoiceFor', () => {
  test('is null when the browser lists no voices, or has no list at all', () => {
    assert.equal(localVoiceFor([], 'hi'), null)
    assert.equal(localVoiceFor(undefined, 'hi'), null)
    assert.equal(localVoiceFor(null, 'hi'), null)
  })

  test('never takes a voice that is not on the device', () => {
    assert.equal(localVoiceFor([voice('hi-IN', false)], 'hi'), null)
    assert.equal(localVoiceFor([{ name: 'no flag', lang: 'hi-IN' }], 'hi'), null)
    assert.equal(localVoiceFor([voice('hi-IN', 'true')], 'hi'), null)
  })

  test('takes a local voice of the language', () => {
    const v = voice('hi-IN')
    assert.equal(localVoiceFor([voice('en-US'), v], 'hi'), v)
  })

  test('skips a remote voice and takes the local one behind it', () => {
    const local = voice('hi-IN', true, 'local')
    assert.equal(localVoiceFor([voice('hi-IN', false, 'remote'), local], 'hi'), local)
  })

  test('reads an underscore tag and ignores case', () => {
    const v = voice('hi_IN')
    assert.equal(localVoiceFor([v], 'hi'), v)
    const w = voice('TA-in')
    assert.equal(localVoiceFor([w], 'ta'), w)
  })

  test('matches the language, not the first letters of another one', () => {
    assert.equal(localVoiceFor([voice('hil-PH')], 'hi'), null)
    assert.equal(localVoiceFor([voice('mri-NZ')], 'mr'), null)
    assert.equal(localVoiceFor([voice('bng-BD')], 'bn'), null)
  })

  test('prefers the Indian voice of a language that has more than one region', () => {
    const bd = voice('bn-BD')
    const inn = voice('bn-IN')
    assert.equal(localVoiceFor([bd, inn], 'bn'), inn)
    assert.equal(localVoiceFor([bd], 'bn'), bd)
  })

  test('English takes en-IN first, then any local English voice', () => {
    const us = voice('en-US')
    const inn = voice('en-IN')
    assert.equal(localVoiceFor([us, inn], 'en'), inn)
    assert.equal(localVoiceFor([us], 'en'), us)
  })

  test('is null for a language the app does not have', () => {
    assert.equal(localVoiceFor([voice('fr-FR')], 'fr'), null)
    assert.equal(localVoiceFor([voice('hi-IN')], undefined), null)
    assert.equal(localVoiceFor([voice('hi-IN')], '__proto__'), null)
  })

  test('is null for a browser that only has voices of other languages', () => {
    assert.equal(localVoiceFor([voice('en-US'), voice('en-IN')], 'hi'), null)
  })

  test('does not change the list it is given', () => {
    const list = [voice('bn-BD'), voice('bn-IN')]
    const before = JSON.stringify(list)
    localVoiceFor(list, 'bn')
    assert.equal(JSON.stringify(list), before)
  })
})

// A synth that records what it was told and lets a test play the events by hand.
function fakeSynth({ speaking = false } = {}) {
  const calls = []
  const synth = {
    speaking,
    pending: false,
    cancel() { calls.push(['cancel']) },
    speak(u) { calls.push(['speak', u]) },
  }
  return { synth, calls }
}

class FakeUtterance {
  constructor(text) { this.text = text }
}

const spokenTexts = (calls) => calls.filter(([k]) => k === 'speak').map(([, u]) => u.text)

describe('speakLines', () => {
  test('speaks each line as its own utterance, in order, in the chosen voice', () => {
    const { synth, calls } = fakeSynth()
    const v = voice('hi-IN')
    const stop = speakLines(synth, v, ['one', 'two', 'three'], FakeUtterance, () => {})
    assert.equal(typeof stop, 'function')
    assert.deepEqual(spokenTexts(calls), ['one', 'two', 'three'])
    for (const [k, u] of calls) if (k === 'speak') {
      assert.equal(u.voice, v)
      assert.equal(u.lang, 'hi-IN')
    }
  })

  test('skips blank lines, trims the rest, and does not speak a non-string', () => {
    const { synth, calls } = fakeSynth()
    speakLines(synth, voice('hi-IN'), ['  one ', '', '   ', null, undefined, 7, 'two'], FakeUtterance, () => {})
    assert.deepEqual(spokenTexts(calls), ['one', 'two'])
  })

  test('leaves out a line with a digit in it, in any script', () => {
    const { synth, calls } = fakeSynth()
    const lines = ['one', 'takes 30% of it', 'दो १२ तीन', 'ঠিক ০৫ আছে', 'two']
    speakLines(synth, voice('hi-IN'), lines, FakeUtterance, () => {})
    assert.deepEqual(spokenTexts(calls), ['one', 'two'])
  })

  test('with nothing to say it starts nothing and touches nothing', () => {
    const { synth, calls } = fakeSynth({ speaking: true })
    assert.equal(speakLines(synth, voice('hi-IN'), ['', '  '], FakeUtterance, () => {}), null)
    assert.equal(speakLines(synth, voice('hi-IN'), [], FakeUtterance, () => {}), null)
    assert.deepEqual(calls, [])
  })

  test('cancels what is already playing first, and only then', () => {
    const busy = fakeSynth({ speaking: true })
    speakLines(busy.synth, voice('hi-IN'), ['one'], FakeUtterance, () => {})
    assert.equal(busy.calls[0][0], 'cancel')
    const idle = fakeSynth()
    speakLines(idle.synth, voice('hi-IN'), ['one'], FakeUtterance, () => {})
    assert.equal(idle.calls[0][0], 'speak')
  })

  test('says it is done once, after the last line ends', () => {
    const { synth, calls } = fakeSynth()
    let done = 0
    speakLines(synth, voice('hi-IN'), ['one', 'two'], FakeUtterance, () => { done += 1 })
    const [first, second] = calls.map(([, u]) => u)
    first.onend?.()
    assert.equal(done, 0, 'the first line ending is not the end')
    second.onend()
    assert.equal(done, 1)
    second.onend()
    assert.equal(done, 1, 'a repeated event does not say it twice')
  })

  test('an error ends it too, once', () => {
    const { synth, calls } = fakeSynth()
    let done = 0
    speakLines(synth, voice('hi-IN'), ['one', 'two'], FakeUtterance, () => { done += 1 })
    calls[0][1].onerror({ error: 'synthesis-failed' })
    assert.equal(done, 1)
    calls[1][1].onend()
    assert.equal(done, 1)
  })

  test('stop cancels, and the cancelled lines do not report an end afterwards', () => {
    const { synth, calls } = fakeSynth()
    let done = 0
    const stop = speakLines(synth, voice('hi-IN'), ['one', 'two'], FakeUtterance, () => { done += 1 })
    stop()
    assert.equal(calls.at(-1)[0], 'cancel')
    calls[0][1].onerror({ error: 'canceled' })
    calls[1][1].onend?.()
    assert.equal(done, 0)
  })

  test('a stopped run cannot end the run that replaced it', () => {
    const { synth, calls } = fakeSynth()
    let first = 0
    let second = 0
    const stop = speakLines(synth, voice('hi-IN'), ['one'], FakeUtterance, () => { first += 1 })
    stop()
    speakLines(synth, voice('hi-IN'), ['two'], FakeUtterance, () => { second += 1 })
    calls[0][1].onerror({ error: 'interrupted' })
    assert.equal(first, 0)
    assert.equal(second, 0)
    calls.at(-1)[1].onend()
    assert.equal(second, 1)
  })
})

describe('the module', () => {
  const src = readFileSync(new URL('../../frontend/src/audio/speak.js', import.meta.url), 'utf8')

  test('opens no connection', () => {
    for (const word of ['fetch(', 'XMLHttpRequest', 'WebSocket', 'sendBeacon', 'EventSource', 'import(']) {
      assert.equal(src.includes(word), false, `speak.js mentions ${word}`)
    }
  })
})
