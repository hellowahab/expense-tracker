import { Category } from '../models/expense.model';

// ── Result of parsing a spoken phrase into expense fields
export interface ParsedExpense {
  title: string;
  amount: number | null;   // null when no amount could be understood
  category: Category;
  date: string;            // "YYYY-MM-DD"
}

// ── Spoken-number building blocks
const ONES: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
};
const TENS: Record<string, number> = {
  twenty: 20, thirty: 30, forty: 40, fifty: 50,
  sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};
// magnitudes — lakh/crore included for the PKR context
const SCALES: Record<string, number> = {
  hundred: 100, thousand: 1000, lakh: 100000, crore: 10000000, million: 1000000,
};

const NUMBER_FILLER = new Set(['and', 'a']);

function isCoreNumberWord(word: string): boolean {
  return word in ONES || word in TENS || word === 'hundred' || word in SCALES;
}

// ── Convert a run of number-words into a single value
function wordsToNumber(words: string[]): number {
  let total = 0;
  let current = 0;
  for (const w of words) {
    if (w in ONES) current += ONES[w];
    else if (w in TENS) current += TENS[w];
    else if (w === 'hundred') current = (current || 1) * 100;
    else if (w in SCALES) {
      total += (current || 1) * SCALES[w];
      current = 0;
    }
    // 'and' / 'a' are ignored as filler
  }
  return total + current;
}

// ── Category keyword map (single words only — matched token-by-token)
const CATEGORY_KEYWORDS: Record<Category, string[]> = {
  Food: [
    'food', 'lunch', 'dinner', 'breakfast', 'brunch', 'yogurt', 'yougurt',
    'grocery', 'groceries', 'restaurant', 'coffee', 'tea', 'snack', 'snacks',
    'meal', 'pizza', 'burger', 'milk', 'bread', 'fruit', 'fruits', 'vegetables',
  ],
  Transport: [
    'transport', 'fuel', 'petrol', 'diesel', 'gas', 'uber', 'careem', 'taxi',
    'bus', 'train', 'metro', 'rickshaw', 'parking', 'fare', 'ride', 'travel',
  ],
  Shopping: [
    'shopping', 'clothes', 'shoes', 'shirt', 'dress', 'mall', 'amazon',
    'gadget', 'gadgets', 'electronics', 'jacket', 'bag',
  ],
  Bills: [
    'bill', 'bills', 'electricity', 'water', 'internet', 'wifi', 'rent',
    'utility', 'utilities', 'subscription', 'recharge',
  ],
  Health: [
    'health', 'medicine', 'medicines', 'doctor', 'pharmacy', 'hospital',
    'clinic', 'medical', 'gym', 'fitness', 'dentist',
  ],
  Entertainment: [
    'entertainment', 'movie', 'movies', 'cinema', 'netflix', 'game', 'games',
    'concert', 'spotify', 'party',
  ],
  Other: [],
};

// reverse lookup: keyword → category
const KEYWORD_TO_CATEGORY: Record<string, Category> = {};
for (const [cat, words] of Object.entries(CATEGORY_KEYWORDS)) {
  for (const w of words) KEYWORD_TO_CATEGORY[w] = cat as Category;
}

// ── Words stripped when building the title (verbs, prepositions, currency)
const STOPWORDS = new Set([
  'spent', 'spend', 'paid', 'pay', 'bought', 'buy', 'on', 'for', 'of', 'the',
  'a', 'an', 'rs', 'rupee', 'rupees', 'pkr', 'cost', 'costs', 'was', 'were',
  'i', 'my', 'me', 'to', 'at', 'in', 'it', 'today', 'yesterday',
]);

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function capitalize(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}

// ── Find the amount: digits first, then a run of number-words
function extractAmount(
  tokens: string[],
  used: Set<number>,
): number | null {
  // 1) digits — "400", "1,500", "400.50"
  for (let i = 0; i < tokens.length; i++) {
    const cleaned = tokens[i].replace(/,/g, '');
    if (/^\d+(\.\d+)?$/.test(cleaned)) {
      used.add(i);
      return parseFloat(cleaned);
    }
  }

  // 2) maximal contiguous run of number-words
  const runIdx: number[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (isCoreNumberWord(t)) {
      runIdx.push(i);
    } else if (NUMBER_FILLER.has(t) && runIdx.length > 0) {
      runIdx.push(i); // interior filler, e.g. "four hundred and fifty"
    } else if (runIdx.length > 0) {
      break; // first complete run wins
    }
  }

  // drop trailing filler ('and' / 'a') that led nowhere
  while (runIdx.length && NUMBER_FILLER.has(tokens[runIdx[runIdx.length - 1]])) {
    runIdx.pop();
  }
  if (!runIdx.length) return null;

  runIdx.forEach(i => used.add(i));
  return wordsToNumber(runIdx.map(i => tokens[i]));
}

// ── Detect "today" / "yesterday"; default to today
function extractDate(tokens: string[], used: Set<number>): string {
  const today = new Date();
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i] === 'today') {
      used.add(i);
      return toIsoDate(today);
    }
    if (tokens[i] === 'yesterday') {
      used.add(i);
      const d = new Date(today);
      d.setDate(d.getDate() - 1);
      return toIsoDate(d);
    }
  }
  return toIsoDate(today);
}

// ── Match a category from keywords (first hit wins; default Other)
function extractCategory(tokens: string[]): Category {
  for (const t of tokens) {
    if (KEYWORD_TO_CATEGORY[t]) return KEYWORD_TO_CATEGORY[t];
  }
  return 'Other';
}

/**
 * Parse a spoken phrase like "spent four hundred on yougurt today"
 * into structured expense fields.
 */
export function parseVoiceExpense(phrase: string): ParsedExpense {
  // tokenize: keep original case for the title, lowercase copy for matching
  const originalTokens = phrase
    .trim()
    .replace(/-/g, ' ')
    .split(/\s+/)
    .map(t => t.replace(/[^\w.,]/g, ''))
    .filter(t => t.length > 0);
  const tokens = originalTokens.map(t => t.toLowerCase());

  const used = new Set<number>();
  const amount = extractAmount(tokens, used);
  const date = extractDate(tokens, used);
  const category = extractCategory(tokens);

  // leftover (non-amount, non-date, non-stopword) becomes the title
  const title = capitalize(
    originalTokens
      .filter((_, i) => !used.has(i) && !STOPWORDS.has(tokens[i]))
      .join(' ')
      .trim(),
  );

  return { title, amount, category, date };
}
