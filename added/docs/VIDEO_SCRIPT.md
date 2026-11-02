# The 3-minute video: script and steps

Written for the owner, who records the video. Written on 2 Nov 2026, after the code freeze, from the build that is submitted. It replaces the "Say" lines of [HACKATHON.md](HACKATHON.md) section 10.3. The shot list and its times (10.3), what the screen should show (10.4), the organisers' rules (10.8) and your direction for the video (10.9) stay there. If a button or a figure on the page differs from this file, the page is right: fix the line here, not the page.

**Three passes**, because 10.1 step 8 says to record the screen first and add the voice afterwards:

1. **Screen pass.** Do the DO steps. The only thing you say aloud is the Hindi sentence of shot 2. Take A is shots 1 to 6, then 8 and 9, in one run. Take B is shot 7 (the egg price), recorded last, because it changes the business and so clears the result and the plan.
2. **Voice pass.** Play the finished screen cut and read the SAY lines over it, in English, in your own voice. No synthetic voice anywhere (10.9).
3. **Edit pass.** The corner labels, captions and "sped up" marks of section 3. All text is yours, nothing covers a figure or a label. The corner label reads "NEW, built 26 Oct to 4 Nov" while a feature from the event is on screen and "FROM BEFORE THE EVENT" while a page from before it is (10.3); where this file says NEW it means the first.

**Words you never say** (10.5): "AI-driven advice", "compliant", "secure", "anonymous", "eligible", "approved", "guaranteed", "the bank will lend", "voice-only", "bank-ready". Say "AI-assisted intake" and "an AI-written, rule-verified plan". Never say the engine was built this week. Do not say a word about the Listen button and do not press it: the optional Listen beat of 10.1 step 9 would put the device's synthetic voice in the video, which 10.9 (the later decision) rules out.

## 0. Before you record

1. **Free the ports.** Stop your own backend and Vite (Ctrl+C in both). Check with curl, not `netstat` (on 2 Nov `netstat` showed both ports free while both were running):
   `curl -s -m 3 -o /dev/null -w '%{http_code}' http://127.0.0.1:8000/health` and the same for `http://localhost:5173/` must both print `000`.
2. **Backend, helper on**, in your own Git Bash, key typed and never saved:
   ```bash
   cd backend
   read -rs MODEL_API_KEY; export MODEL_API_KEY
   export ARTHNITI_AI_ENABLED=true
   ../.venv/Scripts/python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --no-server-header --no-access-log
   ```
3. **Frontend, helper on**, second terminal: `cd frontend && VITE_AI_HELPER=true npm run dev`.
4. **Browser:** a fresh private Edge window at `http://localhost:5173`, 100% zoom, normal text size, light theme, notifications off, as big a window as the screen allows (the bigger it is, the less you scroll). Allow the microphone once so that no permission box is in the video: tick the consent box, press the microphone, click Allow, press Cancel (nothing is sent), then reload the tab.
5. **Sound off.** Mute the computer's sound before you tick the consent box: with a voice on the device (Windows' Hemant, once the two Hindi voices are installed) the page reads its question aloud by itself after the tick, and no synthetic voice may be in the video. 10.3 shot 2 says "keep the sound in the take or mute it"; this file picks mute, because 10.9 came later. Record the screen and your microphone, not "system sound". Do not press the Listen button.
6. **Throwaway pass of shots 1 to 3** with your real microphone, as a test of the room and of the review screen. It spends a few cents of the free credits. Reload the page after it.
7. **The terminal clip (optional, for 10.8's "live calls visible").** The backend prints one JSON line per request, with the path, the status and `duration_ms`, and no answer. Scroll that terminal so no earlier command is in view (`read -rs` echoes nothing, so the key is not on screen). After take A, film 3 s of the lines for `/api/intake/transcribe`, `/api/intake/extract` and `/api/advisor/plan`. Do not film Meta's Usage page: it shows your account.
8. **Time your reading.** Read every SAY line once aloud with a stopwatch. At 150 words a minute the lines below take 2:10 in all. Where a shot runs over its time, apply the trim printed under it. The judges stop at 3:00.

## 1. The Hindi sentence (shot 2)

Say it in your own words, about 25 to 30 seconds. Say amounts in words ("डेढ़ लाख", not digits). Do not say your name, a phone number or a bank detail (the page asks you not to). The longer you speak, the longer the two waits after you: 36 seconds of speech waited 16 to 18 seconds on 2 Nov, which is why this one is kept short. The suggested wording:

> मैं उत्तर प्रदेश में लखनऊ के एक गाँव में सिलाई की दुकान शुरू करना चाहता हूँ। मुझे दो लाख रुपये चाहिए और मेरे पास डेढ़ लाख रुपये हैं। मुझे हर महीने तीस हज़ार रुपये की कमाई की उम्मीद है। दुकान चलाने का खर्च हर महीने पंद्रह हज़ार रुपये होगा, और मेरे परिवार का कुल खर्च हर महीने अठारह हज़ार रुपये है। मेरे घर की कुल कमाई हर महीने पच्चीस हज़ार रुपये है। मुझ पर कोई कर्ज़ नहीं है और मैं कोई ईएमआई नहीं देता।

The English caption for it, shown as three subtitles while you speak (the figures are in digits and a lakh is glossed once, because the judges may not know the word, and "EMI" is written as what it is, 10.10): *I want to start a tailoring shop in a village in Lucknow district, Uttar Pradesh. I need two lakh rupees (₹2,00,000) and I have ₹1,50,000. I expect to earn ₹30,000 a month.* / *The shop will cost ₹15,000 a month to run, and my family spends ₹18,000 a month in all.* / *My household earns ₹25,000 a month. I have no loan, so no monthly loan payment.*

Cover all twelve things, or the page asks the missing ones one at a time instead of opening the form (10.6): the work (tailoring); Uttar Pradesh; Lucknow; a village; ₹2,00,000 needed; ₹1,50,000 held; ₹30,000 coming in a month; ₹15,000 a month to run the shop; ₹18,000 a month spent in all; ₹25,000 household income; ₹0 existing loan; ₹0 EMI. Keep the two costs apart: the shop's running cost (15,000) and the family's total spending (18,000) are different questions, and the model can swap them.

## 2. The shots

Each time is the budget for the finished cut (10.3), waits taken out. `[3 s]` in a DO step is how long to stay still before the next step. Hindi button names come first where the page is in Hindi, with the English in brackets.

### Shot 1. 0:00 to 0:12. The home page. Label: NEW

**Screen:** `/`, the voice home, in Hindi: the big microphone, the question under it, the consent box lower down.

**Do**
1. Start the screen recording on the page as it opens. Stay still. [2 s]
2. Click the 🌐 language list in the top bar. It shows the eight languages. [2 s] Press Esc: the language stays Hindi.
3. Rest the cursor near the microphone. [until 0:12]

**Say** (verbatim, the organisers asked for it, 9.1): *Before this week: a rules engine, a form, and a first Meta intake service. This week: a voice page, a written plan, and loan, funding and registration cards.*

**Caption:** the same sentence as text from 0:00. From about 0:08: *Meta Global AI Developer Hackathon, Indie Track*.

### Shot 2. 0:12 to 0:58. Speak. Label: NEW

**Screen:** the same page, then the page working.

**Do**
1. Scroll down to "शुरू करने से पहले" ("Before you start"). Tick "मैं सहमत हूँ कि इस पन्ने पर मैं जो बोलूँ या लिखूँ, वह Meta की चलाई AI सेवा को भेजा जाए।" (If the box is already in view, do not scroll.) Cut the scroll in the edit.
2. Scroll back up so the microphone and the question are in view.
3. Click the microphone, "बोलना शुरू करें" ("Start speaking"). The ring around it moves with your voice and a clock runs. [1 s]
4. Say the Hindi sentence of section 1, live. This is the one stretch with no voice-over. It is not sped up.
5. [1 s] Click the microphone again, "रोकें" ("Stop").
6. Touch nothing. The page shows "आपकी आवाज़ को शब्दों में बदला जा रहा है…" ("Turning your voice into words…"), then "आपके जवाब ढूँढ़े जा रहे हैं…" ("Looking for your answers…"). Stay on it until "जो मिला, उसे जाँचें" ("Check what we found") opens. This wait is the part you speed up.

**Say** over steps 1 to 3: *The borrower taps the microphone and says it in Hindi.* Say over the wait of step 6: *Muse Voice Transcribe writes down their words. Then Muse Spark looks for the form answers inside those words, and is told to report only what was clearly said.*

**Caption:** the three English subtitles of section 1 while you speak, tagged *live*. Over the wait: *sped up 1.5x*.

**If it goes wrong** (10.6 has the rest):
- *A "busy" message or "not available":* wait a minute, then press the microphone and say the sentence again.
- *A page that asks a question instead of opening the form:* the sentence left something out. Say the sentence again with it in.
- *A swapped amount* (seen in shot 3): take shots 2 and 3 again.
- *The microphone cannot be made to work:* 10.6 says to type the sentence in the box and press "Find my answers", but the voice home has no box. The box is on `/talk`, the second button under the microphone, "बोलकर या लिखकर जवाब भरें" ("Speak or type your answers"). If you have to use it, the first Say line becomes *The borrower can say it, or type it, in Hindi.* Never narrate speaking over a typed take.

### Shot 3. 0:58 to 1:12. Check what we found. Label: NEW

**Screen:** "जो मिला, उसे जाँचें" with the answers, each ticked, each with "आपने कहा: “…”" ("You said: “…”") under it.

**Do**
1. Before you keep this take, read every row. All twelve must be right, and the two costs must not be swapped. If one is wrong or missing, reload the page and take shots 2 and 3 again.
2. Scroll slowly from the first answer to the last so that each "You said" line is readable. [about 9 s] The words in the quotes are the transcriber's, so a Latin word inside the Hindi, or a doubled word, is normal and not a fault.
3. Click "ये जवाब इस्तेमाल करें →" ("Use these answers"). [2 s]

**Say:** *Every answer is shown with their own words beside it. Code drops any answer whose words are not in the transcript. Nothing enters the form until they press Use these answers.*

**Caption (optional, pointing at a quote):** *their own words, in Hindi*.

### Shot 4. 1:12 to 1:24. The form, then the check. Label: FROM BEFORE THE EVENT, except the banner

**Screen:** the four form steps, in Hindi, then in English. Cut all the typing: the two names stay in the browser and are never sent.

**Do**
1. Step 1, "आइए आपको जानें" ("Let us get to know you"): click the name box, type `Sunita`. Click "अपने काम की जानकारी दें" ("Continue to my business").
2. Step 2: the banner "आपकी बात से भरे गए" ("Filled in from what you said") lists the answers to check. [3 s] Click "आपके काम का नाम क्या है?" ("What is your business called?"), type `Sunita Tailors`. Click "अपने इलाके की जानकारी दें" ("Continue to my area").
3. Step 3: click "पैसों की जानकारी दें" ("Continue to finance").
4. Step 4: click the 🌐 language list and choose English. The answers stay. Scroll to the bottom, tick "I have read the note above. I agree to send these answers to … to work out my result." [2 s] Click "Check my business".

**Say:** *The form is filled in, and still editable. They add their name, and tick the consent box. From here, no model touches the numbers.*

**Caption:** *Rules engine: prior work, Sept 2026*. **Label:** NEW while the banner is on screen (the first sentence), FROM BEFORE THE EVENT after it.

### Shot 5. 1:24 to 1:36. The result: the light and the switch. Label: NEW, then FROM BEFORE

**Screen:** `/analysis` in English, which opens on "Simple".

**Do**
1. Stay at the top, on the light, "Yellow: something to check before you go ahead", and the sentences under it. Do not scroll. [4 s]
2. Click "Detailed" in "How much to show". The page grows below; stay at the top. It stays on Detailed for the advice page. [4 s]
3. Stay still, no scrolling. [4 s]

The "Listen" button and its line may be in the frame under the sentences. Leave them: do not press it, do not mention it.

**Say:** *A traffic light, set by the rules, not a model. A switch shows more only if they want it. The engine under it is from before the event.*

**Label:** NEW for the first two sentences, FROM BEFORE THE EVENT for the third. Nothing else on this page is narrated: its figures ("Loan pressure 9.27%", the market, the scheme chart) are from before the event (9.1).

**Trim if the cut is over:** none, this shot is short.

### Shot 6. 1:36 to 2:03. The new cards. Label: NEW

**Screen:** `/advisory`, on Detailed.

**Do**
1. Click "Advice" in the top bar (it is the page the "See advice" button opens).
2. Scroll past the top of the page (do not dwell on it: the light says to check something and the headline says the plan is workable, and both are true; 10.4 says why) to "How much you could borrow". Stop with the 24-month card, "Covers it all and is paid off soonest", in view. [8 s]
3. Scroll to "What you put in and what a scheme gives" and stop on the Mudra and PMEGP cards. [9 s]
4. Scroll to "Registrations and licences to check". [8 s]

**Say:** *New in this hackathon, and again only rules. How much they could borrow, and keep payments safe. What they put in, and what a government loan scheme like PMEGP or Mudra adds, from its published terms: an estimate, not an offer. And which business, food and tax registrations to ask about, each with its source and date. Eligibility is not checked, and the page says so.*

**Trim if the cut is over, in this order:** "and keep payments safe"; "each with its source and date"; "like PMEGP or Mudra".

### Shot 7. 2:03 to 2:13. Egg prices. Label: NEW (record this take last)

**Screen:** `/analysis`, Detailed, the egg price for Lucknow with NECC's own note and our reading of its unit under it.

**Do** (after take A is finished and kept)
1. Click "Your business" in the top bar. Change "What kind of work is it?" from "Tailoring / Garments" to "Poultry / Eggs". Click "Continue to my area", then "Continue to finance". Tick the consent box. Click "Check my business". Everything else is as before (Uttar Pradesh, Lucknow, the same figures). Cut all of this.
2. On `/analysis`, on Detailed, scroll to the egg price in the local-market section. [6 s]
3. Read the figure off the screen. The narration does not say it. A callout may show it, and only exactly as the page prints it (₹6.77 an egg at the 2 Nov fetch).

**Say:** *Where a published price exists, it is used. This is the egg price NECC lists for Lucknow, with NECC's own note beside it.*

**If it does not show** (an egg row is dropped after 8 days without a fetch), drop this shot: its 10 seconds become room (10.3).

### Shot 8. 2:13 to 2:35. The written plan. Label: NEW

**Screen:** `/advisory`, on Detailed, from take A (not the egg take).

**Do**
1. Scroll down past the loan-offer card ("What does a loan offer cost?"). No shot uses it. Cut the scroll. Stop at "Your short written plan".
2. Tick "I agree that this short description is sent to an AI service run by Meta." [1 s] Click "Write my plan".
3. Wait: "Writing your plan. This can take a minute or two. Please wait." About 13 to 16 s on 2 Nov. This is the second part you speed up.
4. **Read the plan before you keep the take.** The checks refuse a digit, a link, the wrong script and an unknown blank, and they cannot read meaning. Of four real plans on 2 Nov, two had a wording problem (one told the reader to save the whole monthly surplus for home needs, one dropped "each month"). Press "Write it again in English" (about 14 s, a few cents) and keep the second plan if the first: has a figure that reads as one lump sum instead of per month; tells the person to set aside money they do not have; says or implies approval, eligibility, a guaranteed loan or that a bank will lend; or contradicts the page (says the business makes a loss). A message "A plan could not be written this time" is a refusal, not a bug: press the button again.
5. With the plan on screen, move the cursor over "Written by an AI. The figures and names in bold come from the fixed rules." [3 s]
6. Click "How this plan was checked" to open it. [3 s]

**Say:** *The second use of Muse Spark is writing a plan in their language. It is never given an amount, a name or a place name. It writes blanks, and the app fills them from the rules. If the model writes a digit, a link or the wrong script, the code refuses the plan.*

**Caption:** over the wait, *sped up 2x*.

**Trim if the cut is over:** "in their language".

### Shot 9. 2:35 to 2:50. The report, then the close. Label: NEW

**Screen:** `/report`, the schedule "Month-by-month payments".

**Do**
1. Scroll below the plan card and click "Make my report".
2. Scroll down the report to "Month-by-month payments", about 3,800 px down a page of about 16,700 px. Cut the scroll. Stop with the heading about a third of the way down the frame, because the sticky bar at the top covers the first 70 px. The 24-month table is the one that opens ("A loan of ₹50,000 paid back in 24 months. Each row is one month."), with its first rows under the sentence "Your money left each month is 5.1 times your monthly loan payments…". [3 s]
3. Stay on the schedule for the close, so the label NEW stays true. [12 s]

**Say** at step 2: *Every payment, month by month, is in the report.* At step 3: *Models do the language. Rules do the money. Built for lenders and field staff. The translations are machine-written, not yet reviewed by native speakers.*

**Captions:** *New in the hackathon: voice page · written plan · loan options and schedule · funding card · registrations card · traffic light · Simple or Detailed view · egg prices · market rows for 29 more districts*. Then: *No model in the rules: tests fail if any rules module imports the model client.* After the last word, cut to black before 3:00.

## 3. The edit sheet

| Cut | Time | Corner label | Captions and marks |
|---|---|---|---|
| Shot 1 | 0:00 to 0:12 | NEW | the opening sentence; from 0:08 the event name |
| Shot 2, speaking | 0:12 to 0:43 | NEW | the three English subtitles, *live* |
| Shot 2, the wait | to 0:58 | NEW | *sped up 1.5x* (optional: *two live Meta calls*) |
| Shot 3 | to 1:12 | NEW | optional: *their own words, in Hindi* |
| Shot 4 | to 1:24 | NEW for the banner, then FROM BEFORE THE EVENT | *Rules engine: prior work, Sept 2026* |
| Shot 5 | to 1:36 | NEW, then FROM BEFORE THE EVENT for the third sentence | optional: *No model here. Just if and else.* |
| Shot 6 | to 2:03 | NEW | optional: *estimates, not offers* |
| Shot 7 | to 2:13 | NEW | the figure as the page prints it |
| Shot 8 | to 2:35 | NEW | *sped up 2x* over the wait |
| Shot 9 | to 2:50 | NEW | the two closing captions, then black |

- The corner label is on for the whole video and is never cropped or covered.
- A "sped up" mark stays on for the whole sped-up stretch. Do not cut a wait out (10.8).
- Optional beats are text only, made by you, six words or fewer, and never over a figure or a label. No real person's face in a meme, template or clip (10.9, limit 2). A clip, a picture or a sound effect needs a source you can name and a licence you hold, written down (limit 3): leave it out otherwise. A cash-register sound over a loan figure would read as "approved": no. A beat that needs time is paid for by cutting words, shot 6 first, never footage (limit 6).
- The opening line comes first. No cold open, no gag before it (10.9, limit 1).
- The terminal clip, if you made it (section 0, step 7), goes in as a 3-second cut-in right after the wait of shot 2 or of shot 8, and only if the cut is under 2:50.
- Export 1080p, MP4, 3:00 or less. Check the length on the finished file, then follow 10.1 steps 10 and 11 before and after the upload.

## 4. What this script says, and where it is backed

| Said or captioned | Backed by |
|---|---|
| "told to report only what was clearly said" | the extraction prompt in `backend/app/services/intake_service.py` ("Report only what they clearly said") |
| "Code drops any answer whose words are not in the transcript" | `validate_extraction` in the same file |
| "never given an amount, a name or a place name" | the plan card's own text (`plan.sendsText`) and `plan_service.py`; `test_advisor_log_privacy.py` |
| "refuses a digit, a link or the wrong script" | `verify_plan` in `plan_service.py` |
| "Muse Voice Transcribe", "Muse Spark" | the defaults in `backend/app/core/settings.py`: `muse-voice-transcribe-1.0`, `muse-spark-1.3` (unless the owner's environment sets `ARTHNITI_AI_MODEL` or the speech model) |
| "tests fail if any rules module imports the model client" | `tests/test_model_boundary.py`, 25 tests (measured 2 Nov 2026); it reads imports, so it does not prove a number never depends on a model |
| "market rows for 29 more districts" | HACKATHON.md section 2.2: 31 districts now, 2 before the event |
| "Built for lenders and field staff"; "not yet reviewed by native speakers" | CLAUDE.md, the owner's decisions; no non-English wording has been reviewed |
