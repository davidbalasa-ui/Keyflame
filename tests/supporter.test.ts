import { describe, expect, it } from 'vitest';
import { formatCode, grantSupporter, isSupporterCode, makeSupporterCode, normalizeCode, redeemSupporterCode } from '../src/game/supporter';
import { achievements, currentTitle } from '../src/game/achievements';
import { STARGLINT_ID, createProfile, isStarglint, normalizeProfile, type Profile } from '../src/save/store';
import { lookHolder, perkTribe } from '../src/game/progress';
import { perkTuning } from '../src/game/raceRules';
import { canBuyEgg, foundLooks } from '../src/game/collection';

describe('supporter codes', () => {
  it('makes codes that check out', () => {
    for (let i = 0; i < 200; i++) {
      const c = makeSupporterCode();
      expect(c).toMatch(/^KF-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/);
      expect(isSupporterCode(c)).toBe(true);
    }
  });

  it('never starts a code with KF, which reads as the prefix', () => {
    const picks = [19, 15, 0, 0, 0, 0, 0, 0]; // K, F, ... in the code alphabet
    const c = makeSupporterCode(() => (picks.length ? picks.shift()! : 1) / 32);
    expect(c).toMatch(/^KF-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/);
    expect(c.startsWith('KF-KF')).toBe(false);
    expect(isSupporterCode(c)).toBe(true);
  });

  it('forgives case, spaces and look-alike letters', () => {
    const c = makeSupporterCode(() => 0.5);
    expect(isSupporterCode(c.toLowerCase().replace(/-/g, ' '))).toBe(true);
    expect(normalizeCode('o1l0')).toBe('0110');
    expect(normalizeCode('kf-0000-0000-0000')).toBe('000000000000');
    expect(formatCode(normalizeCode(c))).toBe(c);
  });

  it('rejects typos and made-up codes', () => {
    const c = normalizeCode(makeSupporterCode(() => 0.3));
    const swapped = c.slice(0, 2) + (c[2] === 'A' ? 'B' : 'A') + c.slice(3);
    expect(isSupporterCode(swapped)).toBe(false);
    expect(isSupporterCode('KF-AAAA-AAAA-AAAA')).toBe(false);
    expect(isSupporterCode('hello')).toBe(false);
    // About 1 in a million random codes pass the 20-bit check.
    let passed = 0;
    for (let i = 0; i < 5000; i++) if (isSupporterCode(Array.from({ length: 12 }, () => '0123456789ABCDEFGHJKMNPQRSTVWXYZ'[Math.floor(Math.random() * 32)]).join(''))) passed++;
    expect(passed).toBeLessThan(3);
  });

  it('unlocks the pack and the supporter title', () => {
    const p = createProfile('Brave Comet');
    expect(redeemSupporterCode(p, 'KF-AAAA-AAAA-AAAA')).toBe(false);
    expect(p.supporter).toBe(false);
    p.title = 'supporter';
    expect(currentTitle(p)).toBeNull();
    expect(redeemSupporterCode(p, makeSupporterCode())).toBe(true);
    expect(p.supporter).toBe(true);
    expect(currentTitle(p)).toBe('Keyflame Supporter');
  });

  it('gives a code after checkout and keeps it', () => {
    const p = createProfile('Brave Comet');
    const code = grantSupporter(p);
    expect(isSupporterCode(code)).toBe(true);
    expect(grantSupporter(p)).toBe(code);
  });
});

describe('Starglint dragon', () => {
  const load = (p: Profile): Profile => normalizeProfile(JSON.parse(JSON.stringify(p)))!;

  it('takes the skin off old dragons and gives a supporter their own Starglint', () => {
    const p = createProfile('Ria');
    p.supporter = true;
    p.dragons = [
      { id: 'd1', tribe: 'emberback', palette: 0, name: 'Ash', xp: 500, hatchedAt: 0, skin: 'starfire' as never },
      { id: 'd2', tribe: 'mossclaw', palette: 1, name: 'Fern', xp: 0, hatchedAt: 0, skin: 'starglint' },
    ];
    p.activeDragonId = 'd1';
    const q = load(p);
    expect(q.dragons.filter((d) => d.skin).map((d) => d.id)).toEqual([STARGLINT_ID]);
    expect(q.dragons.find((d) => d.id === 'd1')!.xp).toBe(500);
    // The rider was flying in the skin, so they keep flying Starglint.
    expect(q.activeDragonId).toBe(STARGLINT_ID);
    expect(q.dragons.find(isStarglint)!.xp).toBe(500);
    expect(load(q).dragons.filter(isStarglint)).toHaveLength(1);
  });

  it('leaves non-supporters without one, and a rider not wearing the skin keeps their dragon', () => {
    const p = createProfile('Ria');
    p.dragons = [{ id: 'd1', tribe: 'emberback', palette: 0, name: 'Ash', xp: 0, hatchedAt: 0 }];
    p.activeDragonId = 'd1';
    expect(load(p).dragons).toHaveLength(1);
    p.supporter = true;
    const q = load(p);
    expect(q.dragons.some(isStarglint)).toBe(true);
    expect(q.activeDragonId).toBe('d1');
  });

  it('arrives with the pack, once', () => {
    const p = createProfile('Ria');
    grantSupporter(p);
    grantSupporter(p);
    expect(p.dragons.filter(isStarglint)).toHaveLength(1);
    const r = createProfile('Bo');
    expect(redeemSupporterCode(r, makeSupporterCode())).toBe(true);
    expect(r.dragons.filter(isStarglint)).toHaveLength(1);
  });

  it('has no perk and counts toward no tribe, set or goal', () => {
    const p = createProfile('Ria');
    grantSupporter(p);
    const d = p.dragons[0];
    expect(perkTribe(d)).toBeNull();
    expect(perkTuning(perkTribe(d))).toEqual(perkTuning(null));
    expect(foundLooks(p).size).toBe(0);
    expect(lookHolder(p, d.tribe, d.palette, d.marking ?? 0)).toBeNull();
    expect(canBuyEgg(p, d.tribe)).toBe('unknown');
    expect(achievements(p).filter((a) => ['hatch', 'tribes', 'grown'].includes(a.track)).every((a) => a.value === 0)).toBe(true);
  });
});
