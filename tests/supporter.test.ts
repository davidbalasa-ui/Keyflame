import { describe, expect, it } from 'vitest';
import { formatCode, grantSupporter, isSupporterCode, makeSupporterCode, normalizeCode, redeemSupporterCode } from '../src/game/supporter';
import { currentTitle } from '../src/game/achievements';
import { createProfile } from '../src/save/store';

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
    expect(normalizeCode('kf-o1l0')).toBe('0110');
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
