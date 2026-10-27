import { describe, expect, it } from 'vitest';
import { MAX_FEEDBACK_LENGTH, canSendToday, describeDevice, scrubFeedback } from '../src/game/feedback';

describe('feedback', () => {
  it('removes emails, links and phone numbers', () => {
    const out = scrubFeedback('my mom is jane.doe+kf@gmail.com or jane at gmail dot com, call 555-123-4567 or (555) 123 4567, see https://x.y/z and www.abc.com. I typed 45 wpm in 2026');
    expect(out).not.toMatch(/gmail\.com|555|https|www\./);
    expect(out).toContain('[email removed]');
    expect(out).toContain('[number removed]');
    expect(out).toContain('[link removed]');
    expect(out).toContain('45 wpm in 2026');
    expect(scrubFeedback('a [at] b [dot] com')).toBe('[email removed]');
    expect(scrubFeedback('x'.repeat(900)).length).toBe(MAX_FEEDBACK_LENGTH);
  });

  it('describes devices without the full browser string', () => {
    expect(describeDevice('Mozilla/5.0 (Linux; Android 10; SM-G965U) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36', true, 412)).toEqual({ device: 'phone', browser: 'Chrome', os: 'Android' });
    expect(describeDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17 Safari/605.1.15', true, 1024)).toEqual({ device: 'tablet', browser: 'Safari', os: 'iOS' });
    expect(describeDevice('Mozilla/5.0 (Windows NT 10.0) Chrome/120 Edg/120', false, 1400)).toEqual({ device: 'desktop', browser: 'Edge', os: 'Windows' });
  });

  it('limits reports per day', () => {
    expect(canSendToday(null, '2026-10-27')).toBe(true);
    expect(canSendToday({ date: '2026-10-27', count: 5 }, '2026-10-27')).toBe(false);
    expect(canSendToday({ date: '2026-10-26', count: 5 }, '2026-10-27')).toBe(true);
  });
});
