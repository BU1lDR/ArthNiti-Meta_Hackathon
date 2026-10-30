// The number beside a piece of advice that has one. The rules write it
// (backend/app/services/amounts_service.py) into advisory.amounts, keyed by the
// code of the sentence it belongs to, and the sentence itself is never touched:
// the read-aloud and the written plan both drop a sentence with a digit in it.
//
// Each kind of entry has a sentence of its own in the dictionary (amt.*) and a
// list of the figures that sentence fills. The page passes its own money
// formatter, because every page keeps its own copy of it. An entry that is
// missing, of a kind this build does not know, or with a figure that is not a
// finite number gives '': a result stored before the amounts existed prints
// nothing, never a dotted key, a half-filled sentence or "NaN".
//
// `with_new_loan` picks between two wordings of the loan-payments sentence,
// because with the loan for the funding gap counted in, the limit is lower than
// the line itself.
const AMOUNT_LINES = {
  break_even: () => ({ key: 'amt.breakEven', figures: ['shortfall'] }),
  loan_payments: (entry) => ({
    key: entry.with_new_loan === true ? 'amt.loanPaymentsNew' : 'amt.loanPayments',
    figures: ['now', 'limit', 'cut'],
  }),
  household_payments: () => ({ key: 'amt.householdPayments', figures: ['now', 'limit', 'cut'] }),
  cash_reserve: () => ({ key: 'amt.cashReserve', figures: ['have', 'target', 'short'] }),
}

export function amountLine(entry, t, money) {
  // hasOwn, not a plain lookup: a kind of "constructor" must not find a function.
  if (!entry || !Object.hasOwn(AMOUNT_LINES, entry.kind)) return ''
  const line = AMOUNT_LINES[entry.kind](entry)
  const values = {}
  for (const name of line.figures) {
    // Number.isFinite does not coerce: "4000", null and true are all refused.
    if (!Number.isFinite(entry[name])) return ''
    values[name] = money(entry[name])
  }
  return t(line.key, values)
}
