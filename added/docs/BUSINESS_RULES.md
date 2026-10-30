# Business rules: the formulas, the matching and the data notes

The reference for whoever edits `backend/app/services/` or the data files. (It is about this app's own rules. The hackathon's rules are in `docs/HACKATHON.md` section 9.1.) `CLAUDE.md` keeps the traps as a short list; this file keeps the full rules and the sources they rest on. Where it disagrees with the code or the tests, they win and this file is wrong. The counts in it were measured on 29 Oct 2026 and are not maintained: measure again before you quote one.

## Formulas (all deterministic, all unit-tested)

**Profit and investment**

- `monthly_profit = revenue − monthly_expenses`. Margin is `None` when revenue is 0 (not 0%), and the same holds for `operating_margin_percent`.
- `funding_gap = max(initial_investment − available_capital, 0)`.
- `estimated_roi_percent = operating_surplus × 12 / investment × 100`, or `None` when investment is 0.

**Repayment pressure**

- `pressure_ratio = total_monthly_emi / monthly_surplus × 100`, where `total_monthly_emi = monthly_emi + estimated_new_emi`.
- `estimated_new_emi` prices the funding gap as a loan at an assumed **12% a year over 60 months** (annuity). The pages say it is an assumption (`ch.pressureIncludesNew`).
- Bands: **under 30 low, 30–50 moderate, over 50 high**, classified on the *rounded* figure. A surplus ≤ 0 gives `high` with a `None` ratio.
- **`existing_debt` is excluded**: it is the principal of the loan `monthly_emi` already repays.

**Loan options** (`options_service.py`, the `financing_options` key; it has no rule of its own)

- For each tenure of 12, 24, 36 and 60 months: the largest loan towards the funding gap (whole thousands, or the whole gap) that `calculate_repayment_pressure` still calls `low` and that keeps the household check off `over_limit`, at the same assumed 12% a year. A tenure that allows no loan is left out.
- `recommended_by_rules` is the shortest tenure that covers the whole gap, else `None`. `status` is `covered`, `partial`, `no_gap`, `no_surplus`, `household_over_limit` or `no_room`. It is a calculation at an assumed rate, never a quote.
- Each option carries `schedule` (`schedule_service.amortization_schedule`: integer paise, the instalment is rounded to a whole rupee and the last payment clears the remainder, so `total_repayment` ≠ `monthly_repayment × tenure`) and `dscr` (`monthly_profit ÷ total_monthly_emi`: the pressure ratio the other way up, `None` when no EMI is paid, no lender cut-off cited). `/report` draws the table and `/advisory` prints the totals with `formatExact` (two decimals; same sign rule as the four formatters).

**Scheme funding** (`structuring_service.py`, the `scheme_funding` key: arithmetic on three small tables that each cite their source)

- Priced for PMEGP, PMFME and Mudra only, and only when the matcher found them (Stand-Up India's margin figures conflict: a status sentence, no sum). `project_cost` is `initial_investment`; own money is a share of the **whole** cost; `net_loan_amount` = cost − own − subsidy. PMEGP prices `general` and `special` both (the app never asks the person's category), caps the subsidy base at ₹20 lakh for everyone, and gives a place that is neither `rural` nor `urban` the urban rates with `area_assumed`. Mudra has no subsidy: `band` follows the funding gap. The rates and their sources are in `docs/frontend_integration.md` and `docs/HACKATHON.md` §2.2.
- `terms` (`kvic_2022`, `mofpi_2021`, `dfs_2026`) selects the caveats `SchemeFunding.jsx` prints. Never say a scheme is open. No eligibility rule is evaluated and the repayment is not tested against the household, so a net loan can exceed the loan-options cards: the card says "estimate, not an offer".
- `SchemeFunding.jsx` draws only what the backend sent and leaves out a scheme with no name in `scheme_matches` or a band it has no words for. `drive.mjs` checks it on `/advisory` and `/report`.

**Compliance** (`compliance_service.py`, the `compliance` key: `{yearly_sales, steps}`; no request field, so no `SENT_FIELDS` or notice change)

- Four steps in this order: `udyam`, `local`, `fssai`, `gst`. `need` is `free`, `ask`, `usually`, `depends` or `not_needed`, never "required". `yearly_sales` is `expected_monthly_revenue × 12`, the person's own figure.
- FSSAI: sales up to ₹12 lakh (and 100 kg or litres a day, 500 litres of milk) is a registration, above it a licence; "usually", because the source says "and/or". GST: goods ₹40 lakh (₹20 lakh in 10 States), services ₹20 lakh (₹10 lakh in 4); exactly the limit is `within`; both or neither word is `mixed`, which gives `between` and "ask". The sources and their dates are in `DATA_SOURCES.md`; the limits are as published in 2017 and 2019 and **not checked against later amendments**.
- Not stated, because no source was read: fees, a farmer's own produce (only "can be treated differently"), goods between States, online sales, Udyam for farming alone. The food, goods and services lookups are whole-word tables of our own, never `CATEGORY_SYNONYMS`. `Compliance.jsx` draws only what the backend sent; `drive.mjs` checks it with its own copy of the mapping and a pass for a result stored without the key.

**Household check** (RBI Master Direction on microfinance loans, 2022, paras 5.1–5.3 and 3.1; Annex I)

- `household_repayment_percent = total_monthly_emi / household_monthly_income × 100`.
- Over 50 is `over_limit`; exactly 50 is `within_limit`. A `None` income gives `not_checked`. An income of 0 gives `over_limit` if any EMI is paid.
- `household_in_microfinance_range` = income × 12 ≤ ₹3,00,000 (`None` when there is no income).
- It is computed before the surplus early return.
- **Never call a result RBI-compliant, and never say a lender will lend** (`ch.householdEstimate`). Above ₹3 lakh a year, `ch.householdRbiNotCovered` applies.
- **Who counts as the household for an unmarried adult is our own reading of RBI**, and nobody has checked it.

**Summary, next step and advice**

- **Status chain** (`mvp_service`): profitability first, then risk moderate or high, then household `over_limit`, then a funding gap on a profitable, feasible plan (`sum.needsFunding`), then `review`.
- `good` requires profitable, feasible, low risk, no gap and a household check that is not `over_limit`. `band` reads status and priority as a light: green is `good`, red is priority `high`, yellow is the rest. `ResultBand` only draws it (shape, word and colour, with the earlier mark as the fallback for a result stored before it existed). The rule is the owner's own, confirmed 29 Oct 2026.
- **Next step:** not profitable, then risk high (`nxt.gapTooLarge` when only the gap loan tips it over), then household (`nxt.householdNewLoanOver` / `nxt.householdOverLimit`).
- **Advice:** `adv.maintainExpand` and `adv.healthyMargin` are withheld while there is a funding gap or the household check is `over_limit`. `not_checked` adds no advice.
- `POST /api/advisory/recommend` prices no gap loan, so it can disagree with the unified endpoint.

**Scheme matching**

- **Score:** +60 for a category match, then +40 if the scheme names the reader's state or +30 if it is nationwide. Only 90 and 100 can occur, and **the score checks no eligibility rule, so it is never printed as a percentage.**
- Cards print `fit_basis` through `fitLabel()`:
  - `state`, when the scheme's `states` list is only the reader's state: "Made for your state";
  - `region`, when the list names several states including the reader's: "For a few states, including yours";
  - `national`, when the list is `ALL`: "For all of India".

  `drive.mjs` fails on a `90%` or `100%` on a card. Don't bring the percentage back anywhere.
- **Availability gates come before scoring:** `serves_state` and `serves_location` filter on `states` and `location_types`. **An empty user value means "do not filter".** Don't merge the two functions.
- **Sort** by `(-match_score, level_rank, name)`. `LEVEL_ORDER` in `backendText.js` mirrors `LEVEL_RANK`.
- **Category matching** is **`if scheme_category in phrase`**: the scheme's word must be a substring of the user's phrase. `CATEGORY_SYNONYMS` bridges wording only and must never widen eligibility (`dairy → poultry` exists so the Livestock button reaches NLM); the map is walked once, not recursively. A scheme must never claim `livestock` or `other` as a category (there is a test), and plain `agriculture` maps to nothing.

**Market context**

- The lookup takes the reader's own district's `scope:"district"` rows first, then that state's `scope:"state"` rows (as `match_level:"state"`), then `[]`. **Another district's row is never returned.** Don't widen the fallback; grow `tools/market-crosswalk.json` and fetch again.
- **All 291 rows are `scope:"district"`, for 31 districts in 15 states** (measured 29 Oct 2026): Lucknow and Varanasi (UP, fetched 24 Sept), 11 added on 27 Oct and 18 on 29 Oct (the names are in `DATA_SOURCES.md`). Agriculture gets up to 3 mandi prices per district (the median over the last 30 reporting days, with a P10–P90 range): 74 price rows, 26 districts with one, none for Guntur, Dhubri, East Singhbhum, Ranchi and South 24 Parganas (`DATA_SOURCES.md` says why). 9 price rows (Kanpur Dehat, Kanpur Nagar, Pratapgarh) are `stale`; Kanpur Nagar uses Agmarknet's "Kanpur", our reading, unconfirmed. **Lucknow's and Varanasi's prices (last reported 19–23 Sept) show no warning, because `stale` is decided at fetch time: refetch before a demo.** The other 7 category buttons get one Udyam count each (217 rows; Lucknow tailoring: 5,826 of 249,493), suppressed under 10. Every other district shows the empty state, except for eggs (next).
- **Egg prices** (`necc_egg_prices.json`, merged in by `load_market_data()`): 30 rows for the Poultry / Eggs button from the daily sheet of the National Egg Co-ordination Committee (NECC), 16 states, fetched 28 Oct 2026. 29 are `scope:"district"`; Delhi's is the one `scope:"state"` row. NECC is not under GODL: it agreed by e-mail (keep the owner's contact details out of the repo). Each row carries the first three sentences of NECC's clarification, the pages print them once, and `drawableMarketRows` (`marketRows.js`) refuses to draw an egg row without them. **The unit is our reading** (whole numbers, no unit; 640 is taken as 640 paise an egg, ₹6.40) and unconfirmed, so the page prints NECC's number beside it. The `Average` column is never read. 4 of 34 centres are skipped on purpose (`tools/necc-crosswalk.json`). A price goes stale in 8 days: refetch before a demo. `plan_service` sends Meta no egg row.

## The scheme dataset

**30 schemes across 7 tiers.** `LEVEL_RANK` runs from 0 to 6: `central`, `state`, `regional`, `district`, `sub_district`, `block`, `local_body`.

- **`location_types`:** 25 schemes are `ALL`. Four are `["rural"]`: Vibrant Villages, RSETI, the BDO/NRLM desk and the Gram Panchayat licence. PM SVANidhi is `["semi-urban","urban"]`.
- `/schemes` groups cards by tier with `lvl.*` and `lvlnote.*` headings. `/analysis` and `/report` show flat lists with a `sch.runBy` badge.
- **Field-name trap:** the file key is `business_categories`, and `_scheme_index()` renames it to `categories`, stored as an ordered tuple because the matcher does a substring test. `target_segment` exists on every scheme and nothing reads it.
- **To change the dataset, edit `SPEC`, `LOCATION_TYPES` or `CHECK_FIRST` in `gen_schemes.py` and run it from `./backend`.** Hand edits to `schemes.json` fail `test_gen_schemes.py`. New codes need all 8 `schemeStrings.js` entries added by hand; keycheck reports any that are missing.
- **"Check these first" (`CHECK_FIRST` in `gen_schemes.py`, `check_first_codes` and `check_first` on each scheme).** The form asks for twelve answers and none is an age, a sex, a community, a trade or a membership, so nothing in the app can say whether a scheme fits a person. 25 of the 30 schemes (41 lines in all) instead name the few of their own eligibility lines that decide it, and `/schemes` and `/report` print them above the closed list under "Check these first", with "This scheme might not fit you if one of these is not true for you. We cannot check them for you." A line goes in when it says who may apply, what kind of unit is covered or whether the scheme is running at all. It stays out when a gate already cut the list by it (the states, `location_types`) or when it only says what the scheme pays, charges or asks you to bring. The five that name nobody in particular (PMMY, DIC, the tehsil certificates, BLBC and the Gram Panchayat licence) have no entry. **The lines are picked by code, never by position**, because `eligibility_codes` and `eligibility_rules` are index-aligned and an inserted line would move a position onto the wrong sentence; `scheme_service._check_first` looks each code up, and the generator stops on an unknown scheme id or on a code the scheme does not carry or names twice. They are the scheme's own sentences, so they carry the same translation codes and need no key of their own. **Nothing is evaluated** (`sc.eligUnchecked` still holds): say "might not fit", never "not eligible", never a percentage, never a tick.
- **`last_verified`:** `EXISTING_VERIFIED` in `gen_schemes.py` puts PMFME, PMEGP, PMMY and Stand-Up India at 2026-10-28 (their official pages were read again for the funding card) and every other scheme at 2026-09-07. `reviewDates.js` prints the earliest and latest in the footer, and `test_review_dates.py` keeps them equal.
- **No single input reaches all 7 tiers; the maximum is 6.** States with their own scheme and states reached by a regional scheme do not overlap.
- **Demo-safe input:** tailoring, handicrafts or food processing in UP / Lucknow gives 14, 14 and 18 schemes across 6 tiers, both UP fit labels (so the chart renders) and a district market row. Agriculture gives 11 schemes plus 3 mandi prices; poultry gives 15, all national (no fit chart) plus the NECC egg price.

## Known limits

What the rules above do not do, and what the data cannot back. The full lists are `README.md` (What this doesn't do), `docs/HACKATHON.md` §8 and `docs/PROCESSOR_SCHEDULE.md` §9.

**Advice and data:** a household income of 0 needs a tick and then gives "do not take a new loan"; the household income is self-reported; the pressure figure errs high when another earner pays their own loan; **no eligibility rule is evaluated anywhere** (`sc.eligUnchecked` says so on the page, and the "Check these first" lines only name the conditions, since the form collects no age, sex or community); `stale` is decided at fetch time; the Udyam counts cannot be reproduced; the egg-price unit is unconfirmed and NECC's permission is an e-mail (`DATA_SOURCES.md`); the scheme rules have no re-check schedule (the footer date and `test_review_dates.py` are the only guard); the funding card rests on three pages with a gap each and does not test affordability, and the registrations card's limits are the 2017 and 2019 figures, not checked against later amendments (`docs/HACKATHON.md` §8); there is no helpline number.
