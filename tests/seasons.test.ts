import { describe, expect, it } from 'vitest';
import { SEASONS, challengeText, pastSeasons, seasonAt } from '../src/content/seasons';
import { REVIEWED_WORDS, hasBlockedRoot } from '../src/content/safety';
import { typableOnTouch } from '../src/content/keyboard';
import { ALL_TITLES, achievements, currentTitle } from '../src/game/achievements';
import { SEASON_PALETTE, TRIBES, dragonSvg, lookName, paletteFor, seededRandom } from '../src/game/dragons';
import { foundLooks } from '../src/game/collection';
import { hatchEgg } from '../src/game/progress';
import { CHALLENGE_EMBERS, noteSeasonLesson, noteSeasonRace, rollSeasonPalette, seasonChallenges, seasonPalette } from '../src/game/seasons';
import { createProfile } from '../src/save/store';

const at = (y: number, m: number, d = 15): Date => new Date(y, m - 1, d, 12);
const run = (correct = 100, accuracy = 0.96) => ({ wpm: 20, accuracy, correct, errors: 1, durationMs: 60000, keyStats: {} });
const words = (s: string): string[] => s.toLowerCase().split(/[^a-z]+/).filter(Boolean);

describe('season calendar', () => {
  it('has 36 seasons, one per month from November 2026 to October 2029', () => {
    expect(SEASONS).toHaveLength(36);
    let y = 2026;
    let m = 11;
    for (const s of SEASONS) {
      expect(s.id).toBe(`${y}-${String(m).padStart(2, '0')}`);
      // First and last day of the month, so time zones at the edges are covered.
      expect(seasonAt(at(y, m, 1))).toBe(s);
      expect(seasonAt(new Date(y, m, 0, 23, 59))).toBe(s);
      if (++m > 12) [m, y] = [1, y + 1];
    }
  });

  it('has no season before launch and starts over after October 2029', () => {
    expect(seasonAt(at(2026, 10, 31))).toBeNull();
    expect(seasonAt(at(2029, 11))).toBe(SEASONS[0]);
    expect(seasonAt(at(2032, 11))).toBe(SEASONS[0]);
    expect(seasonAt(at(2030, 2))?.name).toBe(SEASONS[3].name);
  });

  it('lists earlier seasons for the Starfall Vault', () => {
    expect(pastSeasons(at(2026, 10))).toEqual([]);
    expect(pastSeasons(at(2027, 1)).map((s) => s.id)).toEqual(['2027-01', '2026-12', '2026-11']);
    expect(pastSeasons(at(2035, 1))).toHaveLength(36);
  });
});

describe('season content', () => {
  it('uses only letters and spaces, so every name can be typed on the tap keyboard', () => {
    for (const s of SEASONS) {
      for (const text of [s.name, s.title, s.color.name]) expect(text, text).toMatch(/^[A-Za-z ]+$/);
      expect(s.idea, s.idea).toMatch(/^[A-Za-z ,.]+$/);
      for (const c of s.idea) expect(typableOnTouch(c), s.idea).toBe(true);
    }
  });

  it('is kid safe', () => {
    const all = SEASONS.flatMap((s) => [s.name, s.title, s.color.name, s.idea, ...s.challenges.map(([k, g]) => challengeText(k, g))]);
    const ok = REVIEWED_WORDS;
    for (const t of all) for (const w of words(t)) if (!ok.has(w)) expect(hasBlockedRoot(w), `${w} in ${t}`).toBe(false);
  });

  it('keeps names, titles and colors unique, and titles never clash with other titles', () => {
    for (const key of ['name', 'title'] as const) expect(new Set(SEASONS.map((s) => s[key])).size).toBe(36);
    expect(new Set(SEASONS.map((s) => s.color.name)).size).toBe(36);
    for (const s of SEASONS) expect(ALL_TITLES).not.toContain(s.title);
    for (const s of SEASONS) for (const t of Object.values(TRIBES)) expect(t.palettes.map((p) => p.name)).not.toContain(s.color.name);
  });

  it('keeps out names from other stories and holidays', () => {
    const banned = ['wings of fire', 'skywing', 'mudwing', 'seawing', 'rainwing', 'icewing', 'sandwing', 'nightwing', 'silkwing', 'hivewing', 'leafwing', 'misty mountain', 'starflight', 'christmas', 'halloween', 'easter', 'valentine', 'candle', 'clash', 'battle', 'war'];
    for (const s of SEASONS) for (const b of banned) expect(`${s.name} ${s.title} ${s.idea}`.toLowerCase(), s.name).not.toMatch(new RegExp(`\\b${b}\\b`));
  });

  it('has well formed colors and three different challenges each', () => {
    const hex = /^#[0-9a-f]{6}$/;
    for (const s of SEASONS) {
      for (const c of [...s.sky, s.color.body, s.color.belly, s.color.wing, s.color.accent]) expect(c).toMatch(hex);
      expect(s.challenges).toHaveLength(3);
      expect(new Set(s.challenges.map(([k]) => k)).size).toBe(3);
    }
  });
});

describe('season colors on dragons', () => {
  it('draws any tribe in a season color and names it', () => {
    const pal = seasonPalette(SEASONS[3]);
    expect(pal).toBe(SEASON_PALETTE + 3);
    expect(paletteFor('tidefin', pal).body).toBe(SEASONS[3].color.body);
    expect(dragonSvg('tidefin', pal)).toContain(SEASONS[3].color.body);
    expect(lookName('tidefin', pal, 1)).toBe(`Spotted ${SEASONS[3].color.name}`);
  });

  it('hatches this month color about one egg in four, and older ones now and then', () => {
    const rand = seededRandom(7);
    const now = at(2027, 6);
    const counts = new Map<number, number>();
    for (let i = 0; i < 4000; i++) {
      const r = rollSeasonPalette(now, rand);
      if (r !== null) counts.set(r, (counts.get(r) ?? 0) + 1);
    }
    const mine = counts.get(seasonPalette(seasonAt(now)!)) ?? 0;
    expect(mine).toBeGreaterThan(800);
    expect(mine).toBeLessThan(1200);
    const vault = [...counts.entries()].filter(([k]) => k !== seasonPalette(seasonAt(now)!)).reduce((n, [, v]) => n + v, 0);
    expect(vault).toBeGreaterThan(100);
    expect(vault).toBeLessThan(320);
    expect(rollSeasonPalette(at(2026, 10), rand)).toBeNull();
  });

  it('keeps season dragons out of the tribe sets', () => {
    const p = createProfile('Bright Comet');
    p.nest!.warmth = 9999;
    const d = hatchEgg(p, 'Ashclaw', () => 0.01, at(2027, 2))!;
    expect(d.palette).toBe(seasonPalette(SEASONS[3]));
    expect(foundLooks(p).size).toBe(0);
  });
});

describe('season challenges', () => {
  it('counts races, wins and days, and pays each challenge once', () => {
    const p = createProfile('Swift Flyer');
    const now = at(2026, 11, 2);
    const s = seasonAt(now)!;
    expect(s.challenges.map(([k]) => k)).toEqual(['races', 'keys', 'perfect']);
    const embers = p.embers;
    const first = noteSeasonRace(p, run(100, 1), 1, now);
    expect(first.map((c) => c.kind)).toEqual(['perfect']);
    expect(p.embers).toBe(embers + CHALLENGE_EMBERS);
    for (let i = 0; i < 3; i++) expect(noteSeasonRace(p, run(100, 0.9), 2, now)).toEqual([]);
    expect(noteSeasonRace(p, run(1700, 0.9), 2, now).map((c) => c.kind)).toEqual(['races', 'keys']);
    expect(p.embers).toBe(embers + 3 * CHALLENGE_EMBERS);
    expect(seasonChallenges(p, now).every((c) => c.done)).toBe(true);
    expect(noteSeasonRace(p, run(), 1, now)).toEqual([]);
  });

  it('earns the season title, which stays after the month ends', () => {
    const p = createProfile('Bold Racer');
    const now = at(2026, 11, 3);
    noteSeasonRace(p, run(2000, 1), 1, now);
    for (let i = 0; i < 4; i++) noteSeasonRace(p, run(), 1, now);
    const a = achievements(p, now).find((x) => x.id === 'season-2026-11')!;
    expect(a.earned).toBe(true);
    expect(a.title).toBe('Frost Flier');
    p.title = a.id;
    expect(currentTitle(p)).toBe('Frost Flier');
    expect(achievements(p, at(2027, 5)).find((x) => x.id === 'season-2026-11')?.earned).toBe(true);
  });

  it('lists only the current season and finished ones', () => {
    const p = createProfile('Quiet Scout');
    const ids = achievements(p, at(2027, 5)).filter((a) => a.track === 'season').map((a) => a.id);
    expect(ids).toEqual(['season-2027-05']);
    expect(achievements(p, at(2026, 10)).filter((a) => a.track === 'season')).toEqual([]);
  });

  it('counts lessons and different days, and starts fresh when a season comes back', () => {
    const p = createProfile('Gentle Keeper');
    const may = at(2027, 3, 1);
    expect(seasonAt(may)!.challenges.some(([k]) => k === 'lessons' || k === 'days')).toBe(true);
    noteSeasonLesson(p, run(), may);
    noteSeasonLesson(p, run(), at(2027, 3, 2));
    const log = p.seasonLog!['2027-03'];
    expect(log.lessons).toBe(2);
    expect(log.days).toBe(2);
    noteSeasonRace(p, run(), 1, at(2030, 3, 1));
    expect(p.seasonLog!['2030-03'].season).toBe('2027-03');
    expect(p.seasonLog!['2030-03'].races).toBe(1);
  });
});
