import { useId, useLayoutEffect, useState } from 'react'
import { useI18n } from '../i18n/LanguageContext'

// How much of a result page to show. Simple keeps the verdict and the next step and
// leaves the working out; Detailed shows everything. The choice is a display preference
// like the language and the theme: localStorage 'sih-detail', never the financial
// answers. It is also written to <html data-detail>, which index.css reads to hide
// every .ui-detail-only section, so the pages mark what is detail and nothing here
// knows which sections those are.
//
// A choice nobody made is not stored: the key is written by a press, never on mount,
// and a missing or unknown value reads as DEFAULT_DETAIL. That is Detailed, so a
// reader who never finds the switch still sees the loan options, the scheme funding and
// the written plan. To make Simple the default change DEFAULT_DETAIL and have every
// browser verifier that seeds localStorage (tools/verify) seed 'detailed' instead.
const STORAGE_KEY = 'sih-detail'
const DEFAULT_DETAIL = 'detailed'

function readDetail() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'simple' || stored === 'detailed' ? stored : DEFAULT_DETAIL
  } catch {
    return DEFAULT_DETAIL
  }
}

function DetailSwitch() {
  const { t } = useI18n()
  const labelId = useId()
  // Read again on every mount, which is how /analysis and /advisory share the choice.
  const [detail, setDetail] = useState(readDetail)

  // A layout effect, so the attribute is on <html> before the first paint and Simple
  // never flashes the sections it hides. Another page has no switch and shows all.
  useLayoutEffect(() => {
    document.documentElement.dataset.detail = detail
    return () => {
      delete document.documentElement.dataset.detail
    }
  }, [detail])

  const choose = (next) => {
    setDetail(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Storage is off (a private window): the choice lasts until the page closes.
    }
  }

  return (
    <div className="ui-detail">
      <span id={labelId} className="ui-detail-label">{t('detail.label')}</span>
      <div className="ui-detail-switch" role="group" aria-labelledby={labelId}>
        <button type="button" aria-pressed={detail === 'simple'} onClick={() => choose('simple')}>
          {t('detail.simple')}
        </button>
        <button type="button" aria-pressed={detail === 'detailed'} onClick={() => choose('detailed')}>
          {t('detail.detailed')}
        </button>
      </div>
      {detail === 'simple' && (
        <p className="ui-detail-note">{t('detail.simpleNote', { detailed: t('detail.detailed') })}</p>
      )}
    </div>
  )
}

export default DetailSwitch
