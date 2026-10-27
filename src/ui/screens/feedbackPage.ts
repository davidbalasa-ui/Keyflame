import { CONFIG } from '../../config';
import { FEEDBACK_KINDS, MAX_FEEDBACK_LENGTH, canSendToday, describeDevice, scrubFeedback, type FeedbackKind, type FeedbackReport } from '../../game/feedback';
import { today } from '../../save/store';
import { go, inputMode } from '../app';
import { button, h } from '../dom';
import { sfx } from '../sound';
import { hub, topBar } from './hub';
import { parentGate } from './supporter';

const SENT_KEY = 'keyflame-feedback-sent';

function sentToday(): { date: string; count: number } | null {
  try {
    return JSON.parse(localStorage.getItem(SENT_KEY) ?? 'null');
  } catch {
    return null;
  }
}

function markSent(): void {
  const s = sentToday();
  const d = today();
  try {
    localStorage.setItem(SENT_KEY, JSON.stringify({ date: d, count: s?.date === d ? s.count + 1 : 1 }));
  } catch {
    // Storage blocked; the daily limit just won't apply on this device.
  }
}

/** Sends to a Supabase table when a key is set, otherwise to a plain JSON endpoint. */
async function send(report: FeedbackReport): Promise<boolean> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (CONFIG.feedbackKey) {
    headers.apikey = CONFIG.feedbackKey;
    headers.Authorization = `Bearer ${CONFIG.feedbackKey}`;
    headers.Prefer = 'return=minimal';
  }
  try {
    const res = await fetch(CONFIG.feedbackUrl, { method: 'POST', headers, body: JSON.stringify(report) });
    return res.ok;
  } catch {
    return false;
  }
}

/** Report a bug or share an idea. A grown-up checks and sends it. */
export function feedbackPage(from: string) {
  return (root: HTMLElement): void => {
    let kind: FeedbackKind = 'bug';
    const kinds = FEEDBACK_KINDS.map(([k, label]) =>
      button(label, () => {
        kind = k;
        kinds.forEach((b) => b.classList.toggle('on', b.dataset.kind === k));
      }, 'chip' + (k === kind ? ' on' : ''), { 'data-kind': k }),
    );
    const box = h('textarea', { class: 'feedback-box', rows: 6, maxlength: MAX_FEEDBACK_LENGTH, placeholder: 'What happened? What were you doing when it happened?', 'aria-label': 'Your message' });
    const count = h('small', { class: 'fine' }, `0 / ${MAX_FEEDBACK_LENGTH}`);
    const msg = h('p', { class: 'fine', role: 'status' });
    box.addEventListener('input', () => (count.textContent = `${box.value.length} / ${MAX_FEEDBACK_LENGTH}`));

    const submit = (): void => {
      const message = scrubFeedback(box.value);
      if (message.length < 5) {
        msg.textContent = 'Please write a little more so we can understand.';
        return;
      }
      if (!canSendToday(sentToday(), today())) {
        msg.textContent = 'Thanks! That’s plenty of reports for today. You can send more tomorrow.';
        return;
      }
      root.append(
        parentGate(async () => {
          msg.textContent = 'Sending…';
          const report: FeedbackReport = {
            kind,
            message,
            screen: from,
            version: __BUILD_ID__,
            input: inputMode(),
            ...describeDevice(navigator.userAgent, navigator.maxTouchPoints > 0, Math.min(screen.width, screen.height)),
          };
          if (await send(report)) {
            markSent();
            sfx.coin();
            root.replaceChildren(
              topBar(() => go(hub)),
              h('main', { class: 'feedback' }, h('h1', {}, 'Thank you!'), h('p', {}, 'Your message is on its way. Bugs get fixed and good ideas get tried. Keep flying!'), button('Back to the hub', () => go(hub))),
            );
          } else msg.textContent = 'It didn’t send. Check the internet connection and try again.';
        }),
      );
    };

    const on = Boolean(CONFIG.feedbackUrl);
    root.append(
      topBar(() => go(hub)),
      h(
        'main',
        { class: 'feedback' },
        h('h1', {}, 'Report a bug or idea'),
        on
          ? h(
              'div',
              { class: 'feedback-form' },
              h('div', { class: 'chips' }, ...kinds),
              box,
              count,
              h('p', { class: 'feedback-warn' }, 'Please don’t write your name, school, address, email, or phone number. We never need them. Emails, phone numbers and links are removed before sending.'),
              h('p', { class: 'fine' }, 'We also send the game version and what kind of device this is (like “Android phone, Chrome”), so we can find the bug. Nothing else.'),
              msg,
              h('div', { class: 'row' }, button('Cancel', () => go(hub), 'btn ghost'), button('Ask a grown-up to send', submit)),
            )
          : h('p', {}, 'Sending reports isn’t switched on yet. It’s coming soon!'),
      ),
    );
  };
}
