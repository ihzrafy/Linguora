import type { GradingOptions } from "./types";

const CONTRACTIONS: [RegExp, string][] = [
  [/\bwon't\b/g, "will not"],
  [/\bcan't\b/g, "can not"],
  [/\bcannot\b/g, "can not"],
  [/\bshan't\b/g, "shall not"],
  [/\bain't\b/g, "am not"],
  [/n't\b/g, " not"],
  [/\bi'm\b/g, "i am"],
  [/'re\b/g, " are"],
  [/'ll\b/g, " will"],
  [/'ve\b/g, " have"],
];

/** Unify quotes, dashes, unicode forms and whitespace. */
export function canonical(input: string): string {
  return input
    .normalize("NFKC")
    .replace(/[‘’ʼ`´]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normalise a free-text answer for comparison.
 * - whitespace collapsed, quotes unified
 * - punctuation removed (default) or attached spacing fixed
 * - lowercase unless caseSensitive
 */
export function normalizeAnswer(input: string, options: GradingOptions = {}): string {
  const { caseSensitive = false, ignorePunctuation = true } = options;
  let s = canonical(input);
  if (ignorePunctuation) {
    // Keep apostrophes and hyphens that sit inside words (don't, well-known).
    s = s
      .replace(/(^|\s)['-]+|['-]+(?=\s|$)/g, "$1")
      .replace(/[.,!?;:"()[\]{}¿¡/\\]/g, " ");
  } else {
    s = s.replace(/\s+([.,!?;:])/g, "$1");
  }
  s = s.replace(/\s+/g, " ").trim();
  return caseSensitive ? s : s.toLowerCase();
}

/** Expand unambiguous English contractions ("don't" → "do not"). Input should be lowercase. */
export function expandContractions(input: string): string {
  let s = input;
  for (const [pattern, replacement] of CONTRACTIONS) s = s.replace(pattern, replacement);
  return s.replace(/\s+/g, " ").trim();
}

/** True when the response matches any accepted answer under the grading options. */
export function matchesAny(response: string, accepted: string[], options: GradingOptions = {}): boolean {
  const r = normalizeAnswer(response, options);
  if (!r) return false;
  const normalized = accepted.map((a) => normalizeAnswer(a, options));
  if (normalized.includes(r)) return true;
  if (options.strictContractions) return false;
  const lower = (s: string) => (options.caseSensitive ? s : s.toLowerCase());
  const expandedResponse = expandContractions(lower(r));
  return normalized.some((a) => expandContractions(lower(a)) === expandedResponse);
}

export function countWords(text: string): number {
  const t = canonical(text);
  return t ? t.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length : 0;
}
