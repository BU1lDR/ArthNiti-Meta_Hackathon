import { useState } from 'react'
import { checkOffer } from '../data/loanOffer'
import { useI18n } from '../i18n/LanguageContext'
import { offerErrors, offerLines, pricedLoan } from '../i18n/offerLines'

// A loan offer the reader has been made, typed in and priced on the spot (on /advisory).
// Everything here is worked out in this tab from the numbers typed: nothing is sent, nothing is
// stored (the boxes are plain component state, gone with the page) and no model is involved.
// data/loanOffer.js does the sums and i18n/offerLines.js picks the sentences; their node tests and
// the browser gate tools/verify/offer-ui.mjs pin them.
//
// The card says what an offer costs, beside the loan the rules priced and a figure at the rate
// this app assumes. It gives no opinion on the offer: tools/verify/offer-banned.mjs lists the words
// it may not use. The page passes its own money formats, because every page keeps its own copy.

const fieldClass = 'mt-2 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4 text-base text-[var(--color-text)] shadow-sm outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary-strong)]'

const WAYS = [['instalments', 'offer.wayPayments'], ['rate', 'offer.wayRate']]
const OFTEN = [['daily', 'offer.daily'], ['weekly', 'offer.weekly'], ['monthly', 'offer.monthly']]

// What each way of telling an offer asks for, kept apart so that a number typed for one is never
// read as the other's: the money in hand after a fee is not the money borrowed.
const BLANK = {
  instalments: { received: '', instalment: '', payments: '' },
  rate: { received: '', rate: '', months: '' },
}

const LINE_CLASS = {
  total: 'leading-7 text-[var(--color-text)]',
  yearly: 'text-xl font-extrabold leading-8 text-[var(--color-text)]',
  compare: 'text-sm leading-6 text-[var(--color-text)]',
  compareNote: 'text-sm leading-6 text-[var(--color-text-muted)]',
}

function OfferCheck({ financing, money, exact }) {
  const { t } = useI18n()
  // Neither way, and no frequency, is chosen for the reader: a guess would be priced as an answer.
  const [mode, setMode] = useState('')
  const [often, setOften] = useState('')
  const [typed, setTyped] = useState(BLANK)

  const check = checkOffer({ mode, often, ...typed[mode] }, financing?.assumed_interest_rate_percent)
  const errors = offerErrors(check, often, t, money)
  const lines = offerLines(check, t, money)
  // The loan the rules priced is read beside an offer, so it comes with a result and not before.
  const priced = lines.length > 0 ? pricedLoan(financing, t, money, exact) : null

  const box = (name) => ({
    name,
    value: typed[mode][name],
    error: errors[name],
    onChange: (event) => setTyped((all) => ({ ...all, [mode]: { ...all[mode], [name]: event.target.value } })),
  })

  return (
    <section className="ui-card mt-6 sm:p-8 print:hidden" aria-labelledby="offer-title" data-offer="card">
      <p className="ui-eyebrow">{t('offer.eyebrow')}</p>
      <h2 id="offer-title" className="mt-1 text-2xl font-bold text-[var(--color-text)]">{t('offer.title')}</h2>
      <p className="mt-3 leading-7 text-[var(--color-text-muted)]">{t('offer.intro')}</p>

      <div className="mt-6">
        <Choice legend={t('offer.wayLegend')} name="offer-way" options={WAYS} value={mode} onChange={setMode} t={t} />
      </div>

      {mode && (
        <div key={mode} className="mt-6 grid gap-5 sm:grid-cols-2">
          {mode === 'instalments' ? (
            <>
              <Box {...box('received')} label={t('offer.received')} money />
              <Box {...box('instalment')} label={t('offer.instalment')} money />
              <div className="sm:col-span-2">
                <Choice legend={t('offer.oftenLegend')} name="offer-often" options={OFTEN} value={often} onChange={setOften} t={t} row />
              </div>
              <Box {...box('payments')} label={t('offer.payments')} max={6} />
            </>
          ) : (
            <>
              <Box {...box('received')} label={t('offer.lent')} money />
              <Box {...box('rate')} label={t('offer.rate')} hint={t('offer.rateHelp')} decimal max={10} />
              <Box {...box('months')} label={t('offer.months')} max={6} />
              <p className="ui-chart-caption sm:col-span-2">{t('offer.rateNote')}</p>
            </>
          )}
        </div>
      )}

      {/* Always in the page and only its text changes: a live region that arrives together with
          its message is often not announced. */}
      <div role="status" data-offer="result">
        {lines.length > 0 && (
          <div className="ui-card-soft mt-6 space-y-2 p-4 sm:p-5">
            {lines.map(({ id, text }) => (
              <p key={id} data-offer-line={id} className={LINE_CLASS[id]}>{text}</p>
            ))}
            {mode === 'instalments' && often === 'daily' && check.status === 'cost' && (
              <p className="ui-chart-caption">{t('offer.howDaily')}</p>
            )}
          </div>
        )}
      </div>

      {priced && <PricedLoan priced={priced} t={t} />}

      <p className="ui-chart-caption">{t('offer.howNot')}</p>
      <details className="ui-disclosure mt-5">
        <summary>{t('offer.how')}</summary>
        <div className="ui-disclosure-body space-y-3">
          <p>{t('offer.howYearly')}</p>
          <p>{t('offer.howCompare')}</p>
        </div>
      </details>
    </section>
  )
}

// A group of native radio buttons, none chosen until the reader chooses.
function Choice({ legend, name, options, value, onChange, t, row = false }) {
  return (
    <fieldset className="min-w-0">
      <legend className="font-extrabold">{legend}</legend>
      <div className={row ? 'mt-3 flex flex-wrap gap-x-8 gap-y-3' : 'mt-3 space-y-3'}>
        {options.map(([option, key]) => (
          <label key={option} className="ui-check">
            <input type="radio" name={name} value={option} checked={value === option} onChange={() => onChange(option)} />
            <span>{t(key)}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

// One typed number. It is text and not a number input, because the sums read the digits exactly as
// typed and the card says what is wrong with them; the keyboard is still a numeric one.
function Box({ name, label, hint, value, onChange, error, money = false, decimal = false, max = 15 }) {
  const id = `offer-${name}`
  const describedBy = [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined
  return (
    <div className="ui-field">
      <label htmlFor={id} className="font-extrabold">{label}</label>
      {hint && <p id={`${id}-hint`} className="mt-1 text-sm font-normal text-[var(--color-text-muted)]">{hint}</p>}
      <span className={money ? 'ui-money-field' : 'block'}>
        {money && <span className="ui-money-prefix" aria-hidden="true">₹</span>}
        <input
          id={id}
          name={id}
          value={value}
          onChange={onChange}
          type="text"
          inputMode={decimal ? 'decimal' : 'numeric'}
          autoComplete="off"
          maxLength={max}
          className={fieldClass}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
        />
      </span>
      {error && (
        <p id={`${id}-error`} role="alert" className="ui-notice ui-notice-danger mt-3 font-bold text-[var(--color-danger)]">
          {error}
        </p>
      )}
    </div>
  )
}

// The loan the rules priced for this reader, as the loan-options card prints it, or the reason
// they priced none.
function PricedLoan({ priced, t }) {
  return (
    <div data-offer="priced" className="ui-card-soft mt-4 p-4 sm:p-5">
      <h3 className="font-extrabold text-[var(--color-text)]">{t('offer.pricedTitle')}</h3>
      {priced.reason ? (
        <p className="mt-2 text-sm leading-6 text-[var(--color-text)]">{priced.reason}</p>
      ) : (
        <>
          <p className="mt-1 text-sm font-bold text-[var(--color-text-muted)]">{priced.term}</p>
          <dl className="mt-3 space-y-2 text-sm">
            {priced.rows.map(({ id, label, value }) => (
              <div key={id} className="flex flex-wrap items-baseline justify-between gap-x-4">
                <dt className="min-w-0 text-[var(--color-text-muted)]">{label}</dt>
                <dd className="whitespace-nowrap font-bold text-[var(--color-text)]">{value}</dd>
              </div>
            ))}
          </dl>
          {priced.assumption && <p className="ui-chart-caption">{priced.assumption}</p>}
        </>
      )}
    </div>
  )
}

export default OfferCheck
