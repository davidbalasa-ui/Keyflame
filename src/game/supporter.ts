// Supporter codes: the supporter pack works without accounts or a database. A code
// is 8 random letters plus 4 check letters, so the game can tell a real code from a
// typo on any device, offline. It is an honor system that only unlocks a look, so a
// soft check is enough; a payment server can hand out the same codes later.

import { ensureStarglint, type Profile } from '../save/store';

/** Crockford base 32: no I, L, O or U, so codes are easy to read aloud and copy. */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
// Kept from the skin's first name (Starfire): changing it would break codes already handed out.
const SALT = 'keyflame-starfire-1';
const BODY_LEN = 8;
const CHECK_LEN = 4;

export const SUPPORTER_TITLE = 'Keyflame Supporter';
/** Stored in Profile.title when the rider wears the supporter title. */
export const SUPPORTER_TITLE_ID = 'supporter';

function hash(text: string): number {
  let a = 0xdeadbeef;
  let b = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    a = Math.imul(a ^ c, 2654435761);
    b = Math.imul(b ^ c, 1597334677);
  }
  a = Math.imul(a ^ (a >>> 16), 2246822507) ^ Math.imul(b ^ (b >>> 13), 3266489909);
  return a >>> 0;
}

function check(body: string): string {
  let n = hash(SALT + body);
  let out = '';
  for (let i = 0; i < CHECK_LEN; i++) {
    out += ALPHABET[n & 31];
    n >>>= 5;
  }
  return out;
}

/** Cleans what a person typed: case, spaces, dashes, the KF prefix, and look-alike letters. */
export function normalizeCode(text: string): string {
  const c = text
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1');
  // Only a full-length code carries the KF prefix; a code body can itself start with KF.
  return c.length === BODY_LEN + CHECK_LEN + 2 && c.startsWith('KF') ? c.slice(2) : c;
}

export function isSupporterCode(text: string): boolean {
  const c = normalizeCode(text);
  if (c.length !== BODY_LEN + CHECK_LEN || [...c].some((ch) => !ALPHABET.includes(ch))) return false;
  return check(c.slice(0, BODY_LEN)) === c.slice(BODY_LEN);
}

/** Shows a code as KF-XXXX-XXXX-XXXX. */
export function formatCode(text: string): string {
  const c = normalizeCode(text);
  return `KF-${c.slice(0, 4)}-${c.slice(4, 8)}-${c.slice(8)}`;
}

export function makeSupporterCode(rand: () => number = Math.random): string {
  let body = '';
  // A code that starts with KF would lose those letters as the prefix when typed in, so skip it.
  while (!body || body.startsWith('KF')) {
    body = '';
    for (let i = 0; i < BODY_LEN; i++) body += ALPHABET[Math.floor(rand() * 32) % 32];
  }
  return formatCode(body + check(body));
}

/** Unlocks the pack for a rider. Returns false for a code that does not check out. */
export function redeemSupporterCode(p: Profile, text: string): boolean {
  if (!isSupporterCode(text)) return false;
  p.supporter = true;
  p.supporterCode = formatCode(text);
  ensureStarglint(p);
  return true;
}

/** Gives the pack after a checkout, with a fresh code to keep for other devices. */
export function grantSupporter(p: Profile): string {
  if (!p.supporterCode) p.supporterCode = makeSupporterCode();
  p.supporter = true;
  ensureStarglint(p);
  return p.supporterCode;
}
