// Little pictures for the "you got better" reward cards.
import type { Improvement } from '../game/improve';

const BOLT =
  '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="28" fill="#3b2f80"/><path d="M36 6 16 36h13l-5 22 24-32H34z" fill="#ffd43b" stroke="#e8590c" stroke-width="2.5" stroke-linejoin="round"/></svg>';

const keycap = (k: string): string =>
  `<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="6" y="10" width="52" height="46" rx="10" fill="#8a6a1a"/><rect x="6" y="6" width="52" height="44" rx="10" fill="#ffd43b"/><text x="32" y="38" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="26" fill="#3a2600">${k === ' ' ? '␣' : k.toUpperCase().replace(/[<>&]/g, '')}</text><path d="M48 4l3 6 6 1-5 4 1 6-5-3-5 3 1-6-4-4 6-1z" fill="#fff3bf"/></svg>`;

export const improvementArt = (i: Improvement): string => (i.kind === 'faster' ? BOLT : keycap(i.key ?? '?'));
export const improvementTitle = (i: Improvement): string => (i.kind === 'faster' ? 'Faster than usual!' : `${(i.key ?? '').toUpperCase()} key mastered`);
