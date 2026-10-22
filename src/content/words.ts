// Hand-picked, kid-safe practice words. Keep this list curated by hand:
// never pull words from an outside source without review.

export const WORDS: string[] = `
a as ask asks all add adds lad lads sad dad dads fall falls flask flasks salad salads
glad gas has had hall half dash flash shall lag flag flags
ash glass grass kale kales sea seas see sees said safe sake sale self fake
lake lakes desk desks shelf deal deals feel feels heal heels leaf leafs flea fleas jade hide side
ride tide wide slide glide fire fires flier fear dear ear ears tear year yes eye eyes key keys
red read reads tree trees free freed fresh great greet sweet sweat dragon dragons egg eggs wing
wings tail tails claw claws scale scales flame flames ember embers spark sparks smoke cloud clouds
sky skies storm storms wind winds rain sun moon star stars night day light dark fly flies flying
soar soars glider glide glides dive dives race races racer fast faster quick quickly brave bold
kind friend friends team home nest cave caves rock rocks stone stones peak peaks hill hills river
rivers lake reef reefs sand dune dunes ice frost snow forest moss tree leaf leaves root roots
gold silver copper jewel gem gems crown hero heroes quest map maps path paths road trail trails
north south east west rise rises rising wild calm warm hot cold cool deep high low big small tiny
huge long short young old new first last best good great happy proud strong swift steady ready
run runs jump jumps climb climbs swim swims play plays read write type types typing learn learns
hatch hatches hatched crack cracks shell shells baby little grow grows grew grown wise clever
the and you your they we us our it its is are was were be to of in on at by for from with up down
out over under into near far here there this that these those what when where who why how which
can could will would should may might must do does did done make made take took give gave go goes
went come came see saw look looks find found keep kept help helps start stop turn turns open close
time times year world land sea ocean wave waves shore island islands village castle tower towers
book books story stories song songs game games fun joy laugh smile hope dream dreams wish wishes
one two three four five six seven eight nine ten many more most some every each other another
red orange yellow green blue purple pink black white gray brown bright shiny glowing golden
`
  .split(/\s+/)
  .filter(Boolean);

// Original story passages about the Keyflame world, used in later lessons and races.
export const PASSAGES: string[] = [
  'The Emberbacks live on the volcano ridges, where the rocks are warm and the sky glows orange at night.',
  'A young dragon stretched her wings and leaped from the cliff. The wind caught her, and she soared over the reef.',
  'Tidefins race along the coast, skimming the waves so fast that the spray looks like silver sparks.',
  'Every dragon starts as an egg. Keep it warm, and one day you will hear a tiny crack.',
  'Stormcrests nest on the highest peaks. They love thunder and fly straight into the clouds.',
  'The old map showed a hidden cave behind the waterfall. Only the bravest racers dared to find it.',
  'Practice makes a racer strong. Fast claws are good, but steady claws win the long race.',
  'When the moon rose, the young dragons gathered at the nest to tell stories about the great sky race.',
];

/** Words that only use the given letters (lowercase). */
export function wordsFrom(allowed: Set<string>, minLen = 2): string[] {
  return WORDS.filter((w) => w.length >= minLen && [...w].every((c) => allowed.has(c)));
}
