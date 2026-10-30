// Each badge has a secret word printed on its card, like FROG. A device needs the class code,
// the badge number and the word to ride as that badge, so a classmate can't type someone
// else's number and play in their nest. The word comes from the teacher key, which only the
// teacher's device knows (the server keeps its hash), so cards can be reprinted any time and
// nothing new is stored: word = WORDS[first byte of sha256(sha256(teacher key) + ":" + badge)].

/** 256 short, friendly words a young reader can type: letters only, three to five of them. */
export const BADGE_WORDS: readonly string[] = [
  'ANT', 'BAT', 'BEAR', 'BEE', 'BIRD', 'BUG', 'CAT', 'CLAM', 'CRAB', 'DEER', 'DOG', 'DOVE', 'DUCK', 'ELK', 'EMU', 'FISH',
  'FOX', 'FROG', 'GOAT', 'GULL', 'HARE', 'HAWK', 'HEN', 'LAMB', 'LARK', 'LION', 'MOLE', 'MOOSE', 'MOTH', 'MULE', 'NEWT', 'OWL',
  'PONY', 'PUMA', 'SEAL', 'SHEEP', 'SNAIL', 'SWAN', 'TIGER', 'TOAD', 'TROUT', 'WOLF', 'WORM', 'YAK', 'ZEBRA', 'OTTER', 'PANDA', 'LLAMA',
  'CAMEL', 'HORSE', 'MOUSE', 'SHARK', 'WHALE', 'GECKO', 'ROBIN', 'HIPPO', 'RHINO', 'KOALA', 'SQUID', 'TUNA', 'CRANE', 'EAGLE', 'STORK', 'BISON',
  'CHICK', 'PUPPY', 'KITTY', 'BUNNY', 'FAWN', 'FOAL', 'CUB', 'COLT', 'SUN', 'MOON', 'STAR', 'SKY', 'RAIN', 'SNOW', 'WIND', 'LEAF',
  'TREE', 'ROSE', 'FERN', 'MOSS', 'ROCK', 'SAND', 'HILL', 'LAKE', 'POND', 'SEA', 'WAVE', 'CLOUD', 'FROST', 'MIST', 'RIVER', 'BEACH',
  'CAVE', 'NEST', 'SEED', 'ROOT', 'PINE', 'OAK', 'MAPLE', 'PEAK', 'DUNE', 'REEF', 'SHELL', 'PEARL', 'CORAL', 'TIDE', 'ICE', 'BLOOM',
  'PETAL', 'DAISY', 'TULIP', 'GRASS', 'STEM', 'VINE', 'APPLE', 'PEAR', 'PLUM', 'LIME', 'LEMON', 'MANGO', 'MELON', 'GRAPE', 'BERRY', 'CORN',
  'BEAN', 'PEA', 'RICE', 'BREAD', 'JAM', 'PIE', 'CAKE', 'SOUP', 'EGG', 'HONEY', 'MILK', 'TOAST', 'PASTA', 'PIZZA', 'BUN', 'NUT',
  'OAT', 'KIWI', 'FIG', 'PEACH', 'TACO', 'COMET', 'BAGEL', 'CRUMB', 'SALAD', 'BALL', 'BELL', 'BOAT', 'BOOK', 'BOX', 'CAP', 'CUP',
  'DRUM', 'FORK', 'HAT', 'KEY', 'KITE', 'LAMP', 'MAP', 'MUG', 'NET', 'PAN', 'PEN', 'RING', 'ROPE', 'SHIP', 'SOCK', 'SPOON',
  'TENT', 'TOY', 'VAN', 'BUS', 'CAR', 'TRAIN', 'SLED', 'BIKE', 'CLOCK', 'CHAIR', 'DESK', 'BRUSH', 'COIN', 'GEM', 'CROWN', 'FLAG',
  'HORN', 'HARP', 'SHOE', 'BOOT', 'JAR', 'BOWL', 'BLOCK', 'BRICK', 'DOOR', 'GATE', 'ROOF', 'TOWER', 'WHEEL', 'ROBOT', 'RAFT', 'SAIL',
  'CART', 'TRUCK', 'PLANE', 'GLOBE', 'CHALK', 'PAINT', 'GLUE', 'TAPE', 'PAW', 'MEDAL', 'ACORN', 'BENCH', 'OCEAN', 'RED', 'BLUE', 'GOLD',
  'PINK', 'TEAL', 'WAND', 'ORB', 'FLAME', 'SPARK', 'CLAW', 'WING', 'SCALE', 'TAIL', 'FLUTE', 'PIANO', 'QUEST', 'MAGIC', 'GLOW', 'BEAM',
  'SHINE', 'SING', 'SWIM', 'HOP', 'SKIP', 'SPIN', 'CLAP', 'JUMP', 'DASH', 'ZOOM', 'SLIDE', 'CLIMB', 'DANCE', 'LAUGH', 'SMILE', 'HIVE',];

/** SHA-256 as hex. Synchronous, so badge cards and QR codes can be drawn straight away. */
export function sha256Hex(text: string): string {
  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);
  const bytes = new TextEncoder().encode(text);
  const len = Math.ceil((bytes.length + 9) / 64) * 64;
  const msg = new Uint8Array(len);
  msg.set(bytes);
  msg[bytes.length] = 0x80;
  const view = new DataView(msg.buffer);
  view.setUint32(len - 8, Math.floor((bytes.length * 8) / 2 ** 32));
  view.setUint32(len - 4, (bytes.length * 8) >>> 0);
  const H = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const W = new Uint32Array(64);
  const rotr = (x: number, n: number): number => (x >>> n) | (x << (32 - n));
  for (let off = 0; off < len; off += 64) {
    for (let i = 0; i < 16; i++) W[i] = view.getUint32(off + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(W[i - 15], 7) ^ rotr(W[i - 15], 18) ^ (W[i - 15] >>> 3);
      const s1 = rotr(W[i - 2], 17) ^ rotr(W[i - 2], 19) ^ (W[i - 2] >>> 10);
      W[i] = W[i - 16] + s0 + W[i - 7] + s1;
    }
    let [a, b, c, d, e, f, g, hh] = H;
    for (let i = 0; i < 64; i++) {
      const t1 = (hh + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + W[i]) >>> 0;
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      hh = g;
      g = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }
    H[0] += a;
    H[1] += b;
    H[2] += c;
    H[3] += d;
    H[4] += e;
    H[5] += f;
    H[6] += g;
    H[7] += hh;
  }
  return [...H].map((x) => x.toString(16).padStart(8, '0')).join('');
}

/** The secret word for a badge, from the teacher key. */
export function badgeWord(teacherKey: string, badge: number): string {
  const hash = sha256Hex(`${sha256Hex(teacherKey)}:${badge}`);
  return BADGE_WORDS[parseInt(hash.slice(0, 2), 16)];
}

/** Turns what a kid typed into a word to look up: capitals, letters only. */
export function normalizeWord(text: string): string {
  return text.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5);
}

/** The word's number, which is what the server checks. -1 when it isn't a badge word. */
export function wordIndex(word: string): number {
  return BADGE_WORDS.indexOf(normalizeWord(word));
}
