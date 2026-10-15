export const normalizeValue = (value: string) => value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();

// A source span must contain the complete value, never part of an identifier or
// formatted number. Currency prefixes may precede a complete numeric value.
export function quoteContainsValue(quote: string, value: string): boolean {
 const text = normalizeValue(quote), needle = normalizeValue(value);
 if (!needle) return false;
 const numericStart = /^(?:[a-z]{3}\s+)?(?:[$€£¥]\s*)?\p{N}/iu.test(needle), numericEnd = /\p{N}$/u.test(needle);
 for (let index = text.indexOf(needle); index !== -1; index = text.indexOf(needle, index + 1)) {
  const before = text.slice(0, index), after = text.slice(index + needle.length);
  if (/[\p{L}\p{N}\p{M}_-]$/u.test(before) || /^[\p{L}\p{N}\p{M}_-]/u.test(after)) continue;
  if (numericStart && (/[+\-−]\s*(?:[a-z]{3}\s*)?[$€£¥]?\s*$/iu.test(before) || /\(\s*(?:[a-z]{3}\s*)?[$€£¥]?\s*$/iu.test(before) || /\p{N}\s*[.,/'’]\s*$/u.test(before) || /\p{N}\s+$/u.test(before))) continue;
  if (numericEnd && (/^\s*[.,/'’]\s*\p{N}/u.test(after) || /^\s*%/u.test(after) || /^\s+\p{N}/u.test(after))) continue;
  return true;
 }
 return false;
}

type Amount = { cents: bigint; currency: string | null; dollarSign: boolean };
function parseAmount(value: string): Amount | null {
 const text = value.normalize('NFKC').trim().replace(/\s+/g, ' ').toUpperCase();
 // Only unambiguous English grouping and at most two decimal places. No
 // exponent, sign, inferred currency, or international-separator guessing.
 const match = /^(?:([A-Z]{3})\s+)?(\$)?\s*((?:\d+|[1-9]\d{0,2}(?:,\d{3})+)(?:\.\d{1,2})?)(?:\s+([A-Z]{3}))?$/.exec(text);
 if (!match || match[1] && match[4]) return null;
 const [whole, fraction = ''] = match[3].replace(/,/g, '').split('.');
 return { cents: BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, '0') || '0'), currency: match[1] ?? match[4] ?? null, dollarSign: Boolean(match[2]) };
}

export function commitmentMatches(value: string, expected: string, expectedCurrency: string): boolean {
 const actual = parseAmount(value), application = parseAmount(expected);
 if (!actual || !application || actual.cents !== application.cents) return false;
 // A bare amount has no currency to compare. '$' remains a dollar marker;
 // never convert it into an ISO currency or erase an explicit ISO mismatch.
 if (application.currency && application.currency !== expectedCurrency.toUpperCase()) return false;
 if (actual.currency && actual.currency !== expectedCurrency.toUpperCase()) return false;
 if (actual.dollarSign && !application.dollarSign) return false;
 return true;
}
