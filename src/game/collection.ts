// The Codex collection: every tribe comes in 4 colors and 3 markings, 12 looks each.
// Finishing a set pays embers once. More eggs of a tribe you have met cost embers,
// which are only ever earned by typing.

import type { Profile } from '../save/store';
import { giveEgg, tribeMaxed } from './progress';
import { MARKINGS, TRIBES, isSeasonPalette, type TribeId } from './dragons';

export const LOOKS_PER_TRIBE = 4 * MARKINGS.length;
export const TOTAL_LOOKS = Object.keys(TRIBES).length * LOOKS_PER_TRIBE;

export const EGG_PRICE = 150;
/** Bought eggs wait in the basket; this keeps it from filling up. */
export const MAX_BASKET = 3;

export const lookKey = (tribe: TribeId, palette: number, marking = 0): string => `${tribe}:${palette}:${marking}`;

export function foundLooks(p: Profile): Map<string, number> {
  const found = new Map<string, number>();
  for (const d of p.dragons) {
    // Season colors have their own page in the Codex and do not count toward tribe sets.
    if (isSeasonPalette(d.palette)) continue;
    const k = lookKey(d.tribe, d.palette, d.marking ?? 0);
    found.set(k, (found.get(k) ?? 0) + 1);
  }
  return found;
}

export interface CodexSet {
  id: string;
  tribe: TribeId;
  label: string;
  embers: number;
  have: number;
  need: number;
  done: boolean;
  claimed: boolean;
}

export function codexSets(p: Profile): CodexSet[] {
  const found = foundLooks(p);
  const claimed = new Set(p.setsClaimed);
  return (Object.keys(TRIBES) as TribeId[]).flatMap((tribe) => {
    const colors = new Set(p.dragons.filter((d) => d.tribe === tribe && !isSeasonPalette(d.palette)).map((d) => d.palette)).size;
    const looks = [...found.keys()].filter((k) => k.startsWith(tribe + ':')).length;
    const make = (kind: string, label: string, have: number, need: number, embers: number): CodexSet => {
      const id = `${tribe}-${kind}`;
      return { id, tribe, label, embers, have: Math.min(have, need), need, done: have >= need, claimed: claimed.has(id) };
    };
    return [make('colors', 'Every color', colors, TRIBES[tribe].palettes.length, 60), make('looks', 'Every look', looks, LOOKS_PER_TRIBE, 200)];
  });
}

/** Pays out any sets finished since last time. */
export function claimSets(p: Profile): CodexSet[] {
  const fresh = codexSets(p).filter((s) => s.done && !s.claimed);
  for (const s of fresh) {
    p.setsClaimed.push(s.id);
    p.embers += s.embers;
    p.totals.embersEarned += s.embers;
  }
  return fresh;
}

/** Tribes whose eggs can be bought: ones the player has already hatched. */
export function canBuyEgg(p: Profile, tribe: TribeId): 'ok' | 'unknown' | 'embers' | 'full' | 'maxed' {
  if (!p.dragons.some((d) => d.tribe === tribe)) return 'unknown';
  if (tribeMaxed(p, tribe)) return 'maxed';
  if (p.nest && p.basket.length >= MAX_BASKET) return 'full';
  if (p.embers < EGG_PRICE) return 'embers';
  return 'ok';
}

export function buyEgg(p: Profile, tribe: TribeId): boolean {
  if (canBuyEgg(p, tribe) !== 'ok') return false;
  p.embers -= EGG_PRICE;
  giveEgg(p, tribe);
  return true;
}
