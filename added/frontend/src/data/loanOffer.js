// The check of a loan offer a person types in (the card on /advisory).
//
// Everything here runs on the device, from the typed numbers alone: nothing is sent to the
// server, nothing is stored, and no model is involved. tools/verify/offer-lib-test.mjs pins it,
// and tools/verify/offer_reference.py prints the reference values that test checks against.
//
// Two ways of describing an offer are read:
//
//   instalments  the money in hand (after any fee), each payment, how often, how many payments.
//                The yearly cost is the rate at which the payments, taken as they fall due, are
//                worth the money in hand, times the payments in a year. It is a nominal rate: it
//                does not compound, and a daily offer counts 365 payments a year, so it is an
//                upper bound for a lender who is not paid on every day.
//   rate         a rate quoted locally, "3 rupees for every 100 each month", and the months.
//                The interest is taken on the whole amount for the whole time and the amount is
//                paid back at the end. That is the usual reading of such a quote and an
//                assumption, which the page says.
//
// Neither calls an offer fair, high or illegal. The result only states what it costs.

import { MAX_RUPEES } from './limits.js'

export const PAYMENTS_PER_YEAR = { daily: 365, weekly: 52, monthly: 12 }

// Ten years of payments, whichever way they fall.
export const MAX_PAYMENTS = { daily: 3650, weekly: 520, monthly: 120 }

export const MAX_MONTHS = 120

// Rupees for every 100 each month.
export const MAX_RATE = 100

const text = (raw) => (raw === undefined || raw === null ? '' : String(raw).trim())

// A whole number of rupees, payments or months: 1 or more, in the digits 0 to 9 only. A longer
// string than a number can hold exactly is out of range, never rounded.
function whole(s, max) {
  if (!/^\d+$/.test(s)) return { error: 'whole' }
  const n = BigInt(s)
  if (n === 0n) return { error: 'whole' }
  if (max !== undefined && n > BigInt(max)) return { error: 'range' }
  return { value: Number(n) }
}

// A rate above 0, with or without a decimal part. The digits are kept as an integer over a power
// of ten, so a half rupee is rounded the way it reads and not the way a binary fraction falls.
function rate(s) {
  const match = /^(\d*)\.?(\d*)$/.exec(s)
  if (!match) return { error: 'rate' }
  const units = BigInt(`${match[1]}${match[2]}` || '0')
  if (units === 0n) return { error: 'rate' }
  const scale = 10n ** BigInt(match[2].length)
  if (units > BigInt(MAX_RATE) * scale) return { error: 'range' }
  return { value: { percent: Number(s), units, scale } }
}

// The present value of `instalment` paid `payments` times, each payment discounted at `rate`.
// expm1 and log1p keep this exact when the rate is very small.
const worth = (instalment, payments, perPayment) =>
  (instalment * -Math.expm1(-payments * Math.log1p(perPayment))) / perPayment

// The rate for each payment at which the payments are worth `received`. One payment has a plain
// answer; more are found by halving the interval, which the answer cannot leave: at 0 the
// payments are worth more than `received`, and at instalment / received they are worth less.
function ratePerPayment(received, instalment, payments) {
  if (payments === 1) return (instalment - received) / received
  let low = 0
  let high = instalment / received
  for (let i = 0; i < 200; i++) {
    const mid = (low + high) / 2
    if (worth(instalment, payments, mid) > received) low = mid
    else high = mid
  }
  return (low + high) / 2
}

// The assumed-rate comparison is only given for a rate that is a positive number.
const usable = (assumed) => typeof assumed === 'number' && Number.isFinite(assumed) && assumed > 0

const comparison = (assumed, total) =>
  Number.isFinite(total) ? { ratePercent: assumed, totalPaid: Math.round(total) } : null

// What the same money would cost in all if it were borrowed at the rate the app assumes: the same
// number of equal payments, each at that rate for a payment's share of the year.
function atAssumedByInstalments(assumed, received, payments, perYear) {
  if (!usable(assumed)) return null
  const perPayment = assumed / 100 / perYear
  return comparison(assumed, (received * perPayment * payments) / -Math.expm1(-payments * Math.log1p(perPayment)))
}

// The same money for the same months, charged the way the offer is: on the whole amount.
function atAssumedByRate(assumed, received, months) {
  if (!usable(assumed)) return null
  return comparison(assumed, received + Math.round((received * assumed * months) / 1200))
}

// `input` is the form as typed: { mode, received, instalment, often, payments } or
// { mode, received, rate, months }, every value a string or a number. `assumedRate` is the yearly
// rate the app's own loan figures use, in percent.
//
// status:
//   incomplete  a box is empty (or a choice is not made): nothing is worked out, nothing is said
//   invalid     `errors` maps each box with a mistake to 'whole', 'range' or 'rate'; a mistake is
//               reported even while another box is still empty
//   less        the payments add up to less than the money in hand: no rate is worked out
//   same        they add up to exactly the money in hand
//   cost        they add up to more; `yearlyPercent`, `extra` and `atAssumed` (null when no
//               usable assumed rate was given) say what that costs
export function checkOffer(input, assumedRate) {
  const mode = input?.mode
  if (mode !== 'instalments' && mode !== 'rate') return { status: 'incomplete' }

  const errors = {}
  let blank = false
  const read = (name, raw, parse) => {
    const s = text(raw)
    if (s === '') {
      blank = true
      return undefined
    }
    const got = parse(s)
    if (got.error) errors[name] = got.error
    return got.value
  }

  const received = read('received', input.received, (s) => whole(s, MAX_RUPEES))
  let result
  if (mode === 'instalments') {
    const instalment = read('instalment', input.instalment, (s) => whole(s, MAX_RUPEES))
    const often =
      typeof input.often === 'string' && Object.hasOwn(PAYMENTS_PER_YEAR, input.often) ? input.often : undefined
    if (often === undefined) blank = true
    const payments = read('payments', input.payments, (s) => whole(s, often && MAX_PAYMENTS[often]))
    if (Object.keys(errors).length > 0) return { status: 'invalid', errors }
    if (blank) return { status: 'incomplete' }

    const totalPaid = instalment * payments
    result = { mode, received, totalPaid }
    if (totalPaid < received) return { status: 'less', ...result }
    result.extra = totalPaid - received
    if (result.extra === 0) return { status: 'same', ...result }
    const perYear = PAYMENTS_PER_YEAR[often]
    result.yearlyPercent = ratePerPayment(received, instalment, payments) * perYear * 100
    result.atAssumed = atAssumedByInstalments(assumedRate, received, payments, perYear)
  } else {
    const quoted = read('rate', input.rate, rate)
    const months = read('months', input.months, (s) => whole(s, MAX_MONTHS))
    if (Object.keys(errors).length > 0) return { status: 'invalid', errors }
    if (blank) return { status: 'incomplete' }

    // Rounded once, half a rupee up, on the exact product.
    const numerator = BigInt(received) * quoted.units * BigInt(months)
    const denominator = 100n * quoted.scale
    const extra = Number((2n * numerator + denominator) / (2n * denominator))
    result = {
      mode,
      received,
      totalPaid: received + extra,
      extra,
      yearlyPercent: quoted.percent * 12,
      atAssumed: atAssumedByRate(assumedRate, received, months),
    }
  }
  return { status: 'cost', ...result }
}

const positive = (value) => typeof value === 'number' && Number.isFinite(value) && value > 0

// Only an option with all four of its figures can be shown whole.
const complete = (option) =>
  option !== null &&
  typeof option === 'object' &&
  positive(option.tenure_months) &&
  positive(option.loan_amount) &&
  positive(option.monthly_repayment) &&
  positive(option.total_repayment)

// Which of the loans the rules priced (`result.financing_options`) is shown beside the offer: the
// one the rules recommend, else the largest loan, and for the same loan the shorter term. Nothing
// when the rules priced no loan. The stored data is only read.
export function pickPricedLoan(financing) {
  if (!financing || (financing.status !== 'covered' && financing.status !== 'partial')) return null
  if (!Array.isArray(financing.options)) return null
  const options = financing.options.filter(complete)
  if (options.length === 0) return null

  const recommended = financing.recommended_by_rules
  const named = recommended ? options.find((option) => option.code === recommended) : undefined
  if (named) return named
  return options.reduce((best, option) =>
    option.loan_amount > best.loan_amount ||
    (option.loan_amount === best.loan_amount && option.tenure_months < best.tenure_months)
      ? option
      : best,
  )
}
