# अर्थNiti: what was built during the Meta Global AI Developer Hackathon

अर्थNiti gives a rural micro-entrepreneur (a tailor, an egg seller) a plain-language read on their business, in one of eight languages. Does it make money? How risky is the loan repayment? Which government schemes cover their kind of work where they live? Which registrations should they ask about? And a printable report.

Every figure and every line of advice comes from hand-written rules in Python. Meta's models are used in two optional places: to turn a spoken or typed description into form answers that the person checks before anything is used, and to word a short plan that has blanks where the rules' own figures go.

Entry: Meta Global AI Developer Hackathon, Indie Track. Built by Aryan Verma, alone.
Demo video: _link added when submitted_

## What is in this repository

Only the work done during the event, from its start on Mon 26 Oct 2026, 12:00 PM ET:

- `added/`: the files the event created, in full;
- `patches/`: one patch for each earlier file the event changed;
- `pack.json`: the lists of both, the files the event deleted, and the fingerprint of the finished app.

That is 51 new files, 83 patches and 3 deletions. The earlier code and its git history are not here. `assemble.mjs` puts the app together from this repository and the earlier one (next section) and checks the result against the author's own tree.

The patches carry no surrounding lines of earlier code, only the lines the event added and the lines it replaced, and the replaced lines show up as removed lines. Two patches are larger than the work behind them. `patches/LICENSE.patch` swaps the earlier proprietary licence for the MIT licence. `patches/CLAUDE.md.patch` mostly deletes older text, and `added/docs/BUSINESS_RULES.md` is that older text moved out of `CLAUDE.md` (the formulas and dataset notes), not new content.

This layout follows the reply the author received in the hackathon's Discord on 30 Oct 2026 to a question about entering a project that began before the event: it can be eligible if the submitted repository is a fresh public one, created on 26 Oct or later, that holds only work done during the event, and the earlier code stays in a separate repository that the README names and explains.

## The earlier repository

| | |
|---|---|
| Repository | https://github.com/BU1lDR/ArthNiti (public; the rebuild needs it to stay public) |
| Pinned commit | `e4708306cab10c53d54ef651dc61d1ca093cd5e6`, titled "chore: the project as it stood at the hackathon start" |
| Used how | `assemble.mjs` downloads that one commit and builds on it. Nothing in this repository changes the earlier repository |

What the pinned commit holds:

- **The product, built from 30 Aug 2026 to the morning of 26 Oct, before the event.** Financial, risk and business analysis, a 30-scheme dataset in 7 tiers, 20 market rows for Lucknow and Varanasi, the eight-language interface, the form and result pages, and the consent and notice work for India's DPDP Act. 867 tests in 38 test files at 8:03 AM ET on 26 Oct. It began as a six-person team's entry for a college round of the Smart India Hackathon; `DATA_SOURCES.md` credits the team.
- **The first version of the Meta helper, written on the morning of 26 Oct.** The Meta client, the intake service and route, their settings, the smoke script and about 540 tests were written between 10:22 and 11:58 AM ET, in the two hours before the start, and nothing had been run against Meta's live API. This README counts them as earlier work because the line is the 12:00 PM ET start, even though it is the same day. 1,411 tests in 45 files at the start.

The earlier repository's `main` goes on past the pinned commit: it also holds the first 11 of the 24 commits that this repository replays, published there before this repository existed. The patches here are against the pinned commit, not against that `main`.

The pinned commit is a reconstruction, not a saved snapshot. A full copy of the working tree was taken at 8:03 AM ET on 26 Oct; every edit made through the editor tools between then and 12:00 PM ET was replayed from the session transcript, a file last written before 12:00 PM ET is taken as it is on disk, and the few shell-script edits are accounted for by hand. As a check, replaying the 205 editor calls made after the start on top of it reproduces 26 of the 28 files they touched byte for byte; the other two are new files that shell commands changed afterwards. The reconstructed tree passes its own suite (the 1,411 tests). Section 2 of `app/docs/HACKATHON.md` has the detail.

## Rebuild the app

You need Git, Node (it has been run on 24) and a network connection to download the one commit. Then:

```bash
node assemble.mjs        # builds the app into ./app
```

It checks that `added/` and `patches/` hold exactly the files `pack.json` lists, applies the patches, copies the new files in, deletes the three the event removed, and compares the git tree hash of the result with the one in `pack.json`. That hash covers every byte of every file, so one changed character anywhere in the app, or in a patch, makes it fail.

| Exit | Meaning |
|---|---|
| 0 | rebuilt, and identical to the author's tree |
| 1 | rebuilt, but not identical (a wrong base, or a file altered after it was made). The folder is kept so you can look |
| 2 | could not run |

`--base <url or path>` takes the earlier repository from somewhere else, for example a local clone: `node assemble.mjs --base ../ArthNiti`. The script refuses to write into a folder that already holds files.

## Run it

The rebuilt app has its own README at `app/README.md`. The short version, from inside `app/`, needs Python 3.10 or newer (the author runs 3.14) and Node 24:

```bash
python -m venv .venv
.venv/Scripts/python.exe -m pip install -r backend/requirements-dev.txt    # macOS or Linux: .venv/bin/python
cd frontend && npm install && cd ..

# terminal 1
cd backend && ../.venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
# terminal 2
cd frontend && npm run dev
```

Open http://localhost:5173 (not 127.0.0.1). No key is needed. The Meta helper is off by default, and with it off there is no model call anywhere in the app. A two-minute path for a reviewer, with the figures to expect, is in `app/docs/HACKATHON.md` section 11.

Checks that need neither a server nor a key, from `app/`:

```bash
cd backend
../.venv/Scripts/python.exe -m pytest tests -q                           # 2,189 tests, measured on 30 Oct 2026
../.venv/Scripts/python.exe -m pytest tests/test_model_boundary.py -q    # no rule module can reach a model
cd ..
node tools/parity4.mjs && node tools/keycheck.mjs                        # the eight-language dictionaries
```

`.github/workflows/ci.yml` rebuilds the app and runs the backend tests on Python 3.10 and 3.14, lint, the production build, the dictionary checks and the five Node test files that need no server. The browser checks in `tools/verify/` drive a local Edge and are not in it. The Actions tab, not this file, shows whether the latest commit passed.

## What the event added

Dates are the dates of the author's commits, in India Standard Time (UTC+5:30), copied unchanged onto the 24 commits that replay them here. The author committed in batches after the work was done, so a date says when a commit was made, not when each line was written, and this repository was made after all of them. Nothing is dated before the event.

| Committed | What |
|---|---|
| Tue 27 Oct | **Cost control for the Meta calls:** a spend ledger that charges a call at its worst-case price before it is sent and refuses it once the total would pass a cap, and a guard that fails any test that reaches the network or writes the real ledger. **`/talk`:** consent, record or type, edit the transcript, find the answers, check each answer beside the words it came from, then use them; a browser recorder (16 kHz mono WAV); the answer mapping; stored-state version 5 (which fields the helper filled, and a banner on each form page that received an answer). **API efficiency:** a prompt-cache key, speech keywords, token-usage reading |
| Wed 28 Oct | **The written plan:** `POST /api/advisor/plan`, where Muse Spark words a plan around blanks and code refuses any reply that carries a figure of its own; stored-state version 6 (a plan is kept only while the request it was written for is current). **Loan options** for 12, 24, 36 and 60 months, **repayment schedules**, **scheme funding** (PMEGP, PMFME, Mudra), a **registrations** card (Udyam, the local office, FSSAI, GST) and **egg prices** from the National Egg Co-ordination Committee. Market data for 11 more districts. `smoke_meta --plan`, two real plan calls under the cap |
| Thu 29 Oct | The MIT licence. A green, yellow or red **light** on the result pages. A **Simple or Detailed** switch, opening on Simple. A generated SVG backdrop in place of a photo with no recorded source. A fix for the progress label at 320 px. Market data for 18 more districts, 291 rows for 31 districts in all. A Hindi review sheet and a two-minute reviewer path |
| Fri 30 Oct | A **Listen** button on the result pages that reads the verdict aloud through a voice on the device. The hackathon's rules and judging stages, and a video plan that labels new work apart from old. `CLAUDE.md` trimmed, its formulas moved to `docs/BUSINESS_RULES.md`. The organisers' reply about entering with earlier work recorded in the docs, with the plan for this repository (`docs/HACKATHON.md` section 9.3) and the video's opening line |

Backend tests went from 1,411 at the start to 2,189 in 58 files on 30 Oct 2026. File-level detail is in `app/docs/HACKATHON.md` section 2.2, which lists each addition and where it lives.

## How Meta's models are used

Paths are inside the rebuilt `app/`.

| Model | Call | Used for | Where |
|---|---|---|---|
| Muse Voice Transcribe 1.0 | `POST /v1/asr/transcribe`, a WAV recorded in the browser, with a keyword list | up to 60 seconds of speech to text on `/talk` | `backend/app/core/meta_client.py` (`transcribe`), `backend/app/services/intake_service.py` (`SPEECH_KEYWORDS`), `frontend/src/audio/record.js`, `frontend/src/pages/TalkPage.jsx` |
| Muse Spark 1.3 | `POST /v1/chat/completions`, JSON-schema output, low reasoning effort | proposes form answers from the transcript. Each answer must carry the person's own words, and code drops any whose words are not in the transcript | `backend/app/services/intake_service.py` (`validate_extraction`), `frontend/src/data/talkAnswers.js` |
| Muse Spark 1.3 | the same call with a second schema | writes a short plan in the reader's language around `{{blanks}}`. It is shown no figure, name or place name, only the kind of business and place, the rules' verdict words and advice sentences, and the kind and level of each matched scheme. Code refuses a reply with a digit in any script, a number word, a link, an abbreviation, the wrong script or an unknown blank, and asks once more. An accepted plan has its blanks filled with the rules' own figures; otherwise no plan is shown | `backend/app/services/plan_service.py` (`verify_plan`), `backend/app/api/routes/advisor.py`, `backend/app/schemas/plan.py` |

The first two rows run on a client and an intake service first written on the morning of 26 Oct, which are in the earlier repository. The event changed both (see `patches/backend/app/core/meta_client.py.patch` and `patches/backend/app/services/intake_service.py.patch`) and added everything around them: the spend ledger, the recorder, the page, the answer mapping, the keyword list and the token-usage reading. The written plan is entirely new.

**A model never computes a figure, a risk band, a scheme match or the advice.** `backend/tests/test_model_boundary.py` pins it in the imports: a module under `services/`, other than the helper's two, can import neither the Meta client, those two services, nor anything that opens a connection. The name for what it does is "AI-assisted intake" and "AI-written, rule-verified plan", not AI-driven advice.

**The spend stays inside the free credits.** Every Meta call is charged to a ledger first (`backend/app/core/spend.py`) and refused once the total would pass `ARTHNITI_AI_SPEND_CAP_USD` (default $10, at most $100). The ledger fails closed, counts this app's own calls only, and resets if its file is deleted, so it complements Meta's own Billing page and does not replace it. Models whose names end in `-contributor`, which let Meta train on the content, are refused at startup.

**What the live service has shown.** On 27 Oct 2026 the author ran `python -m app.smoke_meta` (three real calls: two chat, one speech) and then `--plan` (two plan calls) with a real key. The key is valid, and the settings used were accepted: JSON-schema output, low reasoning effort, the cache key and the plan's 8,000-token cap. Both plans (English, Hindi) passed every check on the first try, in 10.6 and 11.9 seconds, at about 1.1 and 1.2 US cents each at Meta's listed prices. The ledger booked $0.0451 for the first run and $0.0797 for the plan run, because it prices the worst case.

**Not yet seen live (as of 30 Oct 2026):** what the speech keywords do to real speech (the speech call has only been tried on one second of silence), any real person's speech, `/talk` and the plan card talking to the real service in a browser (the browser gate uses a fake model: 24 scenarios, 460 checks), and Meta's Billing balance. Meta's Usage page showed ₹0.00 after the first run and has not been looked at since.

## What it does not do

- It evaluates no scheme's eligibility rules. It checks the kind of work and the place, and the page says so.
- Loan options, scheme funding and registrations are estimates, never a quote or an offer. The FSSAI and GST limits are the 2017 and 2019 figures, not checked against later changes.
- The egg price is NECC's number, which NECC prints with no unit. Reading it as paise per egg is ours, and NECC has not confirmed it.
- No native speaker has checked any non-English wording. It is machine-written, and two real mistakes have already been found by eye.
- The three model routes have no sign-in, no per-person limit and no server-side record of consent. The spend cap and an hourly limit bound the cost, and nothing bounds who calls them.
- The Listen button has only been run against a fake speech engine. It uses a voice on the device and is not drawn if there is none, which is the case on the author's Windows Edge.
- No database and no sign-in (`/login` asks for a name and nothing else). The answers live in the browser's `sessionStorage` for the tab, and the backend stores none of them.

`app/README.md` ("What this doesn't do") and `app/docs/HACKATHON.md` section 8 have the full lists.

## Licence and data

The code, the scheme data and the wording that this repository adds are released under the MIT licence ([LICENSE](LICENSE)), copyright 2026 Aryan Verma. Three things keep their own terms:

- **Market rows from data.gov.in** are used under the Government Open Data Licence – India. Each row carries the attribution that licence asks for, and the pages print it.
- **The egg prices** (`added/backend/app/data/necc_egg_prices.json`) are used with the National Egg Co-ordination Committee's agreement, given by e-mail. That is not a licence, and this repository cannot pass it on: ask NECC before reusing them.
- **The dependencies** keep their own licences.

The landing page's backdrop is drawn by `added/tools/make-hero-backdrop.mjs`, so the MIT licence covers it. The photo it replaced had no recorded source. The rebuild deletes it from the app, and it remains in the earlier repository's git history (from commit `c92f907`), where the licence makes no promise about it.

Nothing here is financial, legal or eligibility advice.

## Who built it

Aryan Verma, alone, from 26 Oct 2026. The six people who built the earlier version are credited in `DATA_SOURCES.md` ("People") in the earlier repository.

`maintainer/` holds the two scripts that produced this repository from the author's working copy of the full project. `make-pack.mjs` writes `added/`, `patches/` and `pack.json` and replays the commits. `verify-states.mjs` rebuilds the app at every commit of this repository and compares each with the author's tree for the matching commit; all 24 replay commits matched on 30 Oct 2026. Both need the author's working copy, so only the author can run them. `assemble.mjs` needs only what is published.
