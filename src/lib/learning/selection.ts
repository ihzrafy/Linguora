/** Pure question-selection helpers for quizzes and exams (randomised, blueprint-aware). */

export type PoolItem = { id: string; category: string; levelCode?: string; stage?: string; difficulty?: number; sort?: number };
export type Random = () => number;

export function shuffle<T>(items: readonly T[], random: Random = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Picks `count` items following a category blueprint ({grammar: 10, vocabulary: 8, ...}).
 * Missing categories are back-filled from the remaining pool so the exam is always full.
 * Items listed in `preferred` (e.g. exam-only questions) are drawn first within a category.
 */
export function pickByBlueprint(
  pool: PoolItem[],
  count: number,
  blueprint: Record<string, number>,
  random: Random = Math.random,
  preferred: (item: PoolItem) => boolean = () => false,
): PoolItem[] {
  const chosen: PoolItem[] = [];
  const used = new Set<string>();
  const ordered = (items: PoolItem[]) => [...shuffle(items.filter(preferred), random), ...shuffle(items.filter((i) => !preferred(i)), random)];

  for (const [category, n] of Object.entries(blueprint)) {
    for (const item of ordered(pool.filter((p) => p.category === category))) {
      if (chosen.filter((c) => c.category === category).length >= n || chosen.length >= count) break;
      chosen.push(item);
      used.add(item.id);
    }
  }
  for (const item of ordered(pool.filter((p) => !used.has(p.id)))) {
    if (chosen.length >= count) break;
    chosen.push(item);
    used.add(item.id);
  }
  return chosen;
}

/** Stratified pick: `perLevel` items for every level code, ordered from easiest level to hardest. */
export function pickStratified(pool: PoolItem[], perLevel: number, levelOrder: string[], random: Random = Math.random): PoolItem[] {
  return levelOrder.flatMap((level) => {
    const band = pool.filter((p) => p.levelCode === level);
    // Spread categories inside each band.
    const byCategory = new Map<string, PoolItem[]>();
    for (const item of shuffle(band, random)) byCategory.set(item.category, [...(byCategory.get(item.category) ?? []), item]);
    const picked: PoolItem[] = [];
    while (picked.length < Math.min(perLevel, band.length)) {
      for (const list of byCategory.values()) {
        const next = list.shift();
        if (next && picked.length < perLevel) picked.push(next);
      }
    }
    return picked;
  });
}

/** Simple random sample of `count` ids (all when count is null or larger than the pool). */
export function sample<T>(items: readonly T[], count: number | null | undefined, random: Random = Math.random): T[] {
  const shuffled = shuffle(items, random);
  return count && count < shuffled.length ? shuffled.slice(0, count) : shuffled;
}
