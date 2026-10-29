import { useI18n } from '../i18n/LanguageContext'

// The backend's `mvp_summary.band` (green, yellow or red) drawn as a traffic light: a
// colour, a shape and a word, never the colour alone, so it reads in print, in grey and
// to someone who cannot tell red from green. The three shapes differ on purpose
// (circle, triangle, octagon). Yellow's own colour is pale on a white page, which is
// why every body carries a dark outline.
//
// It only reads the figures the person gave, and the note under the word says so on
// every page that draws it: it is not a decision about a loan or a scheme, and green
// does not mean eligible. The rule that picks the band is in the backend
// (mvp_service.py); nothing here works it out.
//
// A result stored before the band existed has none. Then the children are drawn
// instead (the page's earlier status mark), so an old result never shows a light the
// backend did not give.
const LAMPS = {
  green: {
    key: 'band.green',
    shape: 'circle',
    drawing: (
      <>
        <circle className="ui-band-body" cx="24" cy="24" r="20" />
        <path className="ui-band-mark" d="M14 25l7 7 13-15" />
      </>
    ),
  },
  yellow: {
    key: 'band.yellow',
    shape: 'triangle',
    drawing: (
      <>
        <path className="ui-band-body" d="M24 5L45 41H3Z" />
        <path className="ui-band-mark" d="M24 17v11" />
        <circle className="ui-band-dot" cx="24" cy="34" r="2.6" />
      </>
    ),
  },
  red: {
    key: 'band.red',
    shape: 'octagon',
    drawing: (
      <>
        <path className="ui-band-body" d="M16 4h16l12 12v16L32 44H16L4 32V16Z" />
        <path className="ui-band-mark" d="M17 17l14 14M31 17L17 31" />
      </>
    ),
  },
}

function ResultBand({ band, className = '', children = null }) {
  const { t } = useI18n()

  if (!Object.hasOwn(LAMPS, band)) return children

  const lamp = LAMPS[band]

  return (
    <div className={`ui-band ui-band-${band} ${className}`.trim()}>
      <svg className="ui-band-shape" data-shape={lamp.shape} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
        {lamp.drawing}
      </svg>
      <div className="min-w-0">
        <p className="ui-band-label">{t(lamp.key)}</p>
        <p className="ui-band-basis">{t('band.basis')}</p>
      </div>
    </div>
  )
}

export default ResultBand
