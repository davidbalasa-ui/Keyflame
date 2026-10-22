// Race scoring: how keystrokes and tribe perks move your dragon.
// A dragon's position is (correct keys + bonus) / text length.

import type { KeystrokeResult } from '../engine/typing';
import type { TribeId } from './dragons';

export interface PerkTuning {
  /** Correct keys in a row that fill the flame meter. */
  dashStreak: number;
  /** Characters of distance a flame dash adds. */
  dashBonus: number;
  /** Characters of distance a typo costs. */
  typoCost: number;
  /** Bonus for finishing a word of 6+ letters. */
  longWordBonus: number;
  /** Bonus for finishing a word with no mistakes. */
  cleanWordBonus: number;
  /** Extra distance per correct key in the last fifth of the race. */
  sprintBonus: number;
  /** Share of the flame meter kept after a typo. */
  meterKeptOnTypo: number;
}

export function perkTuning(tribe: TribeId | null): PerkTuning {
  return {
    dashStreak: tribe === 'emberback' ? 16 : 20,
    dashBonus: tribe === 'stormcrest' ? 9 : 6,
    typoCost: tribe === 'tidefin' ? 0.4 : 1,
    longWordBonus: tribe === 'mossclaw' ? 1 : 0,
    cleanWordBonus: tribe === 'frostspine' ? 0.5 : 0,
    sprintBonus: tribe === 'duneskimmer' ? 0.25 : 0,
    meterKeptOnTypo: tribe === 'shadeglide' ? 0.5 : 0,
  };
}

export interface RaceState {
  bonus: number;
  meter: number;
  wordLen: number;
  wordClean: boolean;
}

export function newRaceState(): RaceState {
  return { bonus: 0, meter: 0, wordLen: 0, wordClean: true };
}

/** Applies one keystroke. Returns true when it triggered a flame dash. */
export function applyRaceKey(st: RaceState, r: KeystrokeResult, tune: PerkTuning, progress: number): boolean {
  if (!r.correct) {
    st.bonus -= tune.typoCost;
    st.meter = Math.floor(st.meter * tune.meterKeptOnTypo);
    st.wordClean = false;
    return false;
  }
  if (progress >= 0.8) st.bonus += tune.sprintBonus;
  if (r.expected === ' ') {
    if (st.wordLen >= 6) st.bonus += tune.longWordBonus;
    if (st.wordClean && st.wordLen > 0) st.bonus += tune.cleanWordBonus;
    st.wordLen = 0;
    st.wordClean = true;
  } else st.wordLen++;
  st.meter++;
  if (st.meter >= tune.dashStreak) {
    st.meter = 0;
    st.bonus += tune.dashBonus;
    return true;
  }
  return false;
}

/** Milliseconds a racer at `wpm` needs to cover `length` characters. */
export function finishTime(wpm: number, length: number): number {
  return length / ((Math.max(wpm, 0.1) * 5) / 60000);
}
