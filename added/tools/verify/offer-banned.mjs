// Words the loan-offer card must never print, in any of the 8 languages. The card works out
// what an offer costs and puts it beside a figure at the rate this app assumes. It does not say
// an offer is illegal, too high, unfair or a fraud, and it does not tell anyone to take it or to
// leave it. Two checks read this list: tools/verify/offer-lines-test.mjs, over every offer.*
// sentence of the dictionary, and tools/verify/offer-ui.mjs, over what the page really prints.
//
// A word on this list is a word the card must not use at all, even in a sentence that denies it
// ("is not unfair"), so the card's own wording avoids all of them.
//
// Every word is matched from the start of a word, so "cheat" also catches "cheating" and a stem
// in another language is caught with an ending after it. The same letters in the middle of a
// longer word are not a match: the Malayalam for "than the one shown" holds the letters of the
// word for deceit. The other lists are the common words for the same ideas. No list can hold
// every way of saying it: this is a guard against a slip, and not a proof.

export const BANNED = {
  en: [
    'illegal', 'unlawful', 'against the law', 'usur', 'fraud', 'scam', 'cheat', 'rip-off', 'rip off',
    'too high', 'too much', 'too costly', 'expensive', 'cheap', 'unfair', 'exploit', 'predatory',
    'dangerous', 'bad deal', 'good deal', 'should', 'must', 'recommend', 'avoid', 'do not take',
    "don't take", 'reject',
  ],
  hi: ['गैरकानूनी', 'ग़ैरक़ानूनी', 'अवैध', 'धोखा', 'धोखे', 'ठग', 'महँगा', 'महंगा', 'सस्ता', 'बहुत ज़्यादा', 'बहुत ज्यादा'],
  ta: ['சட்டவிரோத', 'மோசடி', 'ஏமாற்று', 'விலை உயர்ந்த', 'மிக அதிக'],
  te: ['చట్టవిరుద్ధ', 'మోసం', 'మోసపు', 'ఖరీదైన', 'చాలా ఎక్కువ'],
  ml: ['നിയമവിരുദ്ധ', 'തട്ടിപ്പ്', 'ചതി', 'വളരെ കൂടുതൽ'],
  kn: ['ಕಾನೂನುಬಾಹಿರ', 'ವಂಚನೆ', 'ಮೋಸ', 'ತುಂಬಾ ಹೆಚ್ಚು'],
  mr: ['बेकायदेशीर', 'फसवणूक', 'महाग', 'स्वस्त', 'खूप जास्त'],
  bn: ['অবৈধ', 'প্রতারণা', 'ঠকা', 'দামী', 'সস্তা', 'অনেক বেশি'],
}

const escape = (word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// The words of the list for `code` that `text` contains.
export function bannedIn(text, code) {
  const words = BANNED[code]
  if (!words) throw new Error(`no banned-word list for ${code}`)
  const found = []
  for (const word of words) {
    // A letter or a mark (a vowel sign, a virama) before the word means it is not the start of one.
    const pattern = code === 'en' ? new RegExp(`\\b${escape(word)}`, 'i') : new RegExp(`(?<![\\p{L}\\p{M}])${escape(word)}`, 'u')
    if (pattern.test(text)) found.push(word)
  }
  return found
}
