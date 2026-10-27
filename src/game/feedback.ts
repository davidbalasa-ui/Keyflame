// Bug reports and ideas from players. Nothing here can identify a child: there is
// no name, no account and no full browser string, and anything that looks like an
// email, phone number or link is removed before the report leaves the device.

export type FeedbackKind = 'bug' | 'idea' | 'other';

export const FEEDBACK_KINDS: Array<[FeedbackKind, string]> = [
  ['bug', 'Something is broken'],
  ['idea', 'I have an idea'],
  ['other', 'Something else'],
];

export const MAX_FEEDBACK_LENGTH = 600;
export const MAX_REPORTS_PER_DAY = 5;

export interface FeedbackReport {
  kind: FeedbackKind;
  message: string;
  /** The screen the player came from, such as "race". */
  screen: string;
  version: string;
  device: 'phone' | 'tablet' | 'desktop';
  browser: string;
  os: string;
  input: string;
}

/** Removes emails, links and phone-like numbers, and trims to the length limit. */
export function scrubFeedback(text: string): string {
  return text
    .replace(/[\w.+-]+\s*(@|\[at\]|\(at\))\s*[\w-]+(\s*(\.|\[dot\]|\(dot\))\s*[\w-]+)+/gi, '[email removed]')
    .replace(/\b(https?:\/\/|www\.)\S+/gi, '[link removed]')
    .replace(/\+?\d[\d\s().-]{5,}\d/g, (m) => (m.replace(/\D/g, '').length >= 7 ? '[number removed]' : m))
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_FEEDBACK_LENGTH);
}

/** A rough device description from the user agent: kind, browser family and OS only. */
export function describeDevice(ua: string, touch: boolean, width: number): Pick<FeedbackReport, 'device' | 'browser' | 'os'> {
  const os = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && touch) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /CrOS/.test(ua) ? 'ChromeOS' : /Mac OS X/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'Other';
  const browser = /Edg\//.test(ua) ? 'Edge' : /SamsungBrowser/.test(ua) ? 'Samsung Internet' : /Firefox|FxiOS/.test(ua) ? 'Firefox' : /Chrome|CriOS/.test(ua) ? 'Chrome' : /Safari/.test(ua) ? 'Safari' : 'Other';
  const mobile = touch || /Android|iPhone|iPad|iPod|Mobile/.test(ua);
  const device = !mobile ? 'desktop' : width >= 600 || /iPad|Tablet/.test(ua) || (/Macintosh/.test(ua) && touch) ? 'tablet' : 'phone';
  return { device, browser, os };
}

/** Keeps a device from sending a flood of reports. */
export function canSendToday(sent: { date: string; count: number } | null, today: string): boolean {
  return !sent || sent.date !== today || sent.count < MAX_REPORTS_PER_DAY;
}
