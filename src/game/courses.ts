// Race courses on the campaign map. Each has a story rival with a fixed speed.

import type { TribeId } from './dragons';
import type { UnitId } from '../content/lessons';

export interface Course {
  id: string;
  name: string;
  blurb: string;
  /** Lesson unit that must be finished to fly here; null = open from the start. */
  unlockUnit: UnitId | null;
  rival: { name: string; tribe: TribeId; palette: number; wpm: number; taunt: string };
  sky: [string, string, string];
  ground: string;
  peak: string;
}

export const COURSES: Course[] = [
  {
    id: 'volcano',
    name: 'Volcano Canyon',
    blurb: 'Warm winds and glowing rocks. A good first flight.',
    unlockUnit: null,
    rival: { name: 'Cinderfang', tribe: 'emberback', palette: 1, wpm: 10, taunt: 'Think you can keep up with an Emberback?' },
    sky: ['#ff9966', '#ff5e62', '#6a3093'],
    ground: '#3b1f4f',
    peak: '#ffb347',
  },
  {
    id: 'reef',
    name: 'Reef Coast',
    blurb: 'Skim the waves past the coral towers.',
    unlockUnit: 'home',
    rival: { name: 'Brookdrift', tribe: 'tidefin', palette: 1, wpm: 15, taunt: 'The tide waits for no dragon!' },
    sky: ['#a1ffce', '#3bc9db', '#1c3a8a'],
    ground: '#0b4f6c',
    peak: '#e7f5ff',
  },
  {
    id: 'peaks',
    name: 'Cliff Peaks',
    blurb: 'Thunder rolls between the mountain tops.',
    unlockUnit: 'top',
    rival: { name: 'Sablestorm', tribe: 'stormcrest', palette: 0, wpm: 20, taunt: 'Fly into the storm with me, if you dare.' },
    sky: ['#d0bfff', '#7950f2', '#212a5c'],
    ground: '#2b2d52',
    peak: '#ffe066',
  },
  {
    id: 'forest',
    name: 'Deep Forest',
    blurb: 'Weave between ancient trees.',
    unlockUnit: 'bottom',
    rival: { name: 'Thistlefang', tribe: 'mossclaw', palette: 1, wpm: 25, taunt: 'I know every branch in these woods.' },
    sky: ['#d8f5a2', '#40c057', '#1e3a1e'],
    ground: '#173d1f',
    peak: '#c0eb75',
  },
  {
    id: 'night',
    name: 'Starfall Caves',
    blurb: 'Race by starlight through the glowing caves.',
    unlockUnit: 'sentences',
    rival: { name: 'Nightwhisper', tribe: 'shadeglide', palette: 0, wpm: 30, taunt: 'Only the steadiest claws find the way out.' },
    sky: ['#5f3dc4', '#25235a', '#0b0b1f'],
    ground: '#14123a',
    peak: '#a5d8ff',
  },
];

export function courseById(id: string): Course {
  return COURSES.find((c) => c.id === id) ?? COURSES[0];
}
