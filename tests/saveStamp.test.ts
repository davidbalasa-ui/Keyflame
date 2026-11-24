import { describe, expect, it } from 'vitest';
import { saveStampOf } from '../src/save/store';

// A page only treats a storage event as "another tab saved" when the save is newer than the
// one it loaded (Safari can hand a page the previous page's own last save).
describe('save stamps', () => {
  it('reads the writtenAt stamp of a stored save', () => {
    expect(saveStampOf(JSON.stringify({ writtenAt: 1234 }))).toBe(1234);
  });
  it('treats missing or broken saves as stamp 0', () => {
    expect(saveStampOf(null)).toBe(0);
    expect(saveStampOf('{not json')).toBe(0);
    expect(saveStampOf(JSON.stringify({ profiles: [] }))).toBe(0);
  });
});
