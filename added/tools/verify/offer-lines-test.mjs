// Unit tests for frontend/src/i18n/offerLines.js: the words around the numbers of the loan-offer
// card (components/OfferCheck.jsx). The numbers come from frontend/src/data/loanOffer.js
// (offer-lib-test.mjs pins those); this file pins what is said about them.
//
// Three things are pinned. First, which sentence is picked for each result and which figures
// fill it, with the figures worked out here by hand, not by the module. Second, that a result
// the module cannot say whole gives nothing, never a half sentence or the word NaN. Third, that
// every sentence it can pick exists in all 8 languages with exactly the placeholders it fills,
// and that none of the card's wording judges the offer. No network, no key, no server. Run from
// the repo root:
//
//   node --test tools/verify/offer-lines-test.mjs
//
// The dictionary block loads strings.js through Vite's own module loader, the way
// amount-lib-test.mjs does, because the dictionaries import each other without a file extension.

import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { checkOffer } from '../../frontend/src/data/loanOffer.js'
import { offerErrors, offerLines, percentText, pricedLoan } from '../../frontend/src/i18n/offerLines.js'
import { LANGUAGES } from '../../frontend/src/i18n/languages.js'
import { BANNED, bannedIn } from './offer-banned.mjs'

const FRONTEND = fileURLToPath(new URL('../../frontend', import.meta.url))
const frontendRequire = createRequire(join(FRONTEND, 'package.json'))

// A translator that only records what it was asked, and two money formats that show which
// figures went through which.
function recorder() {
  const asked = []
  const t = (key, values) => {
    asked.push(values === undefined ? { key } : { key, values })
    return `[${key}]`
  }
  return { asked, t }
}
const money = (value) => `R${value}`
const exact = (value) => `X${value}`

// What was asked of the translator for one key, in the order it was asked.
const valuesFor = (asked, key) => asked.filter((entry) => entry.key === key).map((entry) => entry.values)

const ASSUMED = 12
const BY_PAYMENTS = (over = {}) => ({
  mode: 'instalments',
  received: '10000',
  instalment: '889',
  often: 'monthly',
  payments: '12',
  ...over,
})
const BY_RATE = (over = {}) => ({ mode: 'rate', received: '10000', rate: '3', months: '12', ...over })

function draw(check) {
  const { asked, t } = recorder()
  const lines = offerLines(check, t, money)
  return { lines, asked }
}

describe('percentText', () => {
  test('three significant digits, grouped the Indian way, with the sign', () => {
    for (const [value, text] of [
      [12.109453221792819, '12.1%'],
      [36, '36%'],
      [120, '120%'],
      [0.12, '0.12%'],
      [1234.5, '1,230%'],
      [1.2000000012e-6, '0.0000012%'],
    ]) {
      assert.equal(percentText(value), text, String(value))
    }
  })

  test('a huge figure is still plain digits, never an exponent', () => {
    for (const value of [5.2142857e12, 1e21, 123456789012]) {
      assert.match(percentText(value), /^[\d,]+%$/, String(value))
    }
  })
})

describe('offerLines: a cost', () => {
  test('by payments: what is paid, the yearly cost, and the same money at the assumed rate', () => {
    // 889 a month for 12 months is 10668 for 10000, so 668 more. At 12% a year the same twelve
    // payments are 10662 (independent Decimal run, tools/verify/offer_reference.py), 6 less.
    const { lines, asked } = draw(checkOffer(BY_PAYMENTS(), ASSUMED))
    assert.deepEqual(lines, [
      { id: 'total', text: '[offer.resultCost]' },
      { id: 'yearly', text: '[offer.resultYearly]' },
      { id: 'compare', text: '[offer.vsMore]' },
      { id: 'compareNote', text: '[offer.vsNote]' },
    ])
    assert.deepEqual(valuesFor(asked, 'offer.resultCost'), [{ received: 'R10000', total: 'R10668', extra: 'R668' }])
    assert.deepEqual(valuesFor(asked, 'offer.resultYearly'), [{ percent: '12.1%' }])
    assert.deepEqual(valuesFor(asked, 'offer.vsMore'), [{ rate: '12%', total: 'R10662', diff: 'R6' }])
    assert.deepEqual(valuesFor(asked, 'offer.vsNote'), [{ rate: '12%' }])
    assert.equal(asked.length, 4, 'nothing else is asked of the translator')
  })

  test('by a quoted rate: 3 rupees in 100 a month for a year is 36% and 3600 more', () => {
    // 10000 x 3% x 12 months = 3600. At 12% a year for one year: 1200, so 11200 in all.
    const { lines, asked } = draw(checkOffer(BY_RATE(), ASSUMED))
    assert.deepEqual(
      lines.map((line) => line.id),
      ['total', 'yearly', 'compare', 'compareNote'],
    )
    assert.deepEqual(valuesFor(asked, 'offer.resultCost'), [{ received: 'R10000', total: 'R13600', extra: 'R3600' }])
    assert.deepEqual(valuesFor(asked, 'offer.resultYearly'), [{ percent: '36%' }])
    assert.deepEqual(valuesFor(asked, 'offer.vsMore'), [{ rate: '12%', total: 'R11200', diff: 'R2400' }])
  })

  test('an offer under the assumed total says less, with the difference', () => {
    // 0.5% a month for a year: 600, so 10600, against 11200.
    const { lines, asked } = draw(checkOffer(BY_RATE({ rate: '0.5' }), ASSUMED))
    assert.equal(lines[2].text, '[offer.vsLess]')
    assert.deepEqual(valuesFor(asked, 'offer.vsLess'), [{ rate: '12%', total: 'R11200', diff: 'R600' }])
    assert.deepEqual(valuesFor(asked, 'offer.resultYearly'), [{ percent: '6%' }])
    assert.equal(valuesFor(asked, 'offer.vsMore').length, 0)
  })

  test('an offer equal to the assumed total says the same, and names no difference', () => {
    // 1% a month for a year: 1200, so 11200, exactly the assumed total.
    const { lines, asked } = draw(checkOffer(BY_RATE({ rate: '1' }), ASSUMED))
    assert.equal(lines[2].text, '[offer.vsSame]')
    assert.deepEqual(valuesFor(asked, 'offer.vsSame'), [{ rate: '12%', total: 'R11200' }])
    assert.equal(valuesFor(asked, 'offer.vsMore').length + valuesFor(asked, 'offer.vsLess').length, 0)
  })

  test('the assumed rate shown is the one that was used', () => {
    // 18% a year for a year on 10000 is 1800: 11800 in all, and 13600 is 1800 more.
    const eighteen = draw(checkOffer(BY_RATE(), 18))
    assert.deepEqual(valuesFor(eighteen.asked, 'offer.vsMore'), [{ rate: '18%', total: 'R11800', diff: 'R1800' }])
    assert.deepEqual(valuesFor(eighteen.asked, 'offer.vsNote'), [{ rate: '18%' }])
    // 12.5% of 10000 for a year is 1250.
    const half = draw(checkOffer(BY_RATE(), 12.5))
    assert.deepEqual(valuesFor(half.asked, 'offer.vsMore'), [{ rate: '12.5%', total: 'R11250', diff: 'R2350' }])
  })

  test('no usable assumed rate: the cost is said, the comparison is left out', () => {
    for (const odd of [undefined, null, 0, -1, NaN, Infinity, '12']) {
      const { lines, asked } = draw(checkOffer(BY_PAYMENTS(), odd))
      assert.deepEqual(
        lines.map((line) => line.id),
        ['total', 'yearly'],
        `assumed rate ${String(odd)}`,
      )
      assert.deepEqual(
        asked.map((entry) => entry.key),
        ['offer.resultCost', 'offer.resultYearly'],
        `assumed rate ${String(odd)}`,
      )
    }
  })

  test('a quoted rate so small the interest rounds to 0 rupees is still a cost', () => {
    // 0.0001 rupees in 100 for one month on 100 rupees: 0.0001 of a rupee, so 0 whole rupees and
    // 0.0012% a year. The same 100 at 12% a year for a month is 1 rupee, so this is 1 less.
    const { lines, asked } = draw(checkOffer(BY_RATE({ received: '100', rate: '0.0001', months: '1' }), ASSUMED))
    assert.equal(lines[0].text, '[offer.resultCost]')
    assert.deepEqual(valuesFor(asked, 'offer.resultCost'), [{ received: 'R100', total: 'R100', extra: 'R0' }])
    assert.deepEqual(valuesFor(asked, 'offer.resultYearly'), [{ percent: '0.0012%' }])
    assert.deepEqual(valuesFor(asked, 'offer.vsLess'), [{ rate: '12%', total: 'R101', diff: 'R1' }])
  })

  test('the figures go through the money format the page gave, whole', () => {
    const { t } = recorder()
    const seen = []
    offerLines(checkOffer(BY_PAYMENTS(), ASSUMED), t, (value) => {
      seen.push(value)
      return 'm'
    })
    assert.deepEqual(seen.sort((a, b) => a - b), [6, 668, 10000, 10662, 10668])
  })

  test('the result is only read', () => {
    const check = checkOffer(BY_PAYMENTS(), ASSUMED)
    const before = structuredClone(check)
    draw(check)
    assert.deepEqual(check, before)
  })
})

describe('offerLines: payments that do not add up to a cost', () => {
  test('less than the money in hand says so and works out no rate', () => {
    // 12 x 800 is 9600, less than the 10000 in hand.
    const { lines, asked } = draw(checkOffer(BY_PAYMENTS({ instalment: '800' }), ASSUMED))
    assert.deepEqual(lines, [{ id: 'total', text: '[offer.resultLess]' }])
    assert.deepEqual(asked, [{ key: 'offer.resultLess', values: { received: 'R10000', total: 'R9600' } }])
  })

  test('exactly the money in hand says the same amount, with no yearly cost', () => {
    // 10 x 1000 is 10000.
    const { lines, asked } = draw(checkOffer(BY_PAYMENTS({ instalment: '1000', payments: '10' }), ASSUMED))
    assert.deepEqual(lines, [{ id: 'total', text: '[offer.resultSame]' }])
    assert.deepEqual(asked, [{ key: 'offer.resultSame', values: { received: 'R10000', total: 'R10000' } }])
  })
})

describe('offerLines: what it refuses to say', () => {
  const nothing = (check, why) => {
    const { lines, asked } = draw(check)
    assert.deepEqual(lines, [], why)
    assert.deepEqual(asked, [], `${why}: the translator must not be asked for a half sentence`)
  }

  test('no result, or one that is not a cost, a same or a less', () => {
    for (const check of [
      undefined,
      null,
      '',
      0,
      'cost',
      7,
      [],
      {},
      true,
      { status: 'incomplete' },
      { status: 'invalid', errors: { received: 'whole' } },
      { status: 'weird', received: 1, totalPaid: 2 },
    ]) {
      nothing(check, `result ${JSON.stringify(check)}`)
    }
  })

  test('a cost with a figure missing or not a finite number', () => {
    const whole = checkOffer(BY_PAYMENTS(), ASSUMED)
    for (const name of ['received', 'totalPaid', 'extra', 'yearlyPercent']) {
      for (const odd of [undefined, null, '10', NaN, Infinity, -Infinity, true, [], {}]) {
        nothing({ ...whole, [name]: odd }, `${name} ${String(odd)}`)
      }
    }
  })

  test('a same or a less with a figure missing or not a finite number', () => {
    const less = checkOffer(BY_PAYMENTS({ instalment: '800' }), ASSUMED)
    const same = checkOffer(BY_PAYMENTS({ instalment: '1000', payments: '10' }), ASSUMED)
    for (const name of ['received', 'totalPaid']) {
      for (const odd of [undefined, null, '10', NaN, Infinity]) {
        nothing({ ...less, [name]: odd }, `less ${name} ${String(odd)}`)
        nothing({ ...same, [name]: odd }, `same ${name} ${String(odd)}`)
      }
    }
  })

  test('a comparison that is not whole is left out, and the cost is still said', () => {
    const whole = checkOffer(BY_PAYMENTS(), ASSUMED)
    for (const atAssumed of [
      undefined,
      null,
      'x',
      7,
      {},
      { ratePercent: 12 },
      { totalPaid: 10662 },
      { ratePercent: '12', totalPaid: 10662 },
      { ratePercent: 12, totalPaid: '10662' },
      { ratePercent: NaN, totalPaid: 10662 },
      { ratePercent: 12, totalPaid: Infinity },
    ]) {
      const { lines, asked } = draw({ ...whole, atAssumed })
      assert.deepEqual(
        lines.map((line) => line.id),
        ['total', 'yearly'],
        JSON.stringify(atAssumed),
      )
      assert.equal(asked.length, 2, JSON.stringify(atAssumed))
    }
  })
})

describe('offerErrors', () => {
  const errorsFor = (input, often = input.often) => {
    const { asked, t } = recorder()
    const out = offerErrors(checkOffer(input, ASSUMED), often, t, money)
    return { out, asked }
  }

  test('a box that is not a whole number of 1 or more', () => {
    for (const [over, field] of [
      [{ received: '12a' }, 'received'],
      [{ received: '0' }, 'received'],
      [{ instalment: '-5' }, 'instalment'],
      [{ instalment: '1.5' }, 'instalment'],
      [{ payments: '0' }, 'payments'],
      [{ payments: '१२' }, 'payments'],
    ]) {
      const { out, asked } = errorsFor(BY_PAYMENTS(over))
      assert.deepEqual(out, { [field]: '[offer.errWhole]' }, JSON.stringify(over))
      assert.deepEqual(asked, [{ key: 'offer.errWhole' }], JSON.stringify(over))
    }
    const months = errorsFor(BY_RATE({ months: '2.5' }))
    assert.deepEqual(months.out, { months: '[offer.errWhole]' })
  })

  test('a box that is too big names the most it takes', () => {
    const cases = [
      [BY_PAYMENTS({ received: '1000000001' }), 'received', 'R1000000000'],
      [BY_PAYMENTS({ instalment: '1000000001' }), 'instalment', 'R1000000000'],
      [BY_PAYMENTS({ often: 'daily', payments: '3651' }), 'payments', '3,650'],
      [BY_PAYMENTS({ often: 'weekly', payments: '521' }), 'payments', '520'],
      [BY_PAYMENTS({ often: 'monthly', payments: '121' }), 'payments', '120'],
      [BY_RATE({ months: '121' }), 'months', '120'],
      [BY_RATE({ rate: '100.5' }), 'rate', '100'],
    ]
    for (const [input, field, max] of cases) {
      const { out, asked } = errorsFor(input)
      assert.deepEqual(out, { [field]: '[offer.errRange]' }, `${field} ${max}`)
      assert.deepEqual(asked, [{ key: 'offer.errRange', values: { max } }], `${field} ${max}`)
    }
  })

  test('a rate that is not a number above 0', () => {
    for (const rate of ['0', '0.0', 'abc', '3.5.1', '3,5', '-3', '.']) {
      const { out, asked } = errorsFor(BY_RATE({ rate }))
      assert.deepEqual(out, { rate: '[offer.errRate]' }, `rate ${rate}`)
      assert.deepEqual(asked, [{ key: 'offer.errRate' }], `rate ${rate}`)
    }
  })

  test('every box with a mistake gets its own message', () => {
    const { out } = errorsFor(BY_PAYMENTS({ received: 'x', instalment: '1000000001', payments: '0' }))
    assert.deepEqual(out, {
      received: '[offer.errWhole]',
      instalment: '[offer.errRange]',
      payments: '[offer.errWhole]',
    })
  })

  test('a result that is not a mistake has none', () => {
    for (const input of [BY_PAYMENTS(), BY_PAYMENTS({ instalment: '800' }), BY_PAYMENTS({ payments: '' }), BY_RATE()]) {
      const { out, asked } = errorsFor(input)
      assert.deepEqual(out, {})
      assert.deepEqual(asked, [])
    }
    for (const check of [undefined, null, 'invalid', 7, [], { status: 'cost' }]) {
      const { asked, t } = recorder()
      assert.deepEqual(offerErrors(check, 'monthly', t, money), {})
      assert.deepEqual(asked, [])
    }
  })

  test('an error this build does not know, or a box it does not have, says nothing', () => {
    const { asked, t } = recorder()
    const out = offerErrors(
      { status: 'invalid', errors: { received: 'banana', instalment: 'whole', bogus: 'whole', constructor: 'whole' } },
      'monthly',
      t,
      money,
    )
    assert.deepEqual(out, { instalment: '[offer.errWhole]' })
    assert.deepEqual(asked, [{ key: 'offer.errWhole' }])
  })

  test('errors that are not an object of codes say nothing', () => {
    for (const errors of [undefined, null, 'whole', 7, [], true]) {
      const { asked, t } = recorder()
      assert.deepEqual(offerErrors({ status: 'invalid', errors }, 'monthly', t, money), {})
      assert.deepEqual(asked, [])
    }
  })

  test('a payments box too big for a choice that was never made says nothing', () => {
    for (const often of [undefined, null, '', 'yearly', 'constructor', 'toString']) {
      const { asked, t } = recorder()
      assert.deepEqual(offerErrors({ status: 'invalid', errors: { payments: 'range' } }, often, t, money), {})
      assert.deepEqual(asked, [])
    }
  })
})

describe('pricedLoan', () => {
  const OPTION_12 = {
    code: 'term_12',
    tenure_months: 12,
    loan_amount: 16000,
    remaining_gap: 34000,
    monthly_repayment: 1422,
    total_repayment: 17058.69,
    total_interest: 1058.69,
  }
  const OPTION_60 = {
    code: 'term_60',
    tenure_months: 60,
    loan_amount: 50000,
    remaining_gap: 0,
    monthly_repayment: 1112,
    total_repayment: 66738.18,
    total_interest: 16738.18,
  }
  const COVERED = {
    status: 'covered',
    funding_gap: 50000,
    assumed_interest_rate_percent: 12,
    household_checked: true,
    options: [OPTION_12, OPTION_60],
    recommended_by_rules: 'term_60',
  }
  const PARTIAL = { ...COVERED, status: 'partial', recommended_by_rules: null }

  const priced = (financing) => {
    const { asked, t } = recorder()
    return { out: pricedLoan(financing, t, money, exact), asked }
  }

  test('the recommended loan: the term, four rows, and the assumption', () => {
    const { out, asked } = priced(COVERED)
    assert.deepEqual(out, {
      term: '[fo.term]',
      rows: [
        { id: 'loan', label: '[fo.loan]', value: 'R50000' },
        { id: 'perMonth', label: '[fo.perMonth]', value: 'R1112' },
        { id: 'totalBack', label: '[fo.totalBack]', value: 'X66738.18' },
        { id: 'interest', label: '[fo.interest]', value: 'X16738.18' },
      ],
      assumption: '[fo.assumption]',
    })
    assert.deepEqual(valuesFor(asked, 'fo.term'), [{ months: 60 }])
    assert.deepEqual(valuesFor(asked, 'fo.assumption'), [{ rate: 12 }])
  })

  test('the loan and the monthly payment are whole rupees, the totals keep their paise', () => {
    const { out } = priced(COVERED)
    const value = (id) => out.rows.find((row) => row.id === id).value
    assert.ok(value('loan').startsWith('R') && value('perMonth').startsWith('R'))
    assert.ok(value('totalBack').startsWith('X') && value('interest').startsWith('X'))
  })

  test('when no loan is recommended it is the largest, and for the same size the shorter', () => {
    assert.deepEqual(valuesFor(priced(PARTIAL).asked, 'fo.term'), [{ months: 60 }])
    const twin = { ...OPTION_60, code: 'term_36', tenure_months: 36 }
    const tied = priced({ ...PARTIAL, options: [OPTION_60, twin] })
    assert.deepEqual(valuesFor(tied.asked, 'fo.term'), [{ months: 36 }])
  })

  test('the recommended loan wins even when another one is larger', () => {
    const { out, asked } = priced({ ...COVERED, recommended_by_rules: 'term_12' })
    assert.deepEqual(valuesFor(asked, 'fo.term'), [{ months: 12 }])
    assert.equal(out.rows[0].value, 'R16000')
  })

  test('with no assumed rate to quote, the assumption is left out', () => {
    for (const odd of [undefined, null, NaN, Infinity, '12', {}]) {
      const { out, asked } = priced({ ...COVERED, assumed_interest_rate_percent: odd })
      assert.equal(out.assumption, '', `rate ${String(odd)}`)
      assert.equal(valuesFor(asked, 'fo.assumption').length, 0, `rate ${String(odd)}`)
      assert.equal(out.rows.length, 4)
    }
  })

  test('a loan whose interest is not given has no interest row, and the rest still stand', () => {
    for (const odd of [undefined, null, NaN, '16738.18']) {
      const { out } = priced({ ...COVERED, options: [{ ...OPTION_60, total_interest: odd }] })
      assert.deepEqual(
        out.rows.map((row) => row.id),
        ['loan', 'perMonth', 'totalBack'],
        `interest ${String(odd)}`,
      )
    }
    const zero = priced({ ...COVERED, options: [{ ...OPTION_60, total_interest: 0 }] })
    assert.equal(zero.out.rows.at(-1).value, 'X0', 'a real 0 is a figure')
  })

  test('no loan priced: the reason the rules gave, in the page\'s own words', () => {
    for (const [status, key] of [
      ['no_surplus', 'fo.noSurplus'],
      ['household_over_limit', 'fo.householdOver'],
      ['no_room', 'fo.noRoom'],
    ]) {
      const { out, asked } = priced({ status, options: [], assumed_interest_rate_percent: 12 })
      assert.deepEqual(out, { reason: `[${key}]` }, status)
      assert.deepEqual(asked, [{ key }], status)
    }
  })

  test('nothing to show when there is no gap to borrow for, or no section, or no usable loan', () => {
    for (const financing of [
      undefined,
      null,
      '',
      0,
      'covered',
      7,
      [],
      {},
      { status: 'no_gap', options: [] },
      { status: 'banana', options: [OPTION_60] },
      { status: 'covered' },
      { status: 'covered', options: null },
      { status: 'covered', options: [] },
      { status: 'covered', options: [{ ...OPTION_60, loan_amount: 0 }] },
      { status: 'partial', options: 'x' },
      // a name every object has is not a reason
      { status: 'constructor' },
      { status: 'toString' },
    ]) {
      const { out, asked } = priced(financing)
      assert.equal(out, null, JSON.stringify(financing))
      assert.deepEqual(asked, [], JSON.stringify(financing))
    }
  })

  test('the stored data is only read', () => {
    const before = structuredClone(COVERED)
    priced(COVERED)
    assert.deepEqual(COVERED, before)
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

  // Every sentence the module can ask for, with the names of the figures it fills: the module
  // is run over every kind of result and every kind of mistake it handles.
  function asked() {
    const found = new Map()
    const note = (entries) => {
      for (const { key, values } of entries) {
        const names = JSON.stringify(Object.keys(values ?? {}).sort())
        if (!found.has(key)) found.set(key, new Set())
        found.get(key).add(names)
      }
    }
    const results = [
      ...[BY_PAYMENTS(), BY_RATE(), BY_RATE({ rate: '0.5' }), BY_RATE({ rate: '1' }), BY_PAYMENTS({ instalment: '800' }),
        BY_PAYMENTS({ instalment: '1000', payments: '10' })].flatMap((input) => [checkOffer(input, ASSUMED), checkOffer(input)]),
    ]
    for (const check of results) {
      const run = recorder()
      offerLines(check, run.t, money)
      note(run.asked)
    }
    for (const input of [
      BY_PAYMENTS({ received: 'x' }),
      BY_PAYMENTS({ received: '1000000001' }),
      BY_PAYMENTS({ often: 'daily', payments: '3651' }),
      BY_RATE({ rate: '0' }),
      BY_RATE({ rate: '101' }),
      BY_RATE({ months: '121' }),
    ]) {
      const run = recorder()
      offerErrors(checkOffer(input, ASSUMED), input.often, run.t, money)
      note(run.asked)
    }
    const option = { code: 'term_60', tenure_months: 60, loan_amount: 50000, monthly_repayment: 1112, total_repayment: 66738.18, total_interest: 16738.18 }
    for (const financing of [
      { status: 'covered', options: [option], recommended_by_rules: 'term_60', assumed_interest_rate_percent: 12 },
      { status: 'no_surplus' },
      { status: 'household_over_limit' },
      { status: 'no_room' },
    ]) {
      const run = recorder()
      pricedLoan(financing, run.t, money, exact)
      note(run.asked)
    }
    return found
  }

  // The words on the card that the component prints itself: the headings, the labels of the
  // boxes and the explanation. OfferCheck.jsx asks for each of these, and keycheck.mjs fails on
  // a key it asks for that the dictionary does not have.
  const FORM_KEYS = [
    'offer.eyebrow', 'offer.title', 'offer.intro', 'offer.wayLegend', 'offer.wayPayments', 'offer.wayRate',
    'offer.received', 'offer.instalment', 'offer.oftenLegend', 'offer.daily', 'offer.weekly', 'offer.monthly',
    'offer.payments', 'offer.lent', 'offer.rate', 'offer.rateHelp', 'offer.months', 'offer.rateNote',
    'offer.pricedTitle', 'offer.how', 'offer.howYearly', 'offer.howDaily', 'offer.howCompare', 'offer.howNot',
  ]

  test('there are 11 sentences from the module, and each is filled with one set of figures', () => {
    const found = asked()
    const own = [...found.keys()].filter((key) => key.startsWith('offer.'))
    assert.deepEqual(own.sort(), [
      'offer.errRange', 'offer.errRate', 'offer.errWhole', 'offer.resultCost', 'offer.resultLess',
      'offer.resultSame', 'offer.resultYearly', 'offer.vsLess', 'offer.vsMore', 'offer.vsNote', 'offer.vsSame',
    ])
    for (const [key, sets] of found) assert.equal(sets.size, 1, `${key} is filled with different figures in different places`)
  })

  test('the offer.* keys of the dictionary are the module\'s sentences and the form\'s words, no more and no less', () => {
    const own = [...asked().keys()].filter((key) => key.startsWith('offer.'))
    const defined = Object.keys(strings.en).filter((key) => key.startsWith('offer.')).sort()
    assert.deepEqual([...own, ...FORM_KEYS].sort(), defined)
    assert.equal(new Set([...own, ...FORM_KEYS]).size, defined.length, 'a key is listed twice')
  })

  test('every sentence exists in all 8 languages', () => {
    assert.equal(LANGUAGES.length, 8)
    const keys = [...asked().keys(), ...FORM_KEYS]
    for (const { code } of LANGUAGES) {
      for (const key of keys) {
        assert.equal(typeof strings[code][key], 'string', `${code} ${key}`)
        assert.ok(strings[code][key].trim().length > 0, `${code} ${key} is empty`)
      }
    }
  })

  // Sorted, with repeats kept: a figure named twice or left out both fail.
  test('each sentence has exactly the placeholders the module fills, in every language', () => {
    for (const [key, sets] of asked()) {
      const [names] = [...sets].map((json) => JSON.parse(json))
      for (const { code } of LANGUAGES) {
        assert.deepEqual(placeholders(strings[code][key]), names, `${code} ${key}`)
      }
    }
  })

  test('the form\'s words fill no placeholder', () => {
    for (const { code } of LANGUAGES) {
      for (const key of FORM_KEYS) {
        assert.deepEqual(placeholders(strings[code][key]), [], `${code} ${key}`)
      }
    }
  })

  test('nothing on the card judges the offer, in any of the 8 languages', () => {
    for (const { code } of LANGUAGES) {
      for (const key of Object.keys(strings[code]).filter((name) => name.startsWith('offer.'))) {
        assert.deepEqual(bannedIn(strings[code][key], code), [], `${code} ${key}: ${strings[code][key]}`)
      }
    }
  })

  test('the banned-word check can fire', () => {
    assert.deepEqual(bannedIn('This offer is illegal.', 'en'), ['illegal'])
    assert.deepEqual(bannedIn('That is TOO HIGH.', 'en'), ['too high'])
    assert.deepEqual(bannedIn('You should not take it.', 'en'), ['should'])
    assert.deepEqual(bannedIn('यह गैरकानूनी है', 'hi'), ['गैरकानूनी'])
    assert.deepEqual(bannedIn('You pay back 5,000 in all.', 'en'), [])
  })
})

// The list itself. A word is found where it starts a word, with anything after it (these
// languages add endings to a stem), and not where the same letters sit in the middle of another
// word: the Malayalam for "than the one shown" holds the letters of the word for deceit.
describe('the banned-word list', () => {
  test('there is a list for each of the 8 languages, and none is empty', () => {
    assert.deepEqual(Object.keys(BANNED).sort(), LANGUAGES.map(({ code }) => code).sort())
    for (const [code, words] of Object.entries(BANNED)) assert.ok(words.length > 0, code)
  })

  test('every word on every list is found when it stands in a sentence', () => {
    for (const [code, words] of Object.entries(BANNED)) {
      for (const word of words) {
        assert.ok(bannedIn(`aa ${word} bb`, code).includes(word), `${code}: ${word}`)
      }
    }
  })

  test('a word is found with an ending after it', () => {
    assert.deepEqual(bannedIn('ഇത് ചതിയാണ്', 'ml'), ['ചതി'])
    assert.deepEqual(bannedIn('यह महँगा है', 'hi'), ['महँगा'])
    assert.deepEqual(bannedIn('यह ठगी है', 'hi'), ['ठग'])
    assert.deepEqual(bannedIn('This is cheating.', 'en'), ['cheat'])
  })

  test('the letters of a word in the middle of another word are not a match', () => {
    assert.deepEqual(bannedIn('യഥാർത്ഥ ചെലവ് കാണിച്ചതിനെക്കാൾ കുറവാണ്', 'ml'), [])
    assert.deepEqual(bannedIn('An unavoidable fee.', 'en'), [])
  })
})
