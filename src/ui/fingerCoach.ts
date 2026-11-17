// A picture of two hands with the finger to use lifting and tapping, for kids who can't
// read the finger hint yet (KF-24). Fingers wear the same colours as their keys.
import type { Finger } from '../content/keyboard';

const COLOR: Record<Finger, string> = {
  'left-pinky': '#ff9eb5',
  'left-ring': '#ffc078',
  'left-middle': '#ffe066',
  'left-index': '#8ce99a',
  thumb: '#e5dbff',
  'right-index': '#74c0fc',
  'right-middle': '#b197fc',
  'right-ring': '#f783ac',
  'right-pinky': '#ffa94d',
};

// Finger x, top y and length on a 60-wide hand, pinky first (left hand).
const FINGERS: Array<[number, number, number]> = [
  [8, 22, 20],
  [20, 12, 28],
  [32, 8, 32],
  [44, 12, 28],
];

/** on: the finger to tap. thumbs: which thumbs tap (touch typing, or space on a keyboard). */
export function handsSvg(on: Finger | null, thumbs: 'left' | 'right' | 'either' | null = null): string {
  const hand = (side: 'left' | 'right', dx: number): string => {
    const names: Finger[] = side === 'left' ? ['left-pinky', 'left-ring', 'left-middle', 'left-index'] : ['right-pinky', 'right-ring', 'right-middle', 'right-index'];
    const thumbOn = thumbs === 'either' || thumbs === side;
    const parts = FINGERS.map(([x, y, len], i) => {
      const f = names[i];
      const fx = side === 'left' ? x : 60 - x - 9;
      const active = f === on;
      return `<rect class="cf${active ? ' on' : ''}" x="${dx + fx}" y="${y}" width="9" height="${len + 10}" rx="4.5" fill="${COLOR[f]}"/>`;
    });
    const tx = side === 'left' ? dx + 50 : dx + 1;
    parts.push(`<rect class="cf thumb${thumbOn ? ' on' : ''}" x="${tx}" y="34" width="9" height="20" rx="4.5" fill="${COLOR.thumb}" transform="rotate(${side === 'left' ? 30 : -30} ${tx + 4.5} 44)"/>`);
    // The palm.
    parts.push(`<rect x="${dx + 6}" y="36" width="48" height="26" rx="12" fill="#f3d9c4"/>`);
    return parts.join('');
  };
  return `<svg viewBox="0 0 136 66" aria-hidden="true">${hand('left', 4)}${hand('right', 72)}</svg>`;
}
