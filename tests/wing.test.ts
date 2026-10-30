import { describe, expect, it } from 'vitest';
import { cleanWingName, joinFromUrl, joinLink, parseJoin, planJoin, riderLabel } from '../src/game/wing';
import { BADGE_WORDS, badgeWord, normalizeWord, sha256Hex, wordIndex } from '../src/game/badgeWord';
import { grownUpYear } from '../src/game/gate';
import { createProfile } from '../src/save/store';

describe('wing join links', () => {
  it('round-trips code, badge, word and name after the # so they never reach a server', () => {
    const link = joinLink('BCDFGH', 7, 'FROG', 'Ava M');
    expect(link).toBe('https://keyflame.org/#join=BCDFGH-7-FROG&name=Ava+M');
    const url = new URL(link);
    expect(url.search).toBe('');
    expect(joinFromUrl(url)).toEqual({ code: 'BCDFGH', badge: 7, word: 'FROG', name: 'Ava M' });
  });

  it('still reads older cards with ?join=CODE-BADGE', () => {
    expect(joinFromUrl(new URL('https://keyflame.org/?join=BCDFGH-7'))).toEqual({ code: 'BCDFGH', badge: 7 });
    expect(joinFromUrl(new URL('https://keyflame.org/'))).toBeNull();
  });

  it('forgives case and spaces, and refuses anything that is not a code and badge', () => {
    expect(parseJoin('bcd fgh 12')).toEqual({ code: 'BCDFGH', badge: 12 });
    expect(parseJoin('bcdfgh-12-frog')).toEqual({ code: 'BCDFGH', badge: 12, word: 'FROG' });
    expect(parseJoin('BCDFGH-12-ZZZZ')).toEqual({ code: 'BCDFGH', badge: 12 });
    expect(parseJoin('BCDFGH-0')).toBeNull();
    expect(parseJoin('BCDFGH-100')).toBeNull();
    expect(parseJoin('BCD-4')).toBeNull();
    expect(parseJoin('<script>-4')).toBeNull();
    expect(parseJoin(null)).toBeNull();
  });

  it('keeps grown-up names to one plain line', () => {
    expect(cleanWingName('  Ava\n<b>M</b>  ')).toBe('Ava bM/b');
    expect(cleanWingName('x'.repeat(60)).length).toBe(40);
    expect(riderLabel({ name: 'Brave Comet', wingName: 'Ava' })).toBe('Ava');
    expect(riderLabel({ name: 'Brave Comet' })).toBe('Brave Comet');
  });
});

describe('badge words', () => {
  it('has 256 different short words a young reader can type', () => {
    expect(BADGE_WORDS.length).toBe(256);
    expect(new Set(BADGE_WORDS).size).toBe(256);
    for (const w of BADGE_WORDS) expect(w).toMatch(/^[A-Z]{3,5}$/);
  });

  it('hashes like everyone else does', async () => {
    const hex = async (s: string) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map((b) => b.toString(16).padStart(2, '0')).join('');
    for (const s of ['', 'abc', 'x'.repeat(130), 'héllo 7']) expect(sha256Hex(s)).toBe(await hex(s));
  });

  it('gives each badge a steady word from the teacher key', () => {
    const key = 'f'.repeat(32);
    expect(badgeWord(key, 3)).toBe(badgeWord(key, 3));
    const words = new Set(Array.from({ length: 30 }, (_, i) => badgeWord(key, i + 1)));
    expect(words.size).toBeGreaterThan(20);
    expect(wordIndex(' frog ')).toBe(BADGE_WORDS.indexOf('FROG'));
    expect(wordIndex('nope')).toBe(-1);
    expect(normalizeWord('fr-og!')).toBe('FROG');
  });
});

describe('who rides as a badge after joining', () => {
  const seat = { code: 'BCDFGH', badge: 3 };
  const rider = (name: string, code?: string, badge?: number) => Object.assign(createProfile(name), { classCode: code, classBadge: badge });

  it('switches to the rider on this device who already has that badge', () => {
    const mine = rider('Brave Comet', 'BCDFGH', 3);
    const guest = rider('Swift Ember');
    expect(planJoin([mine], guest, true, seat)).toEqual({ kind: 'switch', rider: mine });
    expect(planJoin([mine], mine, false, seat)).toEqual({ kind: 'same' });
  });

  it('lets the guest join, and asks a saved rider with no wing whether these are their dragons', () => {
    expect(planJoin([], rider('Swift Ember'), true, seat)).toEqual({ kind: 'guest' });
    const solo = rider('Lucky Scout');
    expect(planJoin([solo], solo, false, seat)).toEqual({ kind: 'ask' });
  });

  it('never hands a classmate’s nest to another badge', () => {
    const other = rider('Quiet Falcon', 'BCDFGH', 9);
    expect(planJoin([other], other, false, seat)).toEqual({ kind: 'new' });
    const otherWing = rider('Quiet Falcon', 'KLMNPQ', 3);
    expect(planJoin([otherWing], otherWing, false, seat)).toEqual({ kind: 'new' });
    // On a full shared iPad the guest of the visit may already be another kid's badge.
    const guestBadge = rider('Brave Rider', 'BCDFGH', 5);
    expect(planJoin([], guestBadge, true, seat)).toEqual({ kind: 'new' });
    expect(planJoin([], rider('Brave Rider', 'BCDFGH', 3), true, seat)).toEqual({ kind: 'same' });
  });
});

describe('grown-up check', () => {
  it('passes a birth year 18 or more years back', () => {
    const now = new Date(2026, 9, 30);
    expect(grownUpYear('1985', now)).toBe(true);
    expect(grownUpYear('2008', now)).toBe(true);
    expect(grownUpYear(' 2008 ', now)).toBe(true);
    expect(grownUpYear('2009', now)).toBe(false);
    expect(grownUpYear('2018', now)).toBe(false);
    expect(grownUpYear('1900', now)).toBe(false);
    expect(grownUpYear('85', now)).toBe(false);
    expect(grownUpYear('19850', now)).toBe(false);
    expect(grownUpYear('', now)).toBe(false);
  });
});
