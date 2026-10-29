// Draws the landing page's backdrop, frontend/public/hero-backdrop.svg, and
// nothing else: no image, font or dependency comes in, so the file is ours and
// the MIT licence covers it. It replaced a photo collage whose source was never
// recorded (and that showed US dollar notes) on 29 Oct 2026.
//
//   node tools/make-hero-backdrop.mjs          writes the file
//   node tools/make-hero-backdrop.mjs --check  exits 1 if the file on disk differs
//
// The same bytes come out every run (no clock, no Math.random), so the check is
// a plain comparison. The size is 1200x630, the 1.9:1 of the photo it replaced,
// because .ui-hero::before scales it with `cover` and the filter chain in
// index.css was tuned against that shape. The darkest ink is a deep teal, not
// black, which is what keeps the hero copy's contrast above AA: the worst pixel
// for dark text is the darkest dot.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

process.exitCode = 2

const OUT = resolve('frontend/public/hero-backdrop.svg')
const W = 1200
const H = 630

const INK = '#16322f'
const GROUND = '#86b5ad'
const CREAM = '#f1e8cf'
const CREAM_SHADE = '#d8caa4'
const GOLD = '#f5c542'
const GOLD_EDGE = '#c58a1c'
const LEAF = '#5c8f55'
const ORANGE = '#e08a2e'
const SAFFRON = '#f08a24'

const n = (v) => Math.round(v * 10) / 10

// A disc of halftone dots on a 45 degree grid. Dot size follows a lit sphere:
// light from the upper left, so the dots are largest at the lower right.
function halftoneDisc(cx, cy, R, cell, ink) {
  const light = [-0.5, -0.6, 0.62]
  const len = Math.hypot(...light)
  const l = light.map((v) => v / len)
  let d = ''
  const rows = Math.ceil((R * 2) / cell) + 2
  for (let j = -rows; j <= rows; j++) {
    for (let i = -rows; i <= rows; i++) {
      // The grid turned 45 degrees: neighbours are `cell` apart, so a dot of
      // radius cell / 2 just touches the next and none overlap.
      const x = ((i - j) * cell) / Math.SQRT2
      const y = ((i + j) * cell) / Math.SQRT2
      const nx = x / R
      const ny = y / R
      const rr = nx * nx + ny * ny
      if (rr > 0.97) continue
      const nz = Math.sqrt(1 - rr)
      const lit = Math.max(0, nx * l[0] + ny * l[1] + nz * l[2])
      const r = cell * 0.5 * Math.pow(1 - lit, 0.85)
      if (r < 0.7) continue
      const px = cx + x
      const py = cy + y
      d += `M${n(px - r)} ${n(py)}a${n(r)} ${n(r)} 0 1 0 ${n(2 * r)} 0a${n(r)} ${n(r)} 0 1 0 ${n(-2 * r)} 0`
    }
  }
  return `<path d="${d}" fill="${ink}" />`
}

// A starburst: alternate outer and inner radii, the outer ones uneven so it reads
// as torn paper rather than a stamp.
function starburst(cx, cy, outer, inner, rot) {
  const pts = []
  const k = outer.length
  for (let i = 0; i < k * 2; i++) {
    const a = rot + (i * Math.PI) / k
    const r = i % 2 === 0 ? outer[(i / 2) | 0] : inner
    pts.push(`${n(cx + r * Math.cos(a))},${n(cy + r * Math.sin(a))}`)
  }
  return pts.join(' ')
}

function gear(cx, cy, ro, ri, teeth, rot) {
  const pts = []
  for (let i = 0; i < teeth * 4; i++) {
    const a = rot + (i * Math.PI * 2) / (teeth * 4)
    const r = i % 4 < 2 ? ro : ri
    pts.push(`${n(cx + r * Math.cos(a))},${n(cy + r * Math.sin(a))}`)
  }
  return pts.join(' ')
}

// The rupee sign as a stroke, centred on 0,0 and about 64 high, so no font is
// needed to draw it: two bars, a bowl, and the leg.
const RUPEE = 'M-20 -28H0a19 19 0 0 1 0 38H-20L6 36M-20 -10H22M-20 -28H22'

// The lotus petals of the app's mark (components/BrandMark.jsx), drawn pointing
// up and rotated around 60 46.
const CARDINAL = 'M60 2C74 16 78 32 60 48C42 32 46 16 60 2Z'
const DIAGONAL = 'M60 48C38 40 40 10 60 10C80 10 82 40 60 48Z'

function lotus(cx, cy, s) {
  const petals = []
  for (const a of [45, 135, 225, 315]) {
    petals.push(`<path d="${DIAGONAL}" transform="rotate(${a} 60 46)" fill="${CREAM_SHADE}" />`)
  }
  for (const a of [0, 90, 180, 270]) {
    petals.push(`<path d="${CARDINAL}" transform="rotate(${a} 60 46)" fill="${CREAM}" />`)
  }
  return `<g transform="translate(${cx} ${cy}) scale(${s}) translate(-60 -46)" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round">${petals.join('')}<circle cx="60" cy="46" r="13" fill="${GOLD}" stroke="${GOLD_EDGE}" stroke-width="1.8" /><path d="${RUPEE}" transform="translate(60 46) scale(0.17)" fill="none" stroke="${GOLD_EDGE}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" /></g>`
}

function note(cx, cy, w, h, rot, fill) {
  const x = -w / 2
  const y = -h / 2
  return `<g transform="translate(${cx} ${cy}) rotate(${rot})">
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="${fill}" stroke="${LEAF}" stroke-width="5" />
    <rect x="${x + 14}" y="${y + 14}" width="${w - 28}" height="${h - 28}" rx="7" fill="none" stroke="${LEAF}" stroke-width="2.5" stroke-dasharray="3 7" />
    <circle cx="0" cy="0" r="${h * 0.3}" fill="${CREAM}" stroke="${LEAF}" stroke-width="6" />
    <path d="${RUPEE}" transform="scale(${h / 230})" fill="none" stroke="${LEAF}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" />
    <circle cx="${x + 34}" cy="${y + 34}" r="9" fill="${LEAF}" />
    <circle cx="${-x - 34}" cy="${-y - 34}" r="9" fill="${LEAF}" />
  </g>`
}

function coinStack(cx, baseY, count) {
  const rx = 70
  const ry = 22
  const t = 16
  let s = ''
  for (let i = 0; i < count; i++) {
    const y = baseY - i * t
    s += `<path d="M${cx - rx} ${y}v${-t}a${rx} ${ry} 0 0 1 ${2 * rx} 0v${t}a${rx} ${ry} 0 0 1 ${-2 * rx} 0Z" fill="${GOLD}" stroke="${GOLD_EDGE}" stroke-width="3" stroke-linejoin="round" />`
    s += `<ellipse cx="${cx}" cy="${y - t}" rx="${rx}" ry="${ry}" fill="#f9d864" stroke="${GOLD_EDGE}" stroke-width="3" />`
  }
  const topY = baseY - (count - 1) * t - t
  s += `<ellipse cx="${cx}" cy="${topY}" rx="${rx - 14}" ry="${ry - 5}" fill="none" stroke="${GOLD_EDGE}" stroke-width="2" />`
  s += `<path d="${RUPEE}" transform="translate(${cx} ${topY}) scale(0.34 0.16)" fill="none" stroke="${GOLD_EDGE}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" />`
  return s
}

function globe(cx, cy, r) {
  const lines = []
  for (const f of [0.28, 0.58, 0.88]) {
    lines.push(`<ellipse cx="${cx}" cy="${cy}" rx="${n(r * f)}" ry="${r}" />`)
  }
  for (const f of [-0.6, -0.2, 0.2, 0.6]) {
    const y = cy + r * f
    const half = Math.sqrt(r * r - (r * f) ** 2)
    lines.push(`<path d="M${n(cx - half)} ${n(y)}Q${cx} ${n(y + r * f * 0.22)} ${n(cx + half)} ${n(y)}" />`)
  }
  return `<g fill="none" stroke="${CREAM}" stroke-width="3.2"><circle cx="${cx}" cy="${cy}" r="${r}" />${lines.join('')}</g>`
}

function cross(cx, cy, s) {
  const d = `M${cx - s} ${cy - s}L${cx + s} ${cy + s}M${cx + s} ${cy - s}L${cx - s} ${cy + s}`
  return `<path d="${d}" stroke="${INK}" stroke-width="15" stroke-linecap="round" fill="none" /><path d="${d}" stroke="${CREAM}" stroke-width="8" stroke-linecap="round" fill="none" />`
}

const parts = []
parts.push(`<rect width="${W}" height="${H}" fill="${GROUND}" />`)

// Two halftone discs sit furthest back.
parts.push(halftoneDisc(150, 175, 150, 10, INK))
parts.push(halftoneDisc(1070, 110, 125, 10, INK))
// A thin ring gives each sphere its edge where the lit side has no dots.
parts.push(`<g fill="none" stroke="${CREAM}" stroke-width="2.5" opacity="0.7"><circle cx="150" cy="175" r="150" /><circle cx="1070" cy="110" r="125" /></g>`)

// The globe, cut by the bottom-left corner.
parts.push(globe(120, 600, 150))

// The starburst, the bulb, and the dashed arcs round them.
parts.push(`<polygon points="${starburst(600, 285, [235, 200, 250, 205, 230, 260, 210, 235, 195, 245, 220, 205], 118, -0.3)}" fill="${CREAM}" />`)
parts.push(`<g fill="none" stroke="${CREAM}" stroke-width="3" stroke-dasharray="7 9" stroke-linecap="round"><path d="M310 150Q340 40 450 30" /><path d="M820 210Q900 190 930 120" /></g>`)
parts.push(`<polygon points="${gear(880, 70, 44, 33, 8, 0.2)}" fill="${CREAM}" /><circle cx="880" cy="70" r="13" fill="${GROUND}" />`)
parts.push(`<polygon points="${gear(950, 42, 33, 25, 8, 0.45)}" fill="${GOLD}" /><circle cx="950" cy="42" r="10" fill="${GROUND}" />`)

// The bulb.
parts.push(`<path d="M565 332C565 345 575 352 575 366H625C625 352 635 345 635 332Z" fill="${CREAM_SHADE}" stroke="${INK}" stroke-width="3" stroke-linejoin="round" />`)
parts.push(`<rect x="574" y="366" width="52" height="38" rx="9" fill="${CREAM_SHADE}" stroke="${INK}" stroke-width="3" />`)
parts.push(`<path d="M578 380H622M578 392H622" stroke="${INK}" stroke-width="3" stroke-linecap="round" />`)
parts.push(`<circle cx="600" cy="262" r="88" fill="${GOLD}" stroke="${GOLD_EDGE}" stroke-width="4" />`)
parts.push(`<path d="M548 238A58 58 0 0 1 585 190" fill="none" stroke="#fff6d6" stroke-width="7" stroke-linecap="round" />`)
parts.push(`<path d="M586 338V306Q588.3 290 590.7 306T595.3 306T600 306T604.7 306T609.3 306T614 306V338" fill="none" stroke="${ORANGE}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />`)

// The lotus rises from the bottom edge.
parts.push(lotus(600, 560, 2.1))

// Money on the right, a stack of coins on the left.
parts.push(note(985, 440, 380, 196, -10, CREAM_SHADE))
parts.push(note(960, 420, 380, 196, 6, CREAM))
parts.push(`<g stroke="${CREAM}" stroke-width="3" stroke-linecap="round"><path d="M1130 520l56 -10M1138 546l50 -10M1146 572l42 -8" /></g>`)
parts.push(coinStack(262, 530, 5))
parts.push(`<g fill="${SAFFRON}"><circle cx="410" cy="505" r="9" /><circle cx="1148" cy="300" r="7" /></g>`)

// The crosses.
parts.push(cross(735, 585, 26))
parts.push(cross(1115, 600, 22))

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <!-- Generated by tools/make-hero-backdrop.mjs; edit that, not this. -->
${parts.join('\n')}
</svg>
`

if (process.argv.includes('--check')) {
  // A Windows checkout with core.autocrlf=true turns the file's LF into CRLF: not a difference.
  const have = existsSync(OUT) ? readFileSync(OUT, 'utf8').replace(/\r\n/g, '\n') : null
  if (have !== svg) {
    console.error(`${OUT} differs from what the script draws`)
    process.exitCode = 1
  } else {
    console.log('hero-backdrop.svg matches the script')
    process.exitCode = 0
  }
} else {
  writeFileSync(OUT, svg)
  console.log(`wrote ${OUT}, ${svg.length} bytes`)
  process.exitCode = 0
}
