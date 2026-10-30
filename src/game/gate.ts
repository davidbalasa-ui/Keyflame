// The grown-up check: the year you were born. Any year that makes you 18 or older passes.
// The year is only compared here, never saved or sent anywhere.

export const GROWN_UP_AGE = 18;

/** True for a four-digit birth year at least 18 years back, and no more than 120. */
export function grownUpYear(text: string, now = new Date()): boolean {
  const t = text.trim();
  if (!/^\d{4}$/.test(t)) return false;
  const year = Number(t);
  const thisYear = now.getFullYear();
  return year <= thisYear - GROWN_UP_AGE && year >= thisYear - 120;
}
