import { describe, expect, it } from 'vitest';
import { joinLink, parseJoin, planJoin } from '../src/game/wing';
import { createProfile } from '../src/save/store';

describe('wing join links', () => {
  it('round-trips a code and badge through the QR link', () => {
    const link = joinLink('BCDFGH', 7);
    expect(link).toBe('https://keyflame.org/?join=BCDFGH-7');
    expect(parseJoin(new URL(link).searchParams.get('join'))).toEqual({ code: 'BCDFGH', badge: 7 });
  });

  it('forgives case and spaces, and refuses anything that is not a code and badge', () => {
    expect(parseJoin('bcd fgh 12')).toEqual({ code: 'BCDFGH', badge: 12 });
    expect(parseJoin('BCDFGH-0')).toBeNull();
    expect(parseJoin('BCDFGH-100')).toBeNull();
    expect(parseJoin('BCD-4')).toBeNull();
    expect(parseJoin('<script>-4')).toBeNull();
    expect(parseJoin(null)).toBeNull();
  });
});

describe('who joins a wing', () => {
  const seat = { code: 'BCDFGH', badge: 3 };
  const rider = (name: string, code?: string, badge?: number) => Object.assign(createProfile(name), { classCode: code, classBadge: badge });

  it('switches to a rider on this device who already has that badge', () => {
    const mine = rider('Brave Comet', 'BCDFGH', 3);
    const guest = rider('Swift Ember');
    expect(planJoin([mine], guest, true, seat)).toEqual({ kind: 'switch', rider: mine });
    expect(planJoin([mine], mine, false, seat)).toEqual({ kind: 'attach' });
  });

  it('lets the guest join, and a saved rider with no wing join as themselves', () => {
    expect(planJoin([], rider('Swift Ember'), true, seat)).toEqual({ kind: 'guest' });
    const solo = rider('Lucky Scout');
    expect(planJoin([solo], solo, false, seat)).toEqual({ kind: 'attach' });
  });

  it('asks before moving a rider who belongs to another wing', () => {
    const other = rider('Quiet Falcon', 'KLMNPQ', 9);
    expect(planJoin([other], other, false, seat)).toEqual({ kind: 'ask' });
  });
});
