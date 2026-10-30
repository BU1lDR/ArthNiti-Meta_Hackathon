// Unit tests for frontend/src/data/loanOffer.js: the check of a loan offer a person types in
// (the card on /advisory). It works out, on the device and from the typed numbers alone, what
// the offer costs for a year and in all, and it picks which of the loans the rules priced is
// shown beside it. No network, no key, no server. Run from the repo root:
//
//   node --test tools/verify/offer-lib-test.mjs
//
// Three things are pinned.
//
// 1. The maths. The yearly cost is found by solving for the rate at which the payments, taken
//    as they fall due, are worth the money in hand. Every answer is checked three ways that
//    do not share the module's method: against numbers worked out in Python with 60-digit
//    Decimal arithmetic (tools/verify/offer_reference.py prints them), against a loop that
//    adds up the discounted payments one at a time, and against properties a correct answer
//    must have (scaling, frequency, ordering).
// 2. What is refused. A blank box is not an error; a number that is not a whole number of
//    rupees, a rate that is not above 0, or a figure above the cap is; and nothing is
//    worked out from a half-filled form.
// 3. Which priced loan is shown, and that stored data is never changed.

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  PAYMENTS_PER_YEAR,
  MAX_PAYMENTS,
  MAX_MONTHS,
  MAX_RATE,
  checkOffer,
  pickPricedLoan,
} from '../../frontend/src/data/loanOffer.js'
import { MAX_RUPEES } from '../../frontend/src/data/limits.js'

const BY_INSTALMENTS = (fields) => ({
  mode: 'instalments',
  received: '10000',
  instalment: '889',
  often: 'monthly',
  payments: '12',
  ...fields,
})
const BY_RATE = (fields) => ({ mode: 'rate', received: '10000', rate: '3', months: '6', ...fields })

// The payments, discounted one at a time. The module uses a closed form; this does not.
function presentValue(ratePerPayment, instalment, payments) {
  let total = 0
  let factor = 1
  for (let k = 0; k < payments; k++) {
    factor /= 1 + ratePerPayment
    total += instalment * factor
  }
  return total
}

const closeTo = (actual, expected, relative, what) => {
  const gap = Math.abs(actual - expected)
  assert.ok(gap <= Math.abs(expected) * relative, `${what}: ${actual} is not within ${relative} of ${expected}`)
}

describe('the limits are the ones the page states', () => {
  test('a year is 365 daily, 52 weekly or 12 monthly payments', () => {
    assert.deepEqual(PAYMENTS_PER_YEAR, { daily: 365, weekly: 52, monthly: 12 })
  })

  test('each way of paying is capped at ten years of payments, and the rate and the months are capped', () => {
    assert.deepEqual(MAX_PAYMENTS, { daily: 3650, weekly: 520, monthly: 120 })
    assert.equal(MAX_MONTHS, 120)
    assert.equal(MAX_RATE, 100)
  })
})

describe('paying by instalments: the yearly cost', () => {
  // received, each payment, number of payments, how often, the yearly percent from Python.
  const REFERENCE = [
    [1000, 1100, 1, 'monthly', 120, 1e-12],
    [10000, 889, 12, 'monthly', 12.109453221792819, 1e-9],
    [5000, 500, 12, 'weekly', 151.9884119994952, 1e-9],
    [5000, 100, 60, 'daily', 225.69458038576965, 1e-9],
    [100000, 4000, 36, 'monthly', 25.45336994181629, 1e-9],
    [20000, 700, 30, 'weekly', 16.520938430928062, 1e-9],
    [1500, 100, 16, 'weekly', 40.01754824123485, 1e-9],
    // The ends: one rupee over at the largest payment the page takes, and a payment that is 140 million times the loan.
    [999999999, 1000000000, 1, 'monthly', 1.2000000012e-6, 1e-9],
    [7, 1000000000, 1, 'daily', 5214285677785.714, 1e-9],
  ]

  for (const [received, instalment, payments, often, yearly, tolerance] of REFERENCE) {
    test(`${received} in hand, ${payments} ${often} payments of ${instalment}: ${yearly}% a year`, () => {
      const result = checkOffer(
        BY_INSTALMENTS({
          received: String(received),
          instalment: String(instalment),
          payments: String(payments),
          often,
        }),
      )
      assert.equal(result.status, 'cost')
      closeTo(result.yearlyPercent, yearly, tolerance, 'yearly percent')
      assert.equal(result.totalPaid, instalment * payments)
      assert.equal(result.extra, instalment * payments - received)
      assert.equal(result.received, received)
    })
  }

  test('the answer satisfies the equation it was solved from, over a sweep of 1,000+ offers', () => {
    let checked = 0
    for (const received of [1, 50, 1000, 5000, 12345, 100000, 10000000, 1000000000]) {
      for (const payments of [1, 2, 3, 12, 30, 52, 100, 365]) {
        for (const often of ['daily', 'weekly', 'monthly']) {
          if (payments > MAX_PAYMENTS[often]) continue
          for (const ratio of [1.0001, 1.01, 1.1, 1.5, 3, 10]) {
            const instalment = Math.ceil((received * ratio) / payments)
            if (instalment > MAX_RUPEES) continue
            const result = checkOffer(
              BY_INSTALMENTS({
                received: String(received),
                instalment: String(instalment),
                payments: String(payments),
                often,
              }),
            )
            const label = `${received} / ${instalment} x ${payments} ${often}`
            assert.equal(result.status, 'cost', label)
            assert.ok(Number.isFinite(result.yearlyPercent) && result.yearlyPercent > 0, label)
            const ratePerPayment = result.yearlyPercent / 100 / PAYMENTS_PER_YEAR[often]
            closeTo(presentValue(ratePerPayment, instalment, payments), received, 1e-9, label)
            checked++
          }
        }
      }
    }
    assert.ok(checked >= 1000, `only ${checked} offers swept`)
  })

  test('the same payments cost more a year the oftener they fall: the rate for each payment does not change', () => {
    const run = (often) => checkOffer(BY_INSTALMENTS({ received: '5000', instalment: '150', payments: '40', often }))
    const daily = run('daily').yearlyPercent
    const weekly = run('weekly').yearlyPercent
    const monthly = run('monthly').yearlyPercent
    closeTo(daily / monthly, 365 / 12, 1e-12, 'daily over monthly')
    closeTo(weekly / monthly, 52 / 12, 1e-12, 'weekly over monthly')
  })

  test('doubling the loan and the payment changes nothing', () => {
    const one = checkOffer(BY_INSTALMENTS({ received: '7300', instalment: '650', payments: '14', often: 'weekly' }))
    const two = checkOffer(BY_INSTALMENTS({ received: '14600', instalment: '1300', payments: '14', often: 'weekly' }))
    closeTo(two.yearlyPercent, one.yearlyPercent, 1e-12, 'yearly percent')
  })

  test('a bigger payment is a dearer offer', () => {
    let last = 0
    for (const instalment of [851, 900, 950, 1000, 1200, 2000, 5000]) {
      const result = checkOffer(BY_INSTALMENTS({ received: '10000', instalment: String(instalment) }))
      assert.ok(result.yearlyPercent > last, `${instalment}`)
      last = result.yearlyPercent
    }
  })

  test('the total, the extra and the money in hand add up exactly', () => {
    const result = checkOffer(BY_INSTALMENTS({ received: '8000', instalment: '700', payments: '13', often: 'weekly' }))
    assert.equal(result.totalPaid, 9100)
    assert.equal(result.extra, 1100)
    assert.equal(result.received + result.extra, result.totalPaid)
  })

  test('payments that add up to the money in hand cost nothing extra', () => {
    const result = checkOffer(BY_INSTALMENTS({ received: '1000', instalment: '100', payments: '10', often: 'monthly' }))
    assert.equal(result.status, 'same')
    assert.equal(result.totalPaid, 1000)
    assert.equal(result.extra, 0)
  })

  test('payments that add up to less than the money in hand are not worked into a rate', () => {
    const result = checkOffer(BY_INSTALMENTS({ received: '1000', instalment: '99', payments: '10', often: 'monthly' }))
    assert.equal(result.status, 'less')
    assert.equal(result.totalPaid, 990)
    assert.equal(result.yearlyPercent, undefined)
  })

  test('no figure is ever NaN or infinite', () => {
    let seed = 20261030
    const next = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296
      return seed / 4294967296
    }
    for (let i = 0; i < 2000; i++) {
      const received = 1 + Math.floor(next() ** 4 * MAX_RUPEES)
      const often = ['daily', 'weekly', 'monthly'][Math.floor(next() * 3)]
      const payments = 1 + Math.floor(next() * MAX_PAYMENTS[often])
      const instalment = 1 + Math.floor(next() ** 3 * Math.min(MAX_RUPEES, (received * 3) / payments + 10))
      const result = checkOffer(
        BY_INSTALMENTS({ received: String(received), instalment: String(instalment), payments: String(payments), often }),
        12,
      )
      const label = `${received} / ${instalment} x ${payments} ${often}`
      for (const [name, value] of Object.entries(result)) {
        if (typeof value === 'number') assert.ok(Number.isFinite(value), `${label}: ${name} is ${value}`)
      }
      if (result.status === 'cost') {
        assert.ok(result.yearlyPercent > 0, label)
        assert.ok(Number.isFinite(result.atAssumed.totalPaid), label)
      }
    }
  })
})

describe('paying by instalments: the same money at the rate the app assumes', () => {
  test('12% a year, 12 monthly payments on 10,000: 10,662 in all', () => {
    const result = checkOffer(BY_INSTALMENTS(), 12)
    assert.deepEqual(result.atAssumed, { ratePercent: 12, totalPaid: 10662 })
  })

  test('the same on weekly, daily and a longer monthly loan', () => {
    const run = (fields) => checkOffer(BY_INSTALMENTS(fields), 12).atAssumed.totalPaid
    assert.equal(run({ received: '5000', instalment: '500', payments: '12', often: 'weekly' }), 5075)
    assert.equal(run({ received: '5000', instalment: '100', payments: '60', often: 'daily' }), 5050)
    assert.equal(run({ received: '100000', instalment: '4000', payments: '36', often: 'monthly' }), 119572)
  })

  test('another assumed rate is used as it is given', () => {
    const at = (rate) => checkOffer(BY_INSTALMENTS(), rate).atAssumed.totalPaid
    assert.ok(at(24) > at(12) && at(12) > at(6))
    closeTo(at(12), 10661.854641401005, 1e-4, '12%')
  })

  test('no rate given, or one that is not a positive number, gives no comparison', () => {
    for (const odd of [undefined, null, 0, -12, NaN, Infinity, '12', true, []]) {
      assert.equal(checkOffer(BY_INSTALMENTS(), odd).atAssumed, null, String(odd))
    }
  })

  test('there is no comparison on a result that is not a cost', () => {
    // 833 x 12 = 9,996: less than the 10,000 in hand.
    assert.equal(checkOffer(BY_INSTALMENTS({ instalment: '833' }), 12).atAssumed, undefined)
    assert.equal(checkOffer(BY_INSTALMENTS({ instalment: '834' }), 12).status, 'cost')
  })
})

describe('paying by a quoted rate', () => {
  test('3 rupees for every 100 each month, for 6 months, on 10,000: 1,800 extra, 36% a year', () => {
    const result = checkOffer(BY_RATE())
    assert.equal(result.status, 'cost')
    assert.equal(result.mode, 'rate')
    assert.equal(result.received, 10000)
    assert.equal(result.extra, 1800)
    assert.equal(result.totalPaid, 11800)
    closeTo(result.yearlyPercent, 36, 1e-12, 'yearly percent')
  })

  test('the yearly percent is twelve times the monthly rate', () => {
    for (const rate of ['0.5', '1', '2.5', '2.55', '5', '10', '99.99']) {
      closeTo(checkOffer(BY_RATE({ rate })).yearlyPercent, Number(rate) * 12, 1e-12, rate)
    }
  })

  test('a part of a rupee is rounded once, and the total is the money plus the rounded extra', () => {
    const result = checkOffer(BY_RATE({ received: '1001', rate: '2.5', months: '3' }))
    assert.equal(result.extra, 75)
    assert.equal(result.totalPaid, 1076)
  })

  test('more than half a rupee goes up and less than half goes down', () => {
    assert.equal(checkOffer(BY_RATE({ received: '1010', rate: '2.5', months: '3' })).extra, 76) // 75.75
    assert.equal(checkOffer(BY_RATE({ received: '1001', rate: '2.5', months: '3' })).extra, 75) // 75.075
  })

  test('exactly half a rupee goes up, even where plain floating-point arithmetic would drop it', () => {
    // 3000 x 0.29 x 5 / 100 is exactly 43.5, but Math.round(3000 * 0.29 * 5 / 100) is 43.
    for (const [received, rate, months, extra] of [
      [50, '1', 1, 1],
      [3000, '0.29', 5, 44],
      [1500, '0.29', 10, 44],
      [750, '0.29', 20, 44],
      [3000, '0.29', 15, 131],
      [350, '0.35', 20, 25],
    ]) {
      const result = checkOffer(BY_RATE({ received: String(received), rate, months: String(months) }))
      assert.equal(result.extra, extra, `${received} at ${rate} for ${months} months`)
      assert.equal(result.totalPaid, received + extra)
    }
  })

  test('the comparison is the same money at the assumed rate, charged the same way', () => {
    assert.deepEqual(checkOffer(BY_RATE(), 12).atAssumed, { ratePercent: 12, totalPaid: 10600 })
    assert.deepEqual(checkOffer(BY_RATE(), 18).atAssumed, { ratePercent: 18, totalPaid: 10900 })
  })

  test('no rate given, or one that is not a positive number, gives no comparison', () => {
    for (const odd of [undefined, null, 0, -12, NaN, Infinity, '12']) {
      assert.equal(checkOffer(BY_RATE(), odd).atAssumed, null, String(odd))
    }
  })

  test('the largest figures the page accepts give finite, whole-rupee money', () => {
    const result = checkOffer(BY_RATE({ received: String(MAX_RUPEES), rate: String(MAX_RATE), months: String(MAX_MONTHS) }), 12)
    assert.equal(result.status, 'cost')
    assert.ok(Number.isSafeInteger(result.totalPaid))
    assert.equal(result.totalPaid, MAX_RUPEES + MAX_RUPEES * MAX_RATE * MAX_MONTHS / 100)
  })
})

describe('what is a blank, what is a mistake', () => {
  const status = (input) => checkOffer(input).status

  test('a form with nothing in it, or a box missing, is incomplete and has no error', () => {
    const blank = { mode: 'instalments', received: '', instalment: '', often: '', payments: '' }
    assert.deepEqual(checkOffer(blank), { status: 'incomplete' })
    for (const field of ['received', 'instalment', 'often', 'payments']) {
      assert.deepEqual(checkOffer(BY_INSTALMENTS({ [field]: '' })), { status: 'incomplete' }, field)
    }
    for (const field of ['received', 'rate', 'months']) {
      assert.deepEqual(checkOffer(BY_RATE({ [field]: '' })), { status: 'incomplete' }, field)
    }
  })

  test('spaces only is blank, and a field that is missing altogether is blank', () => {
    assert.equal(status(BY_INSTALMENTS({ received: '   ' })), 'incomplete')
    assert.equal(status({ mode: 'rate', received: '100', rate: '3' }), 'incomplete')
    assert.equal(status(BY_INSTALMENTS({ payments: undefined, instalment: null })), 'incomplete')
  })

  test('a way of paying that is not one of the three is a blank', () => {
    for (const often of ['', 'yearly', 'fortnightly', 'DAILY', 'constructor', '__proto__', 'toString']) {
      assert.equal(status(BY_INSTALMENTS({ often })), 'incomplete', often)
    }
  })

  test('a mode that is not one of the two works nothing out', () => {
    // Every box of both ways is filled in, so only the mode can be what stops the working out.
    const everything = { ...BY_INSTALMENTS(), ...BY_RATE() }
    for (const mode of [undefined, '', 'both', 'constructor']) {
      assert.deepEqual(checkOffer({ ...everything, mode }), { status: 'incomplete' }, String(mode))
    }
    assert.equal(checkOffer({ ...everything, mode: 'instalments' }).mode, 'instalments')
    assert.equal(checkOffer({ ...everything, mode: 'rate' }).mode, 'rate')
    assert.deepEqual(checkOffer(undefined), { status: 'incomplete' })
    assert.deepEqual(checkOffer(null), { status: 'incomplete' })
  })

  test('money must be a whole number of rupees, 1 or more', () => {
    for (const bad of ['0', '00', '-5', '1.5', '10.0', '1e3', 'abc', '5 000', '5,000', '₹5000', '+5', '٣', '१२']) {
      assert.deepEqual(checkOffer(BY_INSTALMENTS({ received: bad })), { status: 'invalid', errors: { received: 'whole' } }, bad)
      assert.deepEqual(checkOffer(BY_INSTALMENTS({ instalment: bad })), { status: 'invalid', errors: { instalment: 'whole' } }, bad)
    }
    // Whatever else happens to these, they are not refused as mistakes.
    for (const good of ['1', '007', '  500  ', String(MAX_RUPEES)]) {
      assert.ok(['cost', 'same', 'less'].includes(status(BY_INSTALMENTS({ received: good }))), good)
      assert.ok(['cost', 'same', 'less'].includes(status(BY_INSTALMENTS({ instalment: good }))), good)
    }
  })

  test('money above the cap is out of range, and exactly the cap is not', () => {
    assert.deepEqual(
      checkOffer(BY_INSTALMENTS({ received: String(MAX_RUPEES + 1) })),
      { status: 'invalid', errors: { received: 'range' } },
    )
    assert.deepEqual(
      checkOffer(BY_INSTALMENTS({ instalment: String(MAX_RUPEES + 1) })),
      { status: 'invalid', errors: { instalment: 'range' } },
    )
    assert.equal(status(BY_INSTALMENTS({ received: String(MAX_RUPEES), instalment: String(MAX_RUPEES), payments: '2' })), 'cost')
  })

  test('a number so long it is no longer exact is out of range, not rounded', () => {
    assert.deepEqual(
      checkOffer(BY_INSTALMENTS({ received: '9'.repeat(30) })),
      { status: 'invalid', errors: { received: 'range' } },
    )
    assert.deepEqual(
      checkOffer(BY_INSTALMENTS({ received: '9'.repeat(400) })),
      { status: 'invalid', errors: { received: 'range' } },
    )
  })

  test('payments are whole numbers up to ten years of them for that way of paying', () => {
    for (const [often, max] of [['daily', 3650], ['weekly', 520], ['monthly', 120]]) {
      assert.equal(status(BY_INSTALMENTS({ often, payments: String(max) })), 'cost', `${often} ${max}`)
      assert.deepEqual(
        checkOffer(BY_INSTALMENTS({ often, payments: String(max + 1) })),
        { status: 'invalid', errors: { payments: 'range' } },
        `${often} ${max + 1}`,
      )
      assert.deepEqual(
        checkOffer(BY_INSTALMENTS({ often, payments: '0' })),
        { status: 'invalid', errors: { payments: 'whole' } },
        `${often} 0`,
      )
    }
    assert.deepEqual(checkOffer(BY_INSTALMENTS({ payments: '2.5' })), { status: 'invalid', errors: { payments: 'whole' } })
  })

  test('the limit on payments follows the way of paying that is chosen', () => {
    assert.equal(status(BY_INSTALMENTS({ often: 'daily', payments: '365' })), 'cost')
    assert.equal(status(BY_INSTALMENTS({ often: 'monthly', payments: '365' })), 'invalid')
  })

  test('the rate must be a number above 0 and at most the cap', () => {
    for (const bad of ['0', '0.0', '-1', 'abc', '2,5', '1e1', '3%', '₹3', '..5', '1.2.3']) {
      assert.deepEqual(checkOffer(BY_RATE({ rate: bad })), { status: 'invalid', errors: { rate: 'rate' } }, bad)
    }
    for (const good of ['3', '3.', '.5', '0.01', '100', ' 2.5 ']) {
      assert.equal(status(BY_RATE({ rate: good })), 'cost', good)
    }
    assert.deepEqual(checkOffer(BY_RATE({ rate: '100.01' })), { status: 'invalid', errors: { rate: 'range' } })
  })

  test('months are whole numbers, 1 to 120', () => {
    assert.equal(status(BY_RATE({ months: '120' })), 'cost')
    assert.deepEqual(checkOffer(BY_RATE({ months: '121' })), { status: 'invalid', errors: { months: 'range' } })
    for (const bad of ['0', '1.5', '-2', 'x']) {
      assert.deepEqual(checkOffer(BY_RATE({ months: bad })), { status: 'invalid', errors: { months: 'whole' } }, bad)
    }
  })

  test('every mistake is reported, a blank is not, and nothing is worked out', () => {
    const result = checkOffer(BY_INSTALMENTS({ received: '1.5', instalment: '', payments: '0' }))
    assert.deepEqual(result, { status: 'invalid', errors: { received: 'whole', payments: 'whole' } })
    assert.equal(result.yearlyPercent, undefined)
  })

  test('a number that was typed arrives as a number: it is read the same', () => {
    const typed = checkOffer(BY_INSTALMENTS())
    const numbers = checkOffer(BY_INSTALMENTS({ received: 10000, instalment: 889, payments: 12 }))
    assert.deepEqual(numbers, typed)
  })
})

describe('the same input always gives the same answer, and nothing is shared', () => {
  test('two calls are equal and are separate objects', () => {
    const input = BY_INSTALMENTS()
    const one = checkOffer(input, 12)
    const two = checkOffer(input, 12)
    assert.deepEqual(one, two)
    assert.notEqual(one, two)
    assert.notEqual(one.atAssumed, two.atAssumed)
  })

  test('the input is not changed', () => {
    const input = Object.freeze(BY_INSTALMENTS())
    assert.doesNotThrow(() => checkOffer(input, 12))
  })
})

describe('which of the priced loans is shown beside the offer', () => {
  const option = (months, loan, extra = {}) => ({
    code: `term_${months}`,
    tenure_months: months,
    loan_amount: loan,
    monthly_repayment: Math.round(loan / months) + 20,
    total_repayment: loan * 1.2,
    ...extra,
  })
  const deepFreeze = (value) => {
    if (value && typeof value === 'object') {
      Object.freeze(value)
      Object.values(value).forEach(deepFreeze)
    }
    return value
  }

  test('the one the rules recommend', () => {
    const financing = {
      status: 'covered',
      recommended_by_rules: 'term_36',
      options: [option(12, 16000), option(24, 31000), option(36, 45000), option(60, 50000)],
    }
    assert.equal(pickPricedLoan(financing), financing.options[2])
  })

  test('with none recommended, the largest loan', () => {
    const financing = {
      status: 'partial',
      recommended_by_rules: null,
      options: [option(12, 5000), option(24, 10000), option(36, 15000), option(60, 22000)],
    }
    assert.equal(pickPricedLoan(financing), financing.options[3])
  })

  test('the largest loan, and for the same loan the shorter term', () => {
    const financing = {
      status: 'partial',
      recommended_by_rules: null,
      options: [option(60, 20000), option(24, 20000), option(36, 20000), option(12, 8000)],
    }
    assert.equal(pickPricedLoan(financing), financing.options[1])
  })

  test('a recommendation that is not among the options falls back to the largest loan', () => {
    const financing = {
      status: 'covered',
      recommended_by_rules: 'term_99',
      options: [option(12, 5000), option(24, 9000)],
    }
    assert.equal(pickPricedLoan(financing), financing.options[1])
  })

  test('a recommendation that is not usable falls back to the largest of the usable ones', () => {
    const broken = option(36, 99999, { monthly_repayment: null })
    const financing = {
      status: 'covered',
      recommended_by_rules: 'term_36',
      options: [option(12, 5000), broken, option(24, 9000)],
    }
    assert.equal(pickPricedLoan(financing), financing.options[2])
  })

  test('an option without all of its figures is never shown', () => {
    for (const missing of ['tenure_months', 'loan_amount', 'monthly_repayment', 'total_repayment']) {
      for (const odd of [undefined, null, '5000', NaN, Infinity]) {
        const financing = { status: 'covered', recommended_by_rules: 'term_12', options: [option(12, 5000, { [missing]: odd })] }
        assert.equal(pickPricedLoan(financing), null, `${missing} ${String(odd)}`)
      }
    }
  })

  test('a loan of nothing, or a term of nothing, is never shown', () => {
    for (const odd of [0, -5000]) {
      const loan = { status: 'covered', recommended_by_rules: 'term_12', options: [option(12, 5000, { loan_amount: odd })] }
      assert.equal(pickPricedLoan(loan), null, `loan ${odd}`)
      const term = { status: 'covered', recommended_by_rules: 'term_12', options: [option(12, 5000, { tenure_months: odd })] }
      assert.equal(pickPricedLoan(term), null, `term ${odd}`)
    }
  })

  test('an option that has no code is not taken for a recommendation that has none', () => {
    const noCode = option(12, 5000, { code: undefined })
    const financing = { status: 'partial', options: [noCode, option(24, 9000)] }
    assert.equal(pickPricedLoan(financing), financing.options[1])
    assert.equal(pickPricedLoan({ status: 'partial', options: [noCode] }), noCode)
  })

  test('only a covered or partial result has a loan to show', () => {
    for (const status of ['no_gap', 'no_surplus', 'household_over_limit', 'no_room', 'something_new', undefined, null]) {
      const financing = { status, recommended_by_rules: 'term_12', options: [option(12, 5000)] }
      assert.equal(pickPricedLoan(financing), null, String(status))
    }
  })

  test('nothing, or something that is not the section, shows nothing', () => {
    for (const odd of [undefined, null, '', 0, 'covered', [], {}, { status: 'covered' }, { status: 'covered', options: 'x' }, { status: 'covered', options: [] }]) {
      assert.equal(pickPricedLoan(odd), null, JSON.stringify(odd))
    }
    assert.equal(pickPricedLoan({ status: 'covered', options: [null, 3, 'x', undefined] }), null)
  })

  test('stored data is read and never changed', () => {
    const financing = deepFreeze({
      status: 'covered',
      recommended_by_rules: 'term_24',
      options: [option(12, 5000), option(24, 9000)],
    })
    assert.doesNotThrow(() => pickPricedLoan(financing))
    assert.doesNotThrow(() => pickPricedLoan(deepFreeze({ status: 'partial', options: [option(60, 1), option(12, 1)] })))
  })
})
