function isoWeekKey(d: Date): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((date.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${date.getUTCFullYear()}-W${week}`;
}

/** Nº de semanas consecutivas (incluyendo la actual) con al menos una sesión analizada. */
export function computeWeekStreak(isoDates: string[]): number {
  if (isoDates.length === 0) return 0;
  const weeks = new Set(isoDates.map((d) => isoWeekKey(new Date(d))));
  let streak = 0;
  const cursor = new Date();
  for (;;) {
    const key = isoWeekKey(cursor);
    if (!weeks.has(key)) break;
    streak++;
    cursor.setDate(cursor.getDate() - 7);
  }
  return streak;
}
