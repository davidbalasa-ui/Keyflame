import { describe, expect, it } from 'vitest';
import { LAUNCH_MS, poseAt } from '../src/ui/launch';

describe('race launch', () => {
  it('finishes before the countdown says Fly!', () => {
    expect(LAUNCH_MS).toBeLessThan(2700);
  });
  it('perches with folded wings, springs with them flung up, and lands in the race flap pose', () => {
    expect(poseAt(0).wf).toContain('scale(0.90, 0.30)');
    expect(poseAt(0.19).wf).toContain('rotate(-30.0deg)');
    expect(poseAt(0.19).body).toContain('scale(0.84, 1.22)');
    // The race's flap animation starts at rotate(-8deg) scaleY(1), so the hand-off is seamless.
    expect(poseAt(1).wf).toBe('rotate(-8.0deg) scale(1.00, 1.00)');
  });
  it('never produces a broken transform', () => {
    for (let i = 0; i <= 200; i++) {
      const p = poseAt(i / 200);
      for (const v of Object.values(p)) expect(v).not.toMatch(/NaN|Infinity/);
    }
  });
});
