// Unit tests for frontend/src/i18n/adviceAmount.js: the sentence drawn beside a piece of
// advice that has a number (advisory.amounts, written by the rules in
// backend/app/services/amounts_service.py).
//
// Two things are pinned. The first is what the module does with an entry: which sentence
// it picks, which figures it fills, and that a bad entry gives nothing at all rather than
// a half-filled sentence or the word NaN. The second is that the sentences it picks exist
// in all 8 languages and carry exactly the placeholders the module fills: a placeholder
// the module does not fill would print as "{cut}" on the page. No network, no key, no
// server. Run from the repo root:
//
//   node --test tools/verify/amount-lib-test.mjs
//
// The dictionary block loads strings.js through Vite's own module loader, the way
// app-state-test.mjs does, because the dictionaries import each other without a file
// extension. Vite is the frontend's own dependency; this file brings none.

import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { amountLine } from '../../frontend/src/i18n/adviceAmount.js'
import { LANGUAGES } from '../../frontend/src/i18n/languages.js'

const FRONTEND = fileURLToPath(new URL('../../frontend', import.meta.url))
const frontendRequire = createRequire(join(FRONTEND, 'package.json'))

// A translator that only records what it was asked, and a money format that shows which
// figures went through it.
function draw(entry) {
  const asked = []
  const t = (key, values) => {
    asked.push({ key, values })
    return `[${key}]`
  }
  const text = amountLine(entry, t, (value) => `R${value}`)
  return { text, asked }
}

const BREAK_EVEN = { kind: 'break_even', shortfall: 4000 }
const LOAN = { kind: 'loan_payments', now: 12000, limit: 9000, cut: 3000, with_new_loan: false }
const LOAN_NEW = { ...LOAN, with_new_loan: true }
const HOUSEHOLD = { kind: 'household_payments', now: 8000, limit: 6500, cut: 1500 }
const CASH = { kind: 'cash_reserve', have: 2500, target: 10000, short: 7500 }

describe('amountLine: what it draws', () => {
  test('break_even fills its shortfall', () => {
    const { text, asked } = draw(BREAK_EVEN)
    assert.equal(text, '[amt.breakEven]')
    assert.deepEqual(asked, [{ key: 'amt.breakEven', values: { shortfall: 'R4000' } }])
  })

  test('loan_payments fills now, limit and cut', () => {
    const { asked } = draw(LOAN)
    assert.deepEqual(asked, [
      { key: 'amt.loanPayments', values: { now: 'R12000', limit: 'R9000', cut: 'R3000' } },
    ])
  })

  test('loan_payments says so when the loan for the gap is counted in', () => {
    const { asked } = draw(LOAN_NEW)
    assert.deepEqual(asked, [
      { key: 'amt.loanPaymentsNew', values: { now: 'R12000', limit: 'R9000', cut: 'R3000' } },
    ])
  })

  test('only a true with_new_loan picks the second wording', () => {
    for (const odd of [false, undefined, null, 'true', 1, 'yes']) {
      const { asked } = draw({ ...LOAN, with_new_loan: odd })
      assert.equal(asked[0].key, 'amt.loanPayments', `with_new_loan ${String(odd)}`)
    }
  })

  test('household_payments fills now, limit and cut', () => {
    const { asked } = draw(HOUSEHOLD)
    assert.deepEqual(asked, [
      { key: 'amt.householdPayments', values: { now: 'R8000', limit: 'R6500', cut: 'R1500' } },
    ])
  })

  test('cash_reserve fills have, target and short', () => {
    const { asked } = draw(CASH)
    assert.deepEqual(asked, [
      { key: 'amt.cashReserve', values: { have: 'R2500', target: 'R10000', short: 'R7500' } },
    ])
  })

  test('a limit of 0 is a figure, not a missing one', () => {
    const { text, asked } = draw({ ...LOAN, limit: 0, cut: 12000 })
    assert.equal(text, '[amt.loanPayments]')
    assert.equal(asked[0].values.limit, 'R0')
  })

  test('a figure with paise is handed to the money format as it is', () => {
    const { asked } = draw({ ...LOAN, now: 5000.5 })
    assert.equal(asked[0].values.now, 'R5000.5')
  })

  test('a field the module does not use is ignored', () => {
    const { text } = draw({ ...BREAK_EVEN, extra: 'x', now: 1 })
    assert.equal(text, '[amt.breakEven]')
  })
})

describe('amountLine: what it refuses to draw', () => {
  const nothing = (entry, why) => {
    const { text, asked } = draw(entry)
    assert.equal(text, '', why)
    assert.deepEqual(asked, [], `${why}: the translator must not be asked for a half sentence`)
  }

  test('no entry at all', () => {
    for (const entry of [undefined, null, '', 0, 'break_even', 7, [], true]) {
      nothing(entry, `entry ${JSON.stringify(entry)}`)
    }
  })

  test('a kind this build does not know', () => {
    nothing({ kind: 'bonus', shortfall: 10 }, 'unknown kind')
    nothing({ shortfall: 10 }, 'no kind')
    nothing({ kind: null, shortfall: 10 }, 'null kind')
  })

  test('a kind that is a name every object has', () => {
    for (const kind of ['constructor', '__proto__', 'toString', 'hasOwnProperty', 'valueOf']) {
      nothing({ kind, shortfall: 10, now: 1, limit: 1, cut: 1 }, kind)
    }
  })

  test('a figure that is missing', () => {
    nothing({ kind: 'break_even' }, 'break_even without shortfall')
    nothing({ ...LOAN, cut: undefined }, 'loan_payments without cut')
    const { limit: _limit, ...noLimit } = HOUSEHOLD
    nothing(noLimit, 'household_payments without limit')
    const { target: _target, ...noTarget } = CASH
    nothing(noTarget, 'cash_reserve without target')
  })

  test('a figure that is not a finite number', () => {
    for (const odd of [null, '4000', '', NaN, Infinity, -Infinity, true, [], {}]) {
      nothing({ ...BREAK_EVEN, shortfall: odd }, `shortfall ${String(odd)}`)
      nothing({ ...LOAN, limit: odd }, `limit ${String(odd)}`)
      nothing({ ...CASH, short: odd }, `short ${String(odd)}`)
    }
  })
})

describe('the sentences', () => {
  let server
  let strings

  before(async () => {
    const vite = await import(
      pathToFileURL(join(dirname(frontendRequire.resolve('vite/package.json')), 'dist/node/index.js')).href
    )
    server = await vite.createServer({
      root: FRONTEND,
      configFile: join(FRONTEND, 'vite.config.js'),
      envDir: false, // no .env file is read for a test
      logLevel: 'silent',
      appType: 'custom',
      server: { middlewareMode: true, hmr: false, watch: null },
    })
    strings = (await server.ssrLoadModule('/src/i18n/strings.js')).STRINGS
  })

  after(async () => {
    await server?.close()
  })

  const placeholders = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()

  // Every sentence the module can pick, with the figures it fills.
  const ENTRIES = [BREAK_EVEN, LOAN, LOAN_NEW, HOUSEHOLD, CASH]
  const filled = (entry) => {
    const { asked } = draw(entry)
    return { key: asked[0].key, names: Object.keys(asked[0].values).sort() }
  }

  test('there are 5 sentences, and they are the amt.* keys of the dictionary', () => {
    const picked = ENTRIES.map((entry) => filled(entry).key).sort()
    const defined = Object.keys(strings.en).filter((key) => key.startsWith('amt.')).sort()
    assert.equal(new Set(picked).size, 5)
    assert.deepEqual(picked, defined)
  })

  test('each sentence exists in all 8 languages', () => {
    assert.equal(LANGUAGES.length, 8)
    for (const { code } of LANGUAGES) {
      for (const entry of ENTRIES) {
        const { key } = filled(entry)
        assert.equal(typeof strings[code][key], 'string', `${code} ${key}`)
        assert.ok(strings[code][key].trim().length > 0, `${code} ${key} is empty`)
      }
    }
  })

  // Sorted, with repeats kept: a figure named twice or left out both fail.
  test('each sentence has exactly the placeholders the module fills, in every language', () => {
    for (const { code } of LANGUAGES) {
      for (const entry of ENTRIES) {
        const { key, names } = filled(entry)
        assert.deepEqual(placeholders(strings[code][key]), names, `${code} ${key}`)
      }
    }
  })
})
