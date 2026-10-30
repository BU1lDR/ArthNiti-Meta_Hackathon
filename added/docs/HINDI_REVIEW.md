# Hindi wording to read

**Status: two rows read, the rest not yet read.** Written 29 Oct 2026 for the author, who reads Hindi, to check the Hindi on the screens the video shows. On 31 Oct 2026 the author read rows 230 and 231 and left them as they are; no other row has been reported as read. Once the whole sheet has been read, this line will say who read it and when. That will mean “read by one Hindi reader”, not “reviewed by a native speaker of Hindi”, and it must not be described as more than that. The other seven languages have not been read by anyone.

## What is here

230 strings: every Hindi string that a page prints on its own in shots 1 to 4 of the video, plus the helper page's other messages (they appear only after a recording or an error) the eleven result-page strings added this week (the traffic light, the Simple/Detailed switch and the Listen button) the eleven strings of the questions that the helper page now asks one at a time, and the two strings of the “Check these first” block on the scheme page. Row 56 was removed because its words are no longer on the page; the other row numbers did not change. They were found by opening each of those pages in a real browser, in Hindi, and matching what is printed to the dictionary. A string that the code uses but the video never shows is not here, and neither is a short word that only occurs inside a longer sentence. The language, state and district menus are data and are not in the dictionary: the state names are at the end of this sheet, and the districts are Latin-script names on purpose.

## How to answer

- Read the **Hindi** column against the **English** column. Leave **Fix** empty when the Hindi is right.
- When it is wrong or odd, write the wording you want in **Fix**, or send the row number and the wording. Either works.
- Look for: a wrong or unnatural word; a tone that would confuse someone who reads little; English left in; a sentence that says more or less than the English; a number or a `{name}` that moved or went missing.
- Do not change `{names}` in curly brackets (the page fills them in), the product name `अर्थNiti`, or the digits (they stay 0 to 9 in every language).
- Rows marked **(notice)** are part of the privacy note, which is versioned. Write the fix as usual; the version and its hash are bumped with it.
- Where a row says **same Hindi as** other rows, those rows print the same words, so a fix to one belongs in all of them.
- Whatever is not marked stays as it is. Nothing here changes by itself.

## Look at these first

What stood out on a first read. These are suspicions, not corrections: the reader decides, and the rest of the sheet is still to be read.

| Rows | What stood out |
|---|---|
| 6 | “गहरा रंग” (deep colour) for “Dark mode” reads as a colour name, not as the setting. |
| 42 | “गहरी जानकारी” (deep information) for “Advanced information”. |
| 121, 138 | “उम्मीद की कमाई” is awkward for “expected income”. “अनुमानित कमाई” is one option. |
| 107 | “मन से बनाए हुए आँकड़े” (figures made up from the mind) is an odd way to say “made-up figures”. “काल्पनिक आँकड़े” is another option. |
| 60 | Says “नतीजा” for the result; every other page says “परिणाम”. The end, “जैसे तब जब आप जवाब खुद लिखते हैं”, is clumsy. |
| 59, 60, 61, 189, 190, 199, 202 | “Meta”, “AI” and “EMI” are in Latin letters, while ब्लॉक, फ़ॉर्म and ब्राउज़र are in Devanagari. Keep it so, or write मेटा, एआई, ईएमआई? Also, “Meta की चलाई एक AI सेवा” is clumsy. |
| 181, 182 | The formal words “नियोजित निवेश” (planned investment) and “कुल ज़रूरी निवेश”, while step 2 asks “आपको कितने पैसों की ज़रूरत है?”. Plainer words may suit people who read little. |
| 103, 120, 163 | The English buttons say “Continue to my business / my area / finance”. The Hindi ones tell the person to give the information about their work, area and money. Intended? |
| 214, 215 | The note puts the button name into the sentence: “…सब देखने के लिए विस्तार से दबाएँ।” It reads like “press in detail”. |
| 38, 46, 50, 66, 67, 99, 113, 118, 148 | Spelling is not uniform. Dotted letters appear in ज़िला, ज़रूरी, फ़ॉर्म, क़र्ज़, ख़ाली and आख़िरी, but not in खर्च, खुद, गलत, खरीदते and सफर. “कौन सी” (profile.language, landing.schemes.text) and “कौन-सी” (landing.f3.text, business.subtitle) both appear. So do आंकड़े (landing.f1.text) and आँकड़े (seven other rows), and ढूँढ (location.subtitle) and ढूँढ़ (talk.find and four more). The loan word is क़र्ज़ in the nine rows here that use it, but कर्ज़ in 69 strings on pages this sheet does not cover. One rule for each can be applied everywhere. |
| 218 | “कुछ भी कहीं नहीं भेजता” (sends nothing anywhere) stacks negatives. “कुछ भी बाहर नहीं भेजता” is a plainer option. Does “इस डिवाइस की अपनी आवाज़” say that the voice lives on the device? |
| 220, 223, 224 | “सवाल {n} / {total}” reads like a fraction rather than “Question 1 of 12”. “नहीं, फिर से बोलना है” literally says “no, (I) have to speak again”. “फ़ॉर्म से भरें” says “fill it from the form” for “Use the form instead”. |
| 108, 205 | Not a Hindi question. The English says “the team running this demonstration”, and one person runs it. This is part of the versioned notice, so a change bumps the version. |
| 231 | “लागू न हो” (does not apply) for “is not true for you” is a formal word. “आपके लिए सही न हो” is a plainer option. |

## Found while collecting (not a wording question)

Nine example texts in the empty boxes are written straight into the pages and are English in every language: `e.g. Rahul General Store`, `e.g. Khera`, `e.g. Local families` and six `e.g. 100000`-style amounts (`BusinessPage.jsx`, `LocationPage.jsx`, `FinancePage.jsx`). They are the only English on the Hindi form steps apart from the brand and the menus. They are not in the table below because they are not in the dictionary.

## On every page: top bar, menu bar, footer

Around every page in every shot: the language, text-size and theme controls, the masthead, the menu bar and the footer. (26 strings)

| # | Key | English | Hindi | Fix |
|---|---|---|---|---|
| 1 | common.appTagline | Business advice for small rural businesses | छोटे ग्रामीण व्यवसायों के लिए सलाह | |
| 2 | common.disclaimer | This advice is indicative. Always check eligibility and rules with the official government authority. | यह सलाह केवल संकेत के लिए है। पात्रता और नियम हमेशा सरकारी विभाग से जाँच लें। | |
| 3 | common.helpTitle | Where to get help | मदद कहाँ मिलेगी | |
| 4 | common.helpText | Your District Industries Centre or block office can tell you which schemes are open to you and how to apply. | आपका ज़िला उद्योग केंद्र या ब्लॉक दफ़्तर बता सकता है कि आप किन योजनाओं के लिए आवेदन कर सकते हैं और आवेदन कैसे करें। | |
| 5 | common.schemesChecked | Scheme rules were checked between {from} and {to}. | योजनाओं के नियम {from} से {to} के बीच जाँचे गए। | |
| 6 | common.darkMode | Dark mode | गहरा रंग | |
| 7 | common.skipToMain | Skip to main content | मुख्य सामग्री पर जाएँ | |
| 8 | common.dialect | Dialect | बोली | |
| 9 | common.login | Log in | लॉग इन | |
| 10 | common.chooseLanguage | Choose your language | अपनी भाषा चुनें | |
| 11 | nav.home | Home | होम | |
| 12 | nav.profile | About you | आपके बारे में | |
| 13 | nav.business | Your business | आपका काम | |
| 14 | nav.location<br>same Hindi as 22, 26 | Your area | आपका इलाका | |
| 15 | nav.finance<br>same Hindi as 21, 23, 25 | Your money | आपका पैसा | |
| 16 | nav.analysis | Analysis | विश्लेषण | |
| 17 | nav.schemes | Schemes | योजनाएँ | |
| 18 | nav.advisory | Advice | सलाह | |
| 19 | nav.report | Report | रिपोर्ट | |
| 20 | nav.journey | Your business journey | आपके व्यवसाय का सफर | |
| 21 | landing.money.title<br>same Hindi as 15, 23, 25 | Your money | आपका पैसा | |
| 22 | location.eyebrow<br>same Hindi as 14, 26 | Your local area | आपका इलाका | |
| 23 | finance.eyebrow<br>same Hindi as 15, 21, 25 | Your money | आपका पैसा | |
| 24 | common.privacy **(notice)** | Privacy notice | गोपनीयता सूचना | |
| 25 | an.moneyHeading<br>same Hindi as 15, 21, 23 | Your money | आपका पैसा | |
| 26 | lvl.regional<br>same Hindi as 14, 22 | Your region | आपका इलाका | |

## Shot 1: the first page

Shot 1 (HACKATHON.md section 10.3): the first page, before the language is changed. (29 strings)

| # | Key | English | Hindi | Fix |
|---|---|---|---|---|
| 27 | greeting.hello | Welcome | नमस्ते | |
| 28 | landing.title | Start your business journey with confidence. | भरोसे के साथ अपना काम शुरू करें। | |
| 29 | landing.subtitle | Tell us about yourself and your business. We will turn your information into simple financial guidance, useful schemes, hyper local insights, and clear next steps. | अपने और अपने काम के बारे में बताइए। हम आपकी जानकारी को आसान वित्तीय सलाह, काम की योजनाओं, आपके इलाके की जानकारी और साफ़ अगले कदमों में बदल देंगे। | |
| 30 | landing.cta | Start my journey | मेरा सफर शुरू करें | |
| 31 | landing.chip1 | Simple language | आसान भाषा | |
| 32 | landing.chip2 | Local context | स्थानीय जानकारी | |
| 33 | landing.chip3 | Scheme matching | योजना मिलान | |
| 34 | landing.miniLead | A simple view | एक आसान नज़र | |
| 35 | landing.miniTitle | Know what to do next. | जानिए आगे क्या करना है। | |
| 36 | landing.money.text | See profit, funding need and repayment process. | मुनाफ़ा, ज़रूरी पैसा और क़र्ज़ चुकाने की प्रक्रिया देखें। | |
| 37 | landing.schemes.title | Useful schemes | काम की योजनाएँ | |
| 38 | landing.schemes.text | See which government schemes cover your kind of work and your state. | देखें कि कौन सी सरकारी योजनाएँ आपके काम और आपके राज्य के लिए हैं। | |
| 39 | landing.next.title | Your next steps | आपके अगले कदम | |
| 40 | landing.next.text | Get practical advice based on your situation. | अपनी स्थिति के हिसाब से व्यावहारिक सलाह पाएँ। | |
| 41 | landing.detailTitle | Need more detail? | और जानकारी चाहिए? | |
| 42 | landing.detailText | Advanced information stays available whenever you want it. | गहरी जानकारी जब चाहें तब उपलब्ध रहती है। | |
| 43 | landing.offerEyebrow | What we offer | हम क्या देते हैं | |
| 44 | landing.offerTitle | From idea to action. | सोच से काम तक। | |
| 45 | landing.f1.title | Hyper local insights | आपके इलाके की जानकारी | |
| 46 | landing.f1.text | Government figures for your district where we have them: wholesale mandi prices, and how many businesses have registered work like yours. | जहाँ हमारे पास हैं, वहाँ आपके ज़िले के सरकारी आंकड़े: मंडी के थोक दाम, और आपके जैसा काम कितने कारोबारों ने दर्ज कराया है। | |
| 47 | landing.f2.title | Financial clarity | पैसों की साफ़ तस्वीर | |
| 48 | landing.f2.text | Understand whether the business looks sustainable and where money is going. | समझें कि काम टिकाऊ लगता है या नहीं और पैसा कहाँ जा रहा है। | |
| 49 | landing.f3.title | Government support | सरकारी सहायता | |
| 50 | landing.f3.text | See which schemes cover your kind of work and your state, and why each one is listed. | देखें कि कौन-सी योजनाएँ आपके काम और आपके राज्य पर लागू होती हैं, और हर योजना सूची में क्यों है। | |
| 51 | man.badge | How this works | यह कैसे चलता है | |
| 52 | man.title | A short guide to using this service | इस सेवा को इस्तेमाल करने की छोटी गाइड | |
| 53 | man.lead | Eight simple screens. You answer four sets of questions, then you get four sets of answers. | आठ आसान पन्ने। पहले आप चार हिस्सों के सवाल भरते हैं, फिर आपको चार हिस्सों में जवाब मिलते हैं। | |
| 54 | man.open | Read the guide | गाइड पढ़ें | |
| 55 | talk.title | Speak or type your answers | बोलकर या लिखकर जवाब भरें | |

## Shot 2: the speak-or-type page, before and after the consent tick

Shot 2: the page where the person speaks or types. The microphone and the model are not needed to see these. (11 strings)

| # | Key | English | Hindi | Fix |
|---|---|---|---|---|
| 57 | talk.subtitle | Tell us in a few sentences what your business is, how much money you need and where you live. We find your answers in what you said, and you check each one before it goes into the form. | कुछ वाक्यों में बताइए कि आपका काम क्या है, आपको कितने पैसे चाहिए और आप कहाँ रहते हैं। हम आपकी बात से जवाब ढूँढ़ते हैं, और फ़ॉर्म में जाने से पहले हर जवाब आप खुद जाँचते हैं। | |
| 58 | talk.sendsTitle | Before you start | शुरू करने से पहले | |
| 59 | talk.sendsText | Your voice and your words are sent to an AI service run by Meta. It writes your words down and finds your answers in them. We do not save them. Meta handles them under its own rules. If this service is running on free credits, Meta may also use them to improve its products. Please do not say your name, phone number or bank details. | आपकी आवाज़ और आपके शब्द Meta की चलाई एक AI सेवा को भेजे जाते हैं। वह आपके शब्द लिखती है और उनमें से आपके जवाब ढूँढ़ती है। हम इन्हें सहेजकर नहीं रखते। Meta इन्हें अपने नियमों के अनुसार संभालती है। अगर यह सेवा मुफ़्त क्रेडिट पर चल रही है, तो Meta इन्हें अपने उत्पाद बेहतर बनाने में भी इस्तेमाल कर सकती है। कृपया अपना नाम, फ़ोन नंबर या बैंक की जानकारी न बोलें। | |
| 60 | talk.rulesNote | The AI only listens and finds your answers. The result, the schemes and the advice are still worked out by fixed rules, the same as when you type your answers. | AI सिर्फ़ सुनती है और आपके जवाब ढूँढ़ती है। नतीजा, योजनाएँ और सलाह पहले की तरह तय नियमों से ही निकलते हैं, जैसे तब जब आप जवाब खुद लिखते हैं। | |
| 61 | talk.consent | I agree that what I say or type on this page is sent to an AI service run by Meta. | मैं सहमत हूँ कि इस पन्ने पर मैं जो बोलूँ या लिखूँ, वह Meta की चलाई AI सेवा को भेजा जाए। | |
| 62 | talk.speakTitle | Say it or type it | बोलिए या लिखिए | |
| 63 | talk.langLabel | Which language will you use? | आप किस भाषा में बताएँगे? | |
| 64 | talk.record | Start speaking | बोलना शुरू करें | |
| 65 | talk.textLabel | What you said or typed | आपने जो कहा या लिखा | |
| 66 | talk.textHint | You can type here instead of speaking. If a word was heard wrongly, fix it here before you continue. | बोलने की जगह आप यहाँ लिख भी सकते हैं। अगर कोई शब्द गलत सुना गया हो, तो आगे बढ़ने से पहले उसे यहीं ठीक कर लें। | |
| 67 | talk.find | Find my answers | मेरे जवाब ढूँढ़ें | |

## Shot 3 and the helper's other states: recording, the review list, messages

Shot 3, and the rest of that page: the recording buttons, the list of answers to check, and every message. They appear only after a recording or a server answer, so they were not on the page when it was read; they are listed whole. (24 strings)

| # | Key | English | Hindi | Fix |
|---|---|---|---|---|
| 68 | talk.consentRequired | Please tick the box to agree before you continue. | आगे बढ़ने से पहले कृपया सहमति वाले बॉक्स पर निशान लगाएँ। | |
| 69 | talk.langNoSpeech | Speaking is not available in {language} yet. You can type instead. | {language} में बोलना अभी उपलब्ध नहीं है। आप इसकी जगह लिख सकते हैं। | |
| 70 | talk.stop | Stop | रोकें | |
| 71 | talk.cancel | Cancel | रद्द करें | |
| 72 | talk.recording | Recording. Speak now, then press {stop}. | रिकॉर्डिंग चल रही है। अब बोलिए, फिर {stop} दबाइए। | |
| 73 | talk.listening | Turning your voice into words… | आपकी आवाज़ को शब्दों में बदला जा रहा है… | |
| 74 | talk.finding | Looking for your answers… | आपके जवाब ढूँढ़े जा रहे हैं… | |
| 75 | talk.tooLong | This is too long. Please keep it to {max} letters or fewer. | यह बहुत लंबा है। कृपया इसे {max} अक्षरों या उससे कम में रखें। | |
| 76 | talk.reviewTitle | Check what we found | जो मिला, उसे जाँचें | |
| 77 | talk.reviewHelp | Tick the answers you want to use. Nothing goes into the form until you press the button below. | जो जवाब इस्तेमाल करने हों उन पर निशान लगाएँ। नीचे का बटन दबाने तक फ़ॉर्म में कुछ नहीं बदलता। | |
| 78 | talk.said | You said: “{quote}” | आपने कहा: “{quote}” | |
| 79 | talk.notUsed | Not used: this is not one of the choices in the form. | इस्तेमाल नहीं किया गया: यह फ़ॉर्म के विकल्पों में से नहीं है। | |
| 80 | talk.ignored | {n} more answers could not be used and were left out. | {n} और जवाब इस्तेमाल नहीं हो सके, इसलिए छोड़ दिए गए। | |
| 81 | talk.noneFound | We could not find any answers in this. Try saying what work you do, how much money you need, what you earn and spend each month, and where you live. | इसमें हमें कोई जवाब नहीं मिला। बताइए कि आप कौन-सा काम करते हैं, आपको कितने पैसे चाहिए, हर महीने कितना कमाते और खर्च करते हैं, और कहाँ रहते हैं। | |
| 82 | talk.apply | Use these answers | ये जवाब इस्तेमाल करें | |
| 83 | talk.applyNote | Your name and your business name are not filled in: you type those yourself. You can change every answer on the next pages. | आपका नाम और काम का नाम नहीं भरा गया है: वे आप खुद लिखें। अगले पन्नों पर आप हर जवाब बदल सकते हैं। | |
| 84 | talk.errMicDenied | The microphone is blocked. Allow it for this page in your browser, or type instead. | माइक्रोफ़ोन बंद है। अपने ब्राउज़र में इस पन्ने के लिए उसे चालू करें, या उसकी जगह लिखें। | |
| 85 | talk.errMicNone | No microphone could be used here. You can type instead. | यहाँ कोई माइक्रोफ़ोन इस्तेमाल नहीं हो सका। आप इसकी जगह लिख सकते हैं। | |
| 86 | talk.errSilence | We could not hear any words. Please speak close to the microphone, or type instead. | कोई शब्द सुनाई नहीं दिया। कृपया माइक्रोफ़ोन के पास बोलें, या लिखें। | |
| 87 | talk.errUnavailable | The helper is not available right now. You can type your answers in the form instead. | सहायक अभी उपलब्ध नहीं है। आप अपने जवाब सीधे फ़ॉर्म में लिख सकते हैं। | |
| 88 | talk.errBusy | The helper is busy. Please wait a minute and try again, or type your answers in the form. | सहायक अभी व्यस्त है। कृपया एक मिनट रुककर फिर कोशिश करें, या अपने जवाब फ़ॉर्म में लिखें। | |
| 89 | talk.errUnclear | The helper could not understand this. Please try again, or type your answers in the form. | सहायक इसे समझ नहीं पाया। कृपया फिर कोशिश करें, या अपने जवाब फ़ॉर्म में लिखें। | |
| 90 | talk.errRecording | That recording could not be used. Please record again, and speak for less than a minute. | यह रिकॉर्डिंग इस्तेमाल नहीं हो सकी। कृपया फिर से रिकॉर्ड करें और एक मिनट से कम बोलें। | |
| 91 | talk.errGeneric | Something went wrong with the helper. Please try again, or type your answers in the form. | सहायक में कुछ गड़बड़ हो गई। कृपया फिर कोशिश करें, या अपने जवाब फ़ॉर्म में लिखें। | |

## Shot 4, step 1: about you

Shot 4: step 1 of 4, with the short privacy note. (19 strings)

| # | Key | English | Hindi | Fix |
|---|---|---|---|---|
| 92 | common.stepOf | Step {n} of {total} | चरण {n} / {total} | |
| 93 | common.select | Select | चुनें | |
| 94 | profile.eyebrow | Let us get to know you | आइए आपको जानें | |
| 95 | profile.title | Tell us about yourself | अपने बारे में बताइए | |
| 96 | profile.subtitle | Tell us your name and the language you want to read in. | अपना नाम और वह भाषा बताइए जिसमें आप पढ़ना चाहते हैं। | |
| 97 | profile.name | What is your name? | आपका नाम क्या है? | |
| 98 | profile.namePh | Your name | आपका नाम | |
| 99 | profile.language | Which language should we use? | हम कौन सी भाषा इस्तेमाल करें? | |
| 100 | profile.languageHint | You can change this any time from the bar at the top. | इसे आप ऊपर की पट्टी से कभी भी बदल सकते हैं। | |
| 101 | profile.dialect | Which way of speaking is closest to yours? | आपके बोलने का तरीका किससे मिलता है? | |
| 102 | profile.dialectHint | This is optional. It helps us greet you the way people do in your area. | यह ज़रूरी नहीं है। इससे हम आपके इलाके के तरीके से आपका स्वागत कर पाते हैं। | |
| 103 | profile.submit | Continue to my business | अपने काम की जानकारी दें | |
| 104 | finance.submit **(notice)** | Check my business | मेरा काम जाँचें | |
| 105 | notice.sent **(notice)** | When you press {button} on the last step, some of your answers are sent to {fiduciary} to work out your result: your kind of work, your money figures, your state and district, and whether your business is in a village or a city. | आख़िरी चरण पर {button} बटन दबाने पर, आपका परिणाम निकालने के लिए आपके कुछ जवाब {fiduciary} को भेजे जाते हैं: आपके काम की किस्म, आपके पैसों के आँकड़े, आपका राज्य और ज़िला, और यह कि आपका काम गाँव में है या शहर में। | |
| 106 | notice.local **(notice)** | Your name, your business name, your village or town, where you sell and who your customers are stay in this browser tab. They are never sent, and they are printed on your report. | आपका नाम, आपके काम का नाम, आपका गाँव या कस्बा, आप कहाँ बेचते हैं और आपके ग्राहक कौन हैं, ये सब इसी ब्राउज़र टैब में रहते हैं। ये कभी नहीं भेजे जाते, और आपकी रिपोर्ट में छपते हैं। | |
| 107 | notice.demo **(notice)** | This is only a demonstration. Use made-up figures, not your real ones. | यह सिर्फ़ दिखाने के लिए बना नमूना है। अपने असली आँकड़े न डालें, मन से बनाए हुए आँकड़े डालें। | |
| 108 | notice.demoOperator **(notice)** | the team running this demonstration | इस नमूने को चलाने वाली टीम | |
| 109 | notice.readFull **(notice)** | Read the full privacy notice | पूरी गोपनीयता सूचना पढ़ें | |
| 110 | talk.entryText | Rather talk than type? Say it in your own language and we will fill in the form for you to check. | लिखने की जगह बोलना चाहते हैं? अपनी भाषा में बताइए, हम फ़ॉर्म भर देंगे और आप उसे जाँच लीजिए। | |

## Shot 4, step 2: your business (with the helper-filled banner)

Shot 4: step 2 of 4, with the banner that says which answers came from the helper. (35 strings)

| # | Key | English | Hindi | Fix |
|---|---|---|---|---|
| 111 | business.eyebrow | About your business | आपके काम के बारे में | |
| 112 | business.title | Tell us what you do | बताइए आप क्या काम करते हैं | |
| 113 | business.subtitle | This tells us which schemes to list and whether the numbers work. | इससे हमें पता चलता है कि कौन-सी योजनाएँ दिखानी हैं और हिसाब बैठता है या नहीं। | |
| 114 | business.nameLabel | What is your business called? | आपके काम का नाम क्या है? | |
| 115 | business.category | What kind of work is it? | यह किस तरह का काम है? | |
| 116 | business.investment | How much money do you require? | आपको कितने पैसों की ज़रूरत है? | |
| 117 | business.revenue | How much money do you expect to earn each month? | आप हर महीने कितनी कमाई की उम्मीद करते हैं? | |
| 118 | business.opex | How much will the business itself cost each month? | हर महीने काम पर कितना खर्च होगा? | |
| 119 | business.opexHint | Only business costs — stock, rent, transport, electricity. Not your home costs. | सिर्फ़ काम का खर्च — माल, किराया, ढुलाई, बिजली। घर का खर्च नहीं। | |
| 120 | business.submit | Continue to my area | अपने इलाके की जानकारी दें | |
| 121 | finance.expectedIncome<br>same Hindi as 138 | Expected monthly income | हर महीने की उम्मीद की कमाई | |
| 122 | business.tapOne | Tap one option. | एक विकल्प चुनें। | |
| 123 | business.numbersTitle | Your business numbers | आपके काम के आँकड़े | |
| 124 | business.numbersHint | Rough estimates are okay. You can change them later. | मोटा अंदाज़ा भी ठीक है। बाद में बदल सकते हैं। | |
| 125 | business.moreDetails | More business details | काम की और जानकारी | |
| 126 | business.debt | Existing business debt | पहले से चल रहा क़र्ज़ | |
| 127 | cat.retail | Retail / Shop | दुकान / खुदरा | |
| 128 | cat.food | Food / Food Processing | खाना / खाद्य प्रसंस्करण | |
| 129 | cat.handicrafts | Handicrafts | हस्तशिल्प | |
| 130 | cat.tailoring | Tailoring / Garments | सिलाई / कपड़े | |
| 131 | cat.agriculture<br>same Hindi as 145 | Agriculture | खेती | |
| 132 | cat.dairy | Livestock / Dairy | पशुपालन / डेयरी | |
| 133 | cat.poultry | Poultry / Eggs | मुर्गी पालन / अंडे | |
| 134 | cat.services | Services | सेवाएँ | |
| 135 | cat.manufacturing | Manufacturing | निर्माण | |
| 136 | cat.other | Other | अन्य | |
| 137 | errf.category **(notice)** | the kind of work you do | आपके काम की किस्म | |
| 138 | errf.revenue **(notice)**<br>same Hindi as 121 | the money you expect to earn each month | हर महीने की उम्मीद की कमाई | |
| 139 | errf.investment **(notice)** | how much money you require | शुरू करने के लिए ज़रूरी पैसे | |
| 140 | errf.opExpenses **(notice)** | how much the business itself will cost each month | हर महीने काम पर होने वाले खर्च | |
| 141 | errf.debt **(notice)** | your existing business debt | आपके पहले से चल रहे क़र्ज़ | |
| 142 | form.localOnly **(notice)** | This is never sent. It stays in this tab, is printed on your report, and does not change your result. | यह कभी नहीं भेजा जाता। यह इसी टैब में रहता है, आपकी रिपोर्ट में छपता है, और आपके परिणाम को नहीं बदलता। | |
| 143 | talk.filledTitle | Filled in from what you said | आपकी बात से भरे गए | |
| 144 | talk.filledText | Please check these answers and change any that are wrong: | कृपया इन जवाबों को जाँचें और जो गलत हों उन्हें बदलें: | |
| 145 | scat.agriculture<br>same Hindi as 131 | farming | खेती | |

## Shot 4, step 3: your area

Shot 4: step 3 of 4. (30 strings)

| # | Key | English | Hindi | Fix |
|---|---|---|---|---|
| 146 | business.categoryHint<br>same Hindi as 157 | Choose the closest option. | सबसे नज़दीक वाला चुनें। | |
| 147 | location.title | Where does your business operate? | आपका काम कहाँ चलता है? | |
| 148 | location.subtitle | Your location helps us find the schemes open where you work, and local market figures where we have them. | आपकी जगह से हम वे योजनाएँ ढूँढ पाते हैं जो आपके इलाके में मिलती हैं, और जहाँ हमारे पास हों, वहाँ के स्थानीय बाज़ार के आँकड़े। | |
| 149 | location.state<br>same Hindi as 171 | Your state | आपका राज्य | |
| 150 | location.stateHint | Choose from the list. | सूची से चुनें। | |
| 151 | location.district<br>same Hindi as 172, 174 | Your district | आपका ज़िला | |
| 152 | location.stateAndDistrict | State and district | राज्य और ज़िला | |
| 153 | location.districtIn | Districts in {state}. | {state} के ज़िले। | |
| 154 | location.village<br>same Hindi as 175 | Village / Town | गाँव / कस्बा | |
| 155 | location.villageHint | The name of your own village or town. | आपके अपने गाँव या कस्बे का नाम। | |
| 156 | location.areaType | Is your business in a village or city? | आपका काम गाँव में है या शहर में? | |
| 157 | location.areaTypeHint<br>same Hindi as 146 | Choose the closest option. | सबसे नज़दीक वाला चुनें। | |
| 158 | location.market | Where do your customers usually buy from you? | आपके ग्राहक आमतौर पर कहाँ से खरीदते हैं? | |
| 159 | location.marketHint | Tap every place that applies. You can choose more than one. | हर वह जगह चुनें जो लागू हो। एक से ज़्यादा चुन सकते हैं। | |
| 160 | location.customersMore | Tell us more about your customers | अपने ग्राहकों के बारे में और बताइए | |
| 161 | location.customersQ | Who are your main customers? | आपके मुख्य ग्राहक कौन हैं? | |
| 162 | location.customersHint | For example: local families, farmers, nearby shops. | जैसे: आस-पास के परिवार, किसान, नज़दीकी दुकानें। | |
| 163 | location.submit | Continue to finance | पैसों की जानकारी दें | |
| 164 | market.village | Village / Local Market | गाँव / स्थानीय बाज़ार | |
| 165 | market.weekly | Weekly Market / Haat | साप्ताहिक बाज़ार / हाट | |
| 166 | market.town | Nearby Town | पास का कस्बा | |
| 167 | market.online | Online / Digital | ऑनलाइन / डिजिटल | |
| 168 | area.rural | Village / Rural | गाँव / ग्रामीण | |
| 169 | area.semi | Semi-Urban | अर्ध-शहरी | |
| 170 | area.urban | City / Urban | शहर / शहरी | |
| 171 | errf.state **(notice)**<br>same Hindi as 149 | your state | आपका राज्य | |
| 172 | errf.district **(notice)**<br>same Hindi as 151, 174 | your district | आपका ज़िला | |
| 173 | errf.areaType **(notice)** | whether your business is in a village or city | आपके काम की जगह (गाँव या शहर) | |
| 174 | lvl.district<br>same Hindi as 151, 172 | Your district | आपका ज़िला | |
| 175 | rp.villageTown<br>same Hindi as 154 | Village / Town | गाँव / कस्बा | |

## Shot 4, step 4: your money (with the privacy note)

Shot 4: step 4 of 4, with the privacy note next to the consent box. (32 strings)

| # | Key | English | Hindi | Fix |
|---|---|---|---|---|
| 176 | common.optional | Optional | वैकल्पिक | |
| 177 | common.startOver **(notice)** | Start over | फिर से शुरू करें | |
| 178 | finance.title | Let us understand your finances | आइए आपके पैसों को समझें | |
| 179 | finance.subtitle | You do not need exact numbers. Simple estimates are enough for us to check funding needs and monthly business health. | सही-सही आँकड़े ज़रूरी नहीं। मोटा अंदाज़ा भी काफ़ी है, जिससे हम ज़रूरी पैसा और महीने की सेहत देख सकें। | |
| 180 | finance.startHeading<br>same Hindi as 207 | Money needed to start | शुरू करने के लिए ज़रूरी पैसा | |
| 181 | finance.startHint | We already have your planned investment from the previous step. | आपका नियोजित निवेश पिछले चरण से ले लिया गया है। | |
| 182 | finance.investNeeded | Total investment needed | कुल ज़रूरी निवेश | |
| 183 | finance.capital | How much money do you already have? | आपके पास पहले से कितना पैसा है? | |
| 184 | finance.flowHeading | Money coming in and going out | आने वाला और जाने वाला पैसा | |
| 185 | finance.flowHint | Think about an average month. | एक आम महीने के बारे में सोचें। | |
| 186 | finance.fromBusiness | Taken from your business details. | आपके काम की जानकारी से लिया गया। | |
| 187 | finance.expenses | How much do you spend each month? | आप हर महीने कितना खर्च करते हैं? | |
| 188 | finance.expensesHint | Everything you spend in a month, including your home and family costs. | महीने का पूरा खर्च, घर और परिवार का खर्च भी शामिल। | |
| 189 | finance.emiSummary | Do you or your family repay any loan or EMI? | क्या आप या आपका परिवार कोई क़र्ज़ या EMI चुका रहा है? | |
| 190 | finance.emi | Monthly EMI / loan payment | हर महीने की EMI / क़र्ज़ की किस्त | |
| 191 | finance.emiPh | 0 if none | न हो तो 0 | |
| 192 | finance.emiHint | Add up the monthly repayment of every loan that you, your husband or wife, or your unmarried children are paying. If you are not married, add up the loans of your parents and of their unmarried children instead, yours included. | आप, आपके पति या पत्नी, या आपके अविवाहित बच्चे जितने भी क़र्ज़ चुका रहे हैं, उन सबकी हर महीने की किस्त जोड़कर लिखें। अगर आपकी शादी नहीं हुई है, तो इसकी जगह अपने माता-पिता और उनके अविवाहित बच्चों के सारे क़र्ज़ों की किस्तें जोड़ें, अपनी भी। | |
| 193 | finance.householdIncome | How much does your household earn in a month? | आपका परिवार महीने में कितना कमाता है? | |
| 194 | finance.householdIncomeHint | Your household is you, your husband or wife, and your unmarried children. If you are not married, your household is your parents and their unmarried children, you included. Add what all of them earn from all their work, including any business already running. A rough monthly average over the past year is enough. Do not count what the new plan is expected to earn. You can leave this blank. | परिवार यानी आप, आपके पति या पत्नी, और आपके अविवाहित बच्चे। अगर आपकी शादी नहीं हुई है, तो परिवार यानी आपके माता-पिता और उनके सभी अविवाहित बच्चे, जिनमें आप भी हैं। इन सबकी हर काम से होने वाली कमाई जोड़ें, पहले से चल रहे किसी काम-धंधे की कमाई भी। पिछले एक साल में हर महीने लगभग जितना आया, उतना लिखें। नए काम से जितनी कमाई की उम्मीद है, वह न जोड़ें। चाहें तो इसे ख़ाली छोड़ दें। | |
| 195 | finance.privacyNote **(notice)** | This tab keeps a copy of your answers, even if you refresh the page. Closing the tab usually removes it. If other people also use this phone or computer, press {button} at the top when you finish. | यह टैब आपके जवाबों की एक कॉपी रखता है, पेज रिफ़्रेश करने पर भी। टैब बंद करने पर वह आम तौर पर मिट जाती है। अगर इस फ़ोन या कंप्यूटर को दूसरे लोग भी इस्तेमाल करते हैं, तो काम पूरा होने पर ऊपर {button} बटन दबाएँ। | |
| 196 | money.leftAfterEmi | Money left after the loan payment | क़र्ज़ की किस्त चुकाने के बाद बचने वाला पैसा | |
| 197 | money.needed | Money still needed | अभी और चाहिए | |
| 198 | money.needArrange | This is the amount you may need to arrange. | इतना पैसा आपको जुटाना पड़ सकता है। | |
| 199 | money.afterExpenses | Estimated after expenses and EMI. | खर्च और EMI के बाद का अंदाज़ा। | |
| 200 | errf.capital **(notice)** | the money you already have | आपके पास पहले से मौजूद पैसे | |
| 201 | errf.expenses **(notice)** | how much you spend each month | आपके हर महीने के खर्च | |
| 202 | errf.emi **(notice)** | your monthly EMI or loan payment | हर महीने की EMI या क़र्ज़ की किस्त | |
| 203 | errf.householdIncome **(notice)** | how much your household earns in a month | आपके परिवार की महीने की कमाई | |
| 204 | consent.title **(notice)** | Before we check your business | आपका काम जाँचने से पहले | |
| 205 | consent.agree **(notice)** | I have read the note above. I agree to send these answers to {fiduciary} to work out my result. | मैंने ऊपर लिखी बात पढ़ ली है। मैं सहमत हूँ कि मेरा परिणाम निकालने के लिए ये जवाब {fiduciary} को भेजे जाएँ। | |
| 206 | ch.inOut | Money in and money out | आने और जाने वाला पैसा | |
| 207 | ch.required<br>same Hindi as 180 | Money needed to start | शुरू करने के लिए ज़रूरी पैसा | |

## Result pages: the light, the Simple/Detailed switch and the Listen button (shown in English in the video)

Not in the Hindi part of the video (the language is switched to English on the last step), but new this week and shown when a reviewer switches the language on a result page. The Listen button (rows 216 to 218) appears only where the browser has a voice for the language that runs on the device itself. On the author's Windows Edge on 29 Oct 2026 it had none, so these three have not been seen on a real screen yet. (11 strings)

| # | Key | English | Hindi | Fix |
|---|---|---|---|---|
| 208 | band.green | Green: no problem found in your figures | हरा: आपके आँकड़ों में कोई समस्या नहीं मिली | |
| 209 | band.yellow | Yellow: something to check before you go ahead | पीला: आगे बढ़ने से पहले कुछ जाँचना है | |
| 210 | band.red | Red: there is a problem to fix first | लाल: पहले एक समस्या ठीक करनी है | |
| 211 | band.basis | This light only reads the figures you gave. It is not a decision about a loan or a scheme. | यह बत्ती सिर्फ़ आपके बताए आँकड़े पढ़ती है। यह किसी क़र्ज़ या योजना का फ़ैसला नहीं है। | |
| 212 | detail.label | How much to show | कितना दिखाना है | |
| 213 | detail.simple | Simple | सरल | |
| 214 | detail.detailed | Detailed | विस्तार से | |
| 215 | detail.simpleNote | This is the short version. To see everything we worked out, press {detailed}. | यह छोटा रूप है। हमने जो कुछ निकाला है वह सब देखने के लिए {detailed} दबाएँ। | |
| 216 | ra.listen | Listen | सुनें | |
| 217 | ra.stop | Stop | रोकें | |
| 218 | ra.note | A voice on this device reads out the light and the main sentences. It does not read the figures. This app sends nothing to do it. | इस डिवाइस की अपनी आवाज़ बत्ती और मुख्य वाक्य पढ़कर सुनाती है। आँकड़े नहीं पढ़े जाते। इसके लिए यह ऐप कुछ भी कहीं नहीं भेजता। | |

## The questions the helper page asks one at a time (new this week)

The helper page now asks the form's questions one at a time, in the order of the form, and reads each one aloud when the browser has a voice for the language. Nine of the questions are wording the form already uses and are in this sheet: rows 115 to 118, 156, 183, 187, 189 and 193. The eleven below are new. The Listen and Stop buttons beside each question are rows 216 and 217. On this page the voice may be one that the browser reaches over the network, so row 218 (“sends nothing”) is not shown here. Do not change `{n}` and `{total}`. (11 strings)

| # | Key | English | Hindi | Fix |
|---|---|---|---|---|
| 219 | talk.askOpen | Tell me about your business: what work you do, where you are, and how much money you have and need. | अपने काम के बारे में बताइए: आप क्या काम करते हैं, कहाँ रहते हैं, और आपके पास कितना पैसा है और कितना चाहिए। | |
| 220 | talk.progress | Question {n} of {total} | सवाल {n} / {total} | |
| 221 | talk.skip | Skip this question | यह सवाल छोड़ें | |
| 222 | talk.right | Yes, that is right | हाँ, यह सही है | |
| 223 | talk.again | No, I will say it again | नहीं, फिर से बोलना है | |
| 224 | talk.toForm | Use the form instead | फ़ॉर्म से भरें | |
| 225 | talk.allDone | All the questions are done. Go to the form to check your answers. | सारे सवाल हो गए। अपने जवाब जाँचने के लिए फ़ॉर्म पर जाइए। | |
| 226 | talk.noneHere | We could not find an answer to this question in what you said. Say it again, type it, or skip this question. | आपकी बात में हमें इस सवाल का जवाब नहीं मिला। फिर से बोलिए, लिखिए, या यह सवाल छोड़ दीजिए। | |
| 227 | talk.askDebt | Does this business already owe any money? If yes, how much? | क्या इस काम पर पहले से कोई क़र्ज़ है? अगर हाँ, तो कितना? | |
| 228 | talk.askState | Which state is your business in? | आपका काम किस राज्य में है? | |
| 229 | talk.askDistrict | Which district is your business in? | आपका काम किस ज़िले में है? | |

## The scheme page: “Check these first” (new this week, shown in English in the video)

Each scheme on the scheme page and on the printout now opens with the few of its own eligibility lines that decide whether it fits a person. The lines themselves are the scheme's existing sentences (the scheme texts are not in this sheet); these two are the heading and the sentence under it. Nothing is checked for the reader, and the second sentence says so. The author read both rows on 31 Oct 2026 and left them as they are. (2 strings)

| # | Key | English | Hindi | Fix |
|---|---|---|---|---|
| 230 | sc.checkFirst | Check these first | पहले ये जाँच लें | |
| 231 | sc.checkFirstText | This scheme might not fit you if one of these is not true for you. We cannot check them for you. | इनमें से कोई बात आप पर लागू न हो, तो हो सकता है यह योजना आपके लिए न हो। इन्हें हम आपके लिए नहीं जाँच सकते। | |

## State and union territory names in the menu

These come from `frontend/src/data/indiaLocations.js`, not from the dictionary. Only the name of the chosen state is on screen at a time; the whole list is open when the menu is.

| # | English | Hindi | Fix |
|---|---|---|---|
| S1 | Andhra Pradesh | आंध्र प्रदेश | |
| S2 | Arunachal Pradesh | अरुणाचल प्रदेश | |
| S3 | Assam | असम | |
| S4 | Bihar | बिहार | |
| S5 | Chhattisgarh | छत्तीसगढ़ | |
| S6 | Goa | गोवा | |
| S7 | Gujarat | गुजरात | |
| S8 | Haryana | हरियाणा | |
| S9 | Himachal Pradesh | हिमाचल प्रदेश | |
| S10 | Jharkhand | झारखंड | |
| S11 | Karnataka | कर्नाटक | |
| S12 | Kerala | केरल | |
| S13 | Madhya Pradesh | मध्य प्रदेश | |
| S14 | Maharashtra | महाराष्ट्र | |
| S15 | Manipur | मणिपुर | |
| S16 | Meghalaya | मेघालय | |
| S17 | Mizoram | मिज़ोरम | |
| S18 | Nagaland | नगालैंड | |
| S19 | Odisha | ओडिशा | |
| S20 | Punjab | पंजाब | |
| S21 | Rajasthan | राजस्थान | |
| S22 | Sikkim | सिक्किम | |
| S23 | Tamil Nadu | तमिलनाडु | |
| S24 | Telangana | तेलंगाना | |
| S25 | Tripura | त्रिपुरा | |
| S26 | Uttar Pradesh | उत्तर प्रदेश | |
| S27 | Uttarakhand | उत्तराखंड | |
| S28 | West Bengal | पश्चिम बंगाल | |
| S29 | Andaman and Nicobar Islands | अंडमान और निकोबार द्वीपसमूह | |
| S30 | Chandigarh | चंडीगढ़ | |
| S31 | Dadra and Nagar Haveli and Daman and Diu | दादरा और नगर हवेली और दमन और दीव | |
| S32 | Delhi | दिल्ली | |
| S33 | Jammu and Kashmir | जम्मू और कश्मीर | |
| S34 | Ladakh | लद्दाख | |
| S35 | Lakshadweep | लक्षद्वीप | |
| S36 | Puducherry | पुदुचेरी | |
