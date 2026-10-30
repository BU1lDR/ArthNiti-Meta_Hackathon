// The words around the numbers of the loan-offer card (components/OfferCheck.jsx). The numbers
// come from data/loanOffer.js, worked out on the device from what the person typed; this file
// only picks the sentence for each result and fills it. tools/verify/offer-lines-test.mjs pins it.
//
// The card says what an offer costs and puts it beside a figure at the rate this app assumes.
// It never says an offer is illegal, too high or unfair, and never tells anyone to take it or to
// leave it: tools/verify/offer-banned.mjs lists the words no sentence here may use.
//
// A result that is missing, of a kind this build does not know, or with a figure that is not a
// finite number gives nothing at all, never a dotted key, a half-filled sentence or "NaN". The
// page passes its own money formats, because every page keeps its own copy of them.
import { MAX_RUPEES } from '../data/limits.js'
import { MAX_MONTHS, MAX_PAYMENTS, MAX_RATE, pickPricedLoan } from '../data/loanOffer.js'

// Three significant digits, grouped the way money is in India, with the sign attached to the
// number. Digits, so a very small figure stays a small figure and a very large one is not cut.
export const percentText = (value) => `${value.toLocaleString('en-IN', { maximumSignificantDigits: 3 })}%`

// The rate the comparison was worked out at is shown as it was used, not cut to three digits.
const rateText = (value) => `${value.toLocaleString('en-IN')}%`

// Number.isFinite does not coerce: "4000", null and true are all refused.
const finite = Number.isFinite

const ERROR_KEYS = { whole: 'offer.errWhole', rate: 'offer.errRate', range: 'offer.errRange' }
const BOXES = ['received', 'instalment', 'payments', 'rate', 'months']

// What a box takes at most, as text. The number of payments depends on how often they fall;
// a choice that was never made has no limit to name.
function largest(box, often, money) {
  if (box === 'received' || box === 'instalment') return money(MAX_RUPEES)
  if (box === 'months') return MAX_MONTHS.toLocaleString('en-IN')
  if (box === 'rate') return MAX_RATE.toLocaleString('en-IN')
  // hasOwn, not a plain lookup: a choice of "constructor" must not find a function.
  return typeof often === 'string' && Object.hasOwn(MAX_PAYMENTS, often)
    ? MAX_PAYMENTS[often].toLocaleString('en-IN')
    : undefined
}

// The message for each box with a mistake, by the name of the box. `often` is how the person
// said the payments fall, which sets how many payments the box takes.
export function offerErrors(check, often, t, money) {
  const errors = check?.status === 'invalid' ? check.errors : undefined
  if (errors === null || typeof errors !== 'object') return {}
  const messages = {}
  for (const box of BOXES) {
    const code = Object.hasOwn(errors, box) ? errors[box] : undefined
    if (typeof code !== 'string' || !Object.hasOwn(ERROR_KEYS, code)) continue
    if (code !== 'range') {
      messages[box] = t(ERROR_KEYS[code])
      continue
    }
    const max = largest(box, often, money)
    if (max !== undefined) messages[box] = t(ERROR_KEYS.range, { max })
  }
  return messages
}

// The lines under the form for a result, each with an id the page can hang a hook on.
export function offerLines(check, t, money) {
  if (check === null || typeof check !== 'object') return []
  const { status, received, totalPaid } = check

  if (status === 'less' || status === 'same') {
    if (!finite(received) || !finite(totalPaid)) return []
    const key = status === 'less' ? 'offer.resultLess' : 'offer.resultSame'
    return [{ id: 'total', text: t(key, { received: money(received), total: money(totalPaid) }) }]
  }
  if (status !== 'cost') return []

  const { extra, yearlyPercent, atAssumed } = check
  if (![received, totalPaid, extra, yearlyPercent].every(finite)) return []
  const lines = [
    { id: 'total', text: t('offer.resultCost', { received: money(received), total: money(totalPaid), extra: money(extra) }) },
    { id: 'yearly', text: t('offer.resultYearly', { percent: percentText(yearlyPercent) }) },
  ]

  // The same money at the rate the app assumes: left out when it was not worked out.
  if (atAssumed && finite(atAssumed.ratePercent) && finite(atAssumed.totalPaid)) {
    const rate = rateText(atAssumed.ratePercent)
    const total = money(atAssumed.totalPaid)
    const more = totalPaid - atAssumed.totalPaid
    const compare =
      more > 0
        ? t('offer.vsMore', { rate, total, diff: money(more) })
        : more < 0
          ? t('offer.vsLess', { rate, total, diff: money(-more) })
          : t('offer.vsSame', { rate, total })
    lines.push({ id: 'compare', text: compare }, { id: 'compareNote', text: t('offer.vsNote', { rate }) })
  }
  return lines
}

// The reason the rules priced no loan: the page's own sentences, the ones the loan-options card
// prints (NO_LOAN_KEYS in pages/AdvisoryPage.jsx). That card is hidden in Simple view, and the
// offer card is not.
const NO_LOAN_KEYS = {
  no_surplus: 'fo.noSurplus',
  household_over_limit: 'fo.householdOver',
  no_room: 'fo.noRoom',
}

// The loan the rules priced, to read beside the offer: its term, four rows and the assumption
// it rests on; or the reason no loan was priced; or null when the rules had no loan to price.
// `money` prints whole rupees and `exact` keeps the paise, as the loan-options card does, so one
// loan never prints two ways on one page.
export function pricedLoan(financing, t, money, exact) {
  const option = pickPricedLoan(financing)
  if (option) {
    const rows = [
      { id: 'loan', label: t('fo.loan'), value: money(option.loan_amount) },
      { id: 'perMonth', label: t('fo.perMonth'), value: money(option.monthly_repayment) },
      { id: 'totalBack', label: t('fo.totalBack'), value: exact(option.total_repayment) },
    ]
    if (finite(option.total_interest)) {
      rows.push({ id: 'interest', label: t('fo.interest'), value: exact(option.total_interest) })
    }
    const rate = financing.assumed_interest_rate_percent
    return {
      term: t('fo.term', { months: option.tenure_months }),
      rows,
      assumption: finite(rate) ? t('fo.assumption', { rate }) : '',
    }
  }
  const status = financing?.status
  const reason = typeof status === 'string' && Object.hasOwn(NO_LOAN_KEYS, status) ? NO_LOAN_KEYS[status] : undefined
  return reason ? { reason: t(reason) } : null
}
