// Core typing engine shared by lessons and races.
// Model: the cursor only advances on the correct key ("stop on error"),
// so every mistake must be fixed by typing the right character.

export interface KeyStat {
  hits: number;
  misses: number;
  /** Sum of milliseconds spent reaching this key on correct hits. */
  totalMs: number;
}

export type KeyStats = Record<string, KeyStat>;

export interface KeystrokeResult {
  correct: boolean;
  expected: string;
  typed: string;
  finished: boolean;
  streak: number;
}

export interface SessionSummary {
  wpm: number;
  accuracy: number;
  correct: number;
  errors: number;
  durationMs: number;
  keyStats: KeyStats;
}

/** Standard WPM: five characters count as one word. */
export function computeWpm(correctChars: number, ms: number): number {
  if (ms <= 0) return 0;
  return correctChars / 5 / (ms / 60000);
}

export function computeAccuracy(correct: number, total: number): number {
  return total === 0 ? 1 : correct / total;
}

export class TypingSession {
  readonly text: string;
  index = 0;
  correct = 0;
  errors = 0;
  streak = 0;
  bestStreak = 0;
  startedAt: number | null = null;
  finishedAt: number | null = null;
  readonly keyStats: KeyStats = {};
  /** Timestamps of correct keystrokes, for rolling WPM. */
  private hitTimes: number[] = [];
  private lastHitAt: number | null = null;
  /** Whether the current character already had a mistake. */
  private missedCurrent = false;

  /** Relaxed mode: a wrong key still moves on (it counts as a miss). */
  readonly advanceOnError: boolean;

  constructor(text: string, opts: { advanceOnError?: boolean } = {}) {
    this.text = text;
    this.advanceOnError = opts.advanceOnError ?? false;
  }

  get expected(): string {
    return this.text[this.index] ?? '';
  }

  get done(): boolean {
    return this.index >= this.text.length;
  }

  get progress(): number {
    return this.text.length === 0 ? 1 : this.index / this.text.length;
  }

  /** Mistyped positions, so the UI can mark characters that needed fixing. */
  readonly missedAt = new Set<number>();

  type(key: string, now: number = performance.now()): KeystrokeResult | null {
    if (this.done || key.length !== 1) return null;
    if (this.startedAt === null) {
      this.startedAt = now;
      this.lastHitAt = now;
    }
    const expected = this.expected;
    const stat = (this.keyStats[expected.toLowerCase()] ??= { hits: 0, misses: 0, totalMs: 0 });
    if (key === expected) {
      stat.hits++;
      stat.totalMs += now - (this.lastHitAt ?? now);
      this.lastHitAt = now;
      this.correct++;
      this.streak++;
      this.bestStreak = Math.max(this.bestStreak, this.streak);
      this.hitTimes.push(now);
      this.index++;
      this.missedCurrent = false;
      if (this.done) this.finishedAt = now;
      return { correct: true, expected, typed: key, finished: this.done, streak: this.streak };
    }
    if (!this.missedCurrent) stat.misses++;
    this.missedCurrent = true;
    this.missedAt.add(this.index);
    this.errors++;
    this.streak = 0;
    if (this.advanceOnError) {
      this.index++;
      this.missedCurrent = false;
      if (this.done) this.finishedAt = now;
    }
    return { correct: false, expected, typed: key, finished: this.done, streak: 0 };
  }

  elapsedMs(now: number = performance.now()): number {
    if (this.startedAt === null) return 0;
    return (this.finishedAt ?? now) - this.startedAt;
  }

  wpm(now: number = performance.now()): number {
    return computeWpm(this.correct, this.elapsedMs(now));
  }

  /** WPM over the last few seconds, so speed bursts feel immediate. */
  rollingWpm(now: number = performance.now(), windowMs = 4000): number {
    if (this.startedAt === null) return 0;
    const span = Math.min(windowMs, now - this.startedAt);
    if (span < 500) return 0;
    let count = 0;
    for (let i = this.hitTimes.length - 1; i >= 0 && now - this.hitTimes[i] <= windowMs; i--) count++;
    return computeWpm(count, span);
  }

  accuracy(): number {
    return computeAccuracy(this.correct, this.correct + this.errors);
  }

  summary(now: number = performance.now()): SessionSummary {
    return {
      wpm: this.wpm(now),
      accuracy: this.accuracy(),
      correct: this.correct,
      errors: this.errors,
      durationMs: this.elapsedMs(now),
      keyStats: this.keyStats,
    };
  }
}

/** Merge a session's per-key stats into a profile's running totals. */
export function mergeKeyStats(into: KeyStats, from: KeyStats): KeyStats {
  for (const [k, s] of Object.entries(from)) {
    const t = (into[k] ??= { hits: 0, misses: 0, totalMs: 0 });
    t.hits += s.hits;
    t.misses += s.misses;
    t.totalMs += s.totalMs;
  }
  return into;
}

/**
 * Keys ranked weakest first by error rate and slowness.
 * Keys with too few attempts are skipped, so one slip doesn't mark a key as weak.
 */
export function weakKeys(stats: KeyStats, allowed: string[], limit = 3): string[] {
  const scored = allowed
    .filter((k) => k !== ' ')
    .map((k) => {
      const s = stats[k];
      if (!s || s.hits + s.misses < 8) return { k, score: 0 };
      const errRate = s.misses / (s.hits + s.misses);
      const avgMs = s.hits ? s.totalMs / s.hits : 1000;
      return { k, score: errRate * 3 + Math.min(avgMs, 1500) / 1500 };
    })
    .filter((x) => x.score > 0.45)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((x) => x.k);
}
