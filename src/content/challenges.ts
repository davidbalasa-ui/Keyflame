// Word challenges: something new after the 20 lessons (Astra review KF-12).
// Themed word packs, each with three levels: short words, longer words, then long words.
// Hand-written and kid-safe. Lowercase letters only, so every word types on the tap
// keyboard (no apostrophes, dashes, digits or quotes). Nothing scary or touchy.

import type { Lesson } from './lessons';

export type PackId = 'animals' | 'space' | 'ocean' | 'weather' | 'garden' | 'dragons';

export interface Pack {
  id: PackId;
  title: string;
  icon: string;
  /** Words for levels 1, 2 and 3. */
  words: [string[], string[], string[]];
}

const w = (s: string): string[] => s.trim().split(/\s+/);

export const PACKS: Pack[] = [
  {
    id: 'animals',
    title: 'Animals',
    icon: '🦊',
    words: [
      w('cat dog fox owl hen pig cow bat bee ant elk yak ram cub pup kit doe emu'),
      w('horse zebra tiger panda koala sloth otter camel moose goose eagle llama mouse sheep whale'),
      w('elephant giraffe penguin squirrel kangaroo hedgehog flamingo cheetah reindeer butterfly tortoise dolphin'),
    ],
  },
  {
    id: 'space',
    title: 'Space',
    icon: '🪐',
    words: [
      w('sun moon star sky ray orb dust glow dark far ring path orbit lunar mars'),
      w('comet rocket planet galaxy meteor crater saturn jupiter nebula cosmos launch shuttle'),
      w('astronaut telescope satellite spaceship universe asteroid starlight gravity mercury neptune'),
    ],
  },
  {
    id: 'ocean',
    title: 'Ocean',
    icon: '🐠',
    words: [
      w('sea wave sand reef fish crab seal shell kelp tide boat ship gull foam salt'),
      w('coral oyster lobster dolphin harbor island lagoon anchor octopus seahorse starfish'),
      w('submarine lighthouse jellyfish shipwreck sandcastle seashells underwater stingray'),
    ],
  },
  {
    id: 'weather',
    title: 'Weather',
    icon: '⛅',
    words: [
      w('rain snow wind hail fog mist sun warm cold cool damp gust dew ice'),
      w('cloudy sunny stormy breeze puddle drizzle thunder rainbow sleet frosty'),
      w('lightning snowflake hailstone raindrops whirlwind sunshine snowstorm temperature'),
    ],
  },
  {
    id: 'garden',
    title: 'Garden',
    icon: '🌻',
    words: [
      w('seed root leaf stem bud pea bean corn rose pot soil worm bug plant rake'),
      w('flower carrot tulip daisy pumpkin tomato garden sprout ladybug blossom potato'),
      w('sunflower vegetable watermelon greenhouse wheelbarrow strawberry dandelion butterfly'),
    ],
  },
  {
    id: 'dragons',
    title: 'Dragons',
    icon: '🐉',
    words: [
      w('egg nest wing tail claw fang horn fire cave gem gold scale roar soar glide'),
      w('dragon hatch ember flame sparks talon rider castle mountain treasure crystal'),
      w('hatchling firebreath wingspan dragonfly moonlight adventure lantern sunstone skyward'),
    ],
  },
];

export interface Challenge {
  id: string;
  pack: PackId;
  level: 1 | 2 | 3;
  title: string;
  /** WPM needed for the third star, like a lesson. */
  starWpm: number;
}

const LEVEL_NAMES = ['Short words', 'Longer words', 'Big words'] as const;
const LEVEL_WPM = [16, 14, 12];

export const CHALLENGES: Challenge[] = PACKS.flatMap((p) =>
  ([1, 2, 3] as const).map((level) => ({ id: `C-${p.id}-${level}`, pack: p.id, level, title: `${p.title}: ${LEVEL_NAMES[level - 1]}`, starWpm: LEVEL_WPM[level - 1] })),
);

export const packById = (id: PackId): Pack => PACKS.find((p) => p.id === id)!;
export const challengeById = (id: string): Challenge | undefined => CHALLENGES.find((c) => c.id === id);
export const levelName = (level: 1 | 2 | 3): string => LEVEL_NAMES[level - 1];

/** About 16 words from the pack's level, no word twice in a row and each word at most twice. */
export function buildChallengeText(c: Challenge, rand: () => number = Math.random): string {
  const pool = packById(c.pack).words[c.level - 1];
  const count = c.level === 3 ? 12 : 16;
  const out: string[] = [];
  let bag: string[] = [];
  while (out.length < count) {
    if (!bag.length) bag = [...pool].sort(() => rand() - 0.5);
    const next = bag.pop()!;
    if (next === out[out.length - 1]) continue;
    out.push(next);
  }
  return out.join(' ');
}

/** Lets a challenge use the lesson star rules (90% to pass, 95% for two, speed for three). */
export const asLesson = (c: Challenge): Lesson => ({ id: c.id, unit: 'sentences', title: c.title, newKeys: [], keys: [], kind: 'words', starWpm: c.starWpm });

/** A level opens once the level before it in the same pack is passed. */
export function challengeOpen(stars: Record<string, { stars: number }>, c: Challenge): boolean {
  return c.level === 1 || (stars[`C-${c.pack}-${c.level - 1}`]?.stars ?? 0) > 0;
}
