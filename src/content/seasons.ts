// Monthly seasons, all 36 built ahead of time (January 2027 to December 2029) so they
// never need upkeep. The game picks one from the date; after December 2029 the list
// starts over, so every season comes back in the same month later on. Seasons start
// on January 1 so every rider can join the first one from its first day.
// Themes were drafted with help from DeepSeek, then audited by hand: original names
// only, no holidays, nothing scary, and only letters and spaces so every name can be typed.

export type ChallengeKind = 'races' | 'wins' | 'clean' | 'perfect' | 'keys' | 'days' | 'lessons';

export interface SeasonColor {
  name: string;
  body: string;
  belly: string;
  wing: string;
  accent: string;
}

export interface Season {
  /** The month it first runs, as YYYY-MM. */
  id: string;
  name: string;
  idea: string;
  /** Title earned by finishing all three challenges. */
  title: string;
  /** Race sky gradient, top to bottom. */
  sky: [string, string, string];
  /** A dragon color that can hatch while the season is on. */
  color: SeasonColor;
  challenges: Array<[ChallengeKind, number]>;
}

export const SEASONS: Season[] = [
  { id: '2027-01', name: 'Ice Cave Glide', idea: 'Zoom through glittering ice caves lit by frozen waterfalls.', title: 'Ice Cave Explorer',
    sky: ['#0e3b5c', '#3d8fbf', '#bfe6f5'],
    color: { name: 'Ice Blue', body: '#74c0fc', belly: '#e7f5ff', wing: '#1c7ed6', accent: '#e599f7' },
    challenges: [['clean', 2], ['lessons', 4], ['wins', 4]] },
  { id: '2027-02', name: 'Aurora Dash', idea: 'Chase the shimmering northern lights across the winter sky.', title: 'Aurora Chaser',
    sky: ['#071a2b', '#1b6b5a', '#7b4fc9'],
    color: { name: 'Emerald', body: '#12b886', belly: '#c3fae8', wing: '#087f5b', accent: '#d0bfff' },
    challenges: [['keys', 1500], ['perfect', 1], ['clean', 4]] },
  { id: '2027-03', name: 'Blossom Breeze Race', idea: 'Fly through swirling petals as spring blossoms burst open.', title: 'Blossom Rider',
    sky: ['#a5d8ff', '#fcc2d7', '#f783ac'],
    color: { name: 'Petal Pink', body: '#f783ac', belly: '#fff0f6', wing: '#d6336c', accent: '#fff3bf' },
    challenges: [['days', 3], ['races', 6], ['keys', 2500]] },
  { id: '2027-04', name: 'Rainbow Rally', idea: 'Dart through arches of rainbow light after a spring shower.', title: 'Rainbow Racer',
    sky: ['#4dabf7', '#91d5ff', '#ffe3a3'],
    color: { name: 'Rainbow Opal', body: '#9be7e0', belly: '#fff4e6', wing: '#b197fc', accent: '#ff8787' },
    challenges: [['lessons', 3], ['wins', 3], ['days', 5]] },
  { id: '2027-05', name: 'Meadowlark Sprint', idea: 'Race alongside singing meadowlarks over fields of wildflowers.', title: 'Meadowlark Buddy',
    sky: ['#74c0fc', '#a5d8ff', '#fff3bf'],
    color: { name: 'Sunshine Yellow', body: '#fcc419', belly: '#fff9db', wing: '#e67700', accent: '#4dabf7' },
    challenges: [['perfect', 1], ['clean', 3], ['lessons', 5]] },
  { id: '2027-06', name: 'Firefly Flight', idea: 'Glide through warm evening air twinkling with fireflies.', title: 'Firefly Friend',
    sky: ['#1b1446', '#4c2f7a', '#b35f8a'],
    color: { name: 'Firefly Gold', body: '#e0a800', belly: '#fff1b8', wing: '#9c6b00', accent: '#d8f5a2' },
    challenges: [['races', 6], ['keys', 2500], ['perfect', 1]] },
  { id: '2027-07', name: 'Thunderhead Chase', idea: 'Speed past distant thunderclouds as they rumble softly.', title: 'Thunder Chaser',
    sky: ['#3d4a5c', '#6c7a8f', '#c9d3df'],
    color: { name: 'Storm Grey', body: '#5c6773', belly: '#ced4da', wing: '#2f3640', accent: '#ffd43b' },
    challenges: [['wins', 3], ['days', 5], ['races', 10]] },
  { id: '2027-08', name: 'Shooting Star Sprint', idea: 'Race across the sky as shooting stars streak by.', title: 'Shooting Star Chaser',
    sky: ['#050b2b', '#1c2a6b', '#4b3d8f'],
    color: { name: 'Meteor Copper', body: '#b8622e', belly: '#ffd8a8', wing: '#7a3a14', accent: '#ffe066' },
    challenges: [['clean', 3], ['lessons', 5], ['wins', 2]] },
  { id: '2027-09', name: 'Harvest Moon Glide', idea: 'Soar under the glowing harvest moon and golden fields.', title: 'Harvest Moon Glider',
    sky: ['#1f2350', '#8a4b6e', '#f59f45'],
    color: { name: 'Harvest Orange', body: '#f76707', belly: '#ffe8cc', wing: '#c2410c', accent: '#fff3bf' },
    challenges: [['keys', 2000], ['perfect', 1], ['clean', 2]] },
  { id: '2027-10', name: 'Crimson Leaf Run', idea: 'Dash through swirling red and gold leaves on a crisp wind.', title: 'Crimson Leaf Runner',
    sky: ['#4dabf7', '#a5d8ff', '#ffd8a8'],
    color: { name: 'Crimson', body: '#c92a2a', belly: '#ffc9c9', wing: '#862121', accent: '#fab005' },
    challenges: [['days', 4], ['races', 8], ['keys', 3000]] },
  { id: '2027-11', name: 'Flock Flight', idea: 'Follow flocks of birds as they fly south over tall, cool mountain peaks.', title: 'Flock Follower',
    sky: ['#5a6b7d', '#9aa8b6', '#dde3ea'],
    color: { name: 'Mist Grey', body: '#8b95a1', belly: '#e9ecef', wing: '#4f5964', accent: '#ff922b' },
    challenges: [['lessons', 4], ['wins', 4], ['days', 3]] },
  { id: '2027-12', name: 'Snowflake Swirl', idea: 'Twirl through gently falling snowflakes in a quiet sky.', title: 'Snowflake Swirler',
    sky: ['#3b5bdb', '#91a7ff', '#e7f0ff'],
    color: { name: 'Snow White', body: '#f1f3f5', belly: '#ffffff', wing: '#a5b4c8', accent: '#4dabf7' },
    challenges: [['perfect', 1], ['clean', 4], ['lessons', 3]] },
  { id: '2028-01', name: 'Frozen Waterfall Waltz', idea: 'Glide past towering frozen waterfalls sparkling in the sun.', title: 'Frozen Falls Dancer',
    sky: ['#1864ab', '#4dabf7', '#d0ebff'],
    color: { name: 'Glacier Blue', body: '#8ecae6', belly: '#e3fafc', wing: '#2b7a9b', accent: '#364fc7' },
    challenges: [['races', 8], ['keys', 3000], ['perfect', 1]] },
  { id: '2028-02', name: 'Frozen Lake Skate', idea: 'Glide and spin across a frozen lake that shines like glass.', title: 'Frozen Lake Skater',
    sky: ['#5f3dc4', '#b197fc', '#edf2ff'],
    color: { name: 'Skate Lilac', body: '#c0a6e8', belly: '#f3f0ff', wing: '#7048e8', accent: '#63e6be' },
    challenges: [['wins', 4], ['days', 3], ['races', 5]] },
  { id: '2028-03', name: 'Maple Sap Sprint', idea: 'Zoom through maple groves as sweet sap begins to flow.', title: 'Maple Sap Sprinter',
    sky: ['#74c0fc', '#a5d8ff', '#e6fcf5'],
    color: { name: 'Maple Red', body: '#b2401b', belly: '#ffd8a8', wing: '#7a2510', accent: '#ffa94d' },
    challenges: [['clean', 4], ['lessons', 3], ['wins', 3]] },
  { id: '2028-04', name: 'Tulip Trail Dash', idea: 'Speed along winding trails lined with blooming tulips.', title: 'Tulip Trail Dasher',
    sky: ['#4dabf7', '#99e9f2', '#fff0f6'],
    color: { name: 'Tulip Magenta', body: '#c2255c', belly: '#ffdeeb', wing: '#8a1240', accent: '#ffd43b' },
    challenges: [['keys', 2500], ['perfect', 1], ['clean', 3]] },
  { id: '2028-05', name: 'Bluebell Breeze', idea: 'Sail on a breeze through carpets of bluebells in the woods.', title: 'Bluebell Glider',
    sky: ['#91a7ff', '#bac8ff', '#d3f9d8'],
    color: { name: 'Bluebell Blue', body: '#4c6ef5', belly: '#dbe4ff', wing: '#364fc7', accent: '#ffe066' },
    challenges: [['days', 5], ['races', 10], ['keys', 1500]] },
  { id: '2028-06', name: 'Sunflower Skyrace', idea: 'Race above fields of sunflowers turning to face the sun.', title: 'Sunflower Skyracer',
    sky: ['#1c7ed6', '#74c0fc', '#fff3bf'],
    color: { name: 'Sunflower Yellow', body: '#fab005', belly: '#fff3bf', wing: '#5c3d1e', accent: '#2f9e44' },
    challenges: [['lessons', 5], ['wins', 2], ['days', 4]] },
  { id: '2028-07', name: 'Coral Reef Rush', idea: 'Dive and dash over colorful coral reefs in clear water.', title: 'Coral Reef Rusher',
    sky: ['#0c8599', '#22b8cf', '#99e9f2'],
    color: { name: 'Coral Pink', body: '#ff8a65', belly: '#ffe0d1', wing: '#e8590c', accent: '#20c997' },
    challenges: [['perfect', 1], ['clean', 2], ['lessons', 4]] },
  { id: '2028-08', name: 'Tide Pool Tumble', idea: 'Skim over sparkling tide pools full of tiny sea creatures.', title: 'Tide Pool Tumbler',
    sky: ['#1098ad', '#66d9e8', '#c5f6fa'],
    color: { name: 'Aquamarine', body: '#63e6be', belly: '#e6fcf5', wing: '#0ca678', accent: '#ff8787' },
    challenges: [['races', 10], ['keys', 1500], ['perfect', 1]] },
  { id: '2028-09', name: 'Whale Song Sail', idea: 'Glide alongside singing whales on their long ocean journey.', title: 'Whale Song Sailor',
    sky: ['#0b2447', '#19376d', '#576cbc'],
    color: { name: 'Ocean Blue', body: '#1c5d99', belly: '#a5d8ff', wing: '#0b3866', accent: '#96f2d7' },
    challenges: [['wins', 2], ['days', 4], ['races', 6]] },
  { id: '2028-10', name: 'Pumpkin Patch Glide', idea: 'Swoop low over a pumpkin patch glowing in the autumn sun.', title: 'Pumpkin Patch Glider',
    sky: ['#f08c00', '#ffa94d', '#ffe8cc'],
    color: { name: 'Pumpkin Orange', body: '#fd7e14', belly: '#fff4e6', wing: '#2b8a3e', accent: '#ffd43b' },
    challenges: [['clean', 2], ['lessons', 4], ['wins', 4]] },
  { id: '2028-11', name: 'Frosty Fern Flight', idea: 'Race through ferns laced with delicate morning frost.', title: 'Frosty Fern Flier',
    sky: ['#495a6b', '#8fa3b5', '#e3ecf2'],
    color: { name: 'Frost Silver', body: '#c8d6dc', belly: '#f8f9fa', wing: '#6f8a95', accent: '#69db7c' },
    challenges: [['keys', 3000], ['perfect', 1], ['clean', 4]] },
  { id: '2028-12', name: 'Hot Spring Hollow', idea: 'Fly through warm clouds of steam rising from bubbling hot springs.', title: 'Hot Spring Hopper',
    sky: ['#3d5a80', '#98c1d9', '#e0fbfc'],
    color: { name: 'Geyser Teal', body: '#1aa3a3', belly: '#d3f9f5', wing: '#0b6e6e', accent: '#ffa94d' },
    challenges: [['days', 3], ['races', 5], ['keys', 2000]] },
  { id: '2029-01', name: 'Iceberg Alley Dash', idea: 'Weave between sparkling icebergs in a calm frozen sea.', title: 'Iceberg Dasher',
    sky: ['#0b4f6c', '#4a9cc4', '#dff3fb'],
    color: { name: 'Sapphire', body: '#1b3fae', belly: '#b6c8ff', wing: '#0f2470', accent: '#e7f5ff' },
    challenges: [['lessons', 3], ['wins', 3], ['days', 5]] },
  { id: '2029-02', name: 'Snowy Owl Soar', idea: 'Soar with silent snowy owls over moonlit snowfields.', title: 'Snowy Owl Soarer',
    sky: ['#10153d', '#2e3a78', '#6b7bbd'],
    color: { name: 'Moonlight White', body: '#edf2ff', belly: '#ffffff', wing: '#9aa5c8', accent: '#ffd43b' },
    challenges: [['perfect', 1], ['clean', 3], ['lessons', 5]] },
  { id: '2029-03', name: 'Crocus Creek Run', idea: 'Dash along a creek where early crocuses peek through snow.', title: 'Crocus Creek Runner',
    sky: ['#74c0fc', '#b4e0fa', '#f3f0ff'],
    color: { name: 'Crocus Purple', body: '#845ef7', belly: '#e5dbff', wing: '#5f3dc4', accent: '#ffd43b' },
    challenges: [['races', 5], ['keys', 2000], ['perfect', 1]] },
  { id: '2029-04', name: 'Cherry Blossom Chase', idea: 'Chase swirling cherry blossom petals on a gentle spring wind.', title: 'Cherry Blossom Chaser',
    sky: ['#a5d8ff', '#fcc2d7', '#fff0f6'],
    color: { name: 'Cherry Blossom Pink', body: '#ffb3c7', belly: '#fff5f8', wing: '#e64980', accent: '#845ef7' },
    challenges: [['wins', 3], ['days', 5], ['races', 8]] },
  { id: '2029-05', name: 'Dandelion Drift', idea: 'Drift through air filled with floating dandelion seeds.', title: 'Dandelion Drifter',
    sky: ['#4dabf7', '#a5d8ff', '#ebfbee'],
    color: { name: 'Dandelion Gold', body: '#ffd43b', belly: '#fffbe6', wing: '#94d82d', accent: '#ffffff' },
    challenges: [['clean', 3], ['lessons', 5], ['wins', 2]] },
  { id: '2029-06', name: 'Giant Forest Flight', idea: 'Weave between the tallest trees on Earth in a cool green forest.', title: 'Giant Forest Flier',
    sky: ['#2b8a3e', '#69a86f', '#d8f5a2'],
    color: { name: 'Forest Green', body: '#2b6e3a', belly: '#b2f2bb', wing: '#173d22', accent: '#ffa94d' },
    challenges: [['keys', 1500], ['perfect', 1], ['clean', 2]] },
  { id: '2029-07', name: 'Volcano Glow Glide', idea: 'Soar past a sleepy volcano glowing softly in the warm night.', title: 'Volcano Glow Glider',
    sky: ['#1a0b2e', '#5c1f3a', '#e8590c'],
    color: { name: 'Obsidian Black', body: '#1f1f29', belly: '#4a4a5c', wing: '#0d0d14', accent: '#ff6b35' },
    challenges: [['days', 4], ['races', 6], ['keys', 2500]] },
  { id: '2029-08', name: 'Desert Sunset Dash', idea: 'Race across red rock and sand as the desert sun goes down.', title: 'Desert Sunset Dasher',
    sky: ['#3b2a6b', '#d9486a', '#ffb070'],
    color: { name: 'Sunset Rose', body: '#e8738a', belly: '#ffe0e6', wing: '#a8324a', accent: '#ffd43b' },
    challenges: [['lessons', 4], ['wins', 4], ['days', 3]] },
  { id: '2029-09', name: 'Apple Harvest Hustle', idea: 'Hustle through orchards heavy with ripe red apples.', title: 'Apple Picker',
    sky: ['#4dabf7', '#a5d8ff', '#d8f5a2'],
    color: { name: 'Apple Red', body: '#e03131', belly: '#ffe3e3', wing: '#2b8a3e', accent: '#ffe066' },
    challenges: [['perfect', 1], ['clean', 4], ['lessons', 3]] },
  { id: '2029-10', name: 'Canyon Color Cruise', idea: 'Cruise through a canyon painted with autumn colors.', title: 'Canyon Cruiser',
    sky: ['#c2410c', '#f08c00', '#ffd8a8'],
    color: { name: 'Canyon Gold', body: '#d9a32b', belly: '#fff3d6', wing: '#8a4f14', accent: '#e8590c' },
    challenges: [['races', 6], ['keys', 2500], ['perfect', 1]] },
  { id: '2029-11', name: 'First Frost Flight', idea: 'Race through crisp air as the first frost sparkles on the ground.', title: 'Frost Flier',
    sky: ['#2b3a67', '#7d8fb3', '#d6e0f0'],
    color: { name: 'Silver', body: '#aeb8c4', belly: '#eef2f6', wing: '#6b7785', accent: '#74c0fc' },
    challenges: [['races', 5], ['keys', 2000], ['perfect', 1]] },
  { id: '2029-12', name: 'Winter Star Summit', idea: 'Soar among the brightest stars of the longest nights.', title: 'Star Summit Rider',
    sky: ['#0b1033', '#26306e', '#5c6bb0'],
    color: { name: 'Midnight Blue', body: '#233a8c', belly: '#8fa3e8', wing: '#121f52', accent: '#ffe066' },
    challenges: [['wins', 2], ['days', 4], ['races', 8]] },
];

const FIRST_YEAR = 2027;
const FIRST_MONTH = 1;

/** How many months after the first season a date falls, in local time. */
function monthIndex(now: Date): number {
  return (now.getFullYear() - FIRST_YEAR) * 12 + now.getMonth() + 1 - FIRST_MONTH;
}

/** The season running on a date, or null before the first one starts. */
export function seasonAt(now: Date = new Date()): Season | null {
  const i = monthIndex(now);
  return i < 0 ? null : SEASONS[i % SEASONS.length];
}

/** The first day of the first season, in local time. */
export const SEASONS_START = new Date(FIRST_YEAR, FIRST_MONTH - 1, 1);

/** Whole days until seasons begin: 0 once they have started. Counts calendar days, not hours. */
export function daysUntilSeasons(now: Date = new Date()): number {
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((SEASONS_START.getTime() - day.getTime()) / 86400000));
}

/** A key for one month a season runs, so a season that comes back starts fresh. */
export function seasonRun(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function seasonById(id: string): Season | undefined {
  return SEASONS.find((s) => s.id === id);
}

/** Seasons that have already had their first month, newest first. */
export function pastSeasons(now: Date = new Date()): Season[] {
  const i = monthIndex(now);
  return SEASONS.slice(0, Math.max(0, Math.min(i + 1, SEASONS.length))).reverse();
}

export function challengeText(kind: ChallengeKind, goal: number): string {
  const n = (one: string, many: string): string => `${goal.toLocaleString('en-US')} ${goal === 1 ? one : many}`;
  switch (kind) {
    case 'races': return `Finish ${n('race', 'races')}`;
    case 'wins': return `Win ${n('race', 'races')}`;
    case 'clean': return `Finish ${n('race', 'races')} with 98% accuracy`;
    case 'perfect': return goal === 1 ? 'Finish a race with no mistakes' : `Finish ${n('race', 'races')} with no mistakes`;
    case 'keys': return `Type ${n('correct key', 'correct keys')}`;
    case 'days': return `Play on ${n('different day', 'different days')}`;
    case 'lessons': return `Play ${n('lesson', 'lessons')}`;
  }
}
