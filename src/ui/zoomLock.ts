// Keyflame plays like an app, so pinches and trackpad zooms must not blow the game up mid-race
// (Edge on a touch PC, a trackpad pinch, an iPad pinch). Grown-up screens (the teacher and family
// dashboards) keep zoom so a low-vision teacher can still enlarge them, and the privacy page and
// tour are separate pages that keep normal zoom. Kids who need bigger text have Settings → Large
// text. Ctrl/Cmd + plus and minus are left alone on every screen for the same reason.

const VIEWPORT_BASE = 'width=device-width, initial-scale=1.0, viewport-fit=cover';

/** True while a grown-up screen that keeps zoom is showing. */
export function zoomAllowed(): boolean {
  return document.body.classList.contains('teacher-mode');
}

function syncViewport(): void {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
  if (!meta) return;
  const want = zoomAllowed() ? VIEWPORT_BASE : `${VIEWPORT_BASE}, maximum-scale=1, user-scalable=no`;
  if (meta.content !== want) meta.content = want;
}

export function startZoomLock(): void {
  const block = (e: Event): void => {
    if (!zoomAllowed() && e.cancelable) e.preventDefault();
  };
  // Trackpad pinches on Windows and Mac arrive as wheel events with ctrlKey set (so does ctrl+wheel).
  window.addEventListener('wheel', (e) => { if (e.ctrlKey) block(e); }, { passive: false });
  // Safari (iPad, iPhone, Mac trackpad) ignores user-scalable=no and sends gesture events instead.
  for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
    document.addEventListener(type, block, { passive: false });
  }
  // A two-finger move is a pinch. One-finger scrolling is never touched.
  document.addEventListener('touchmove', (e) => { if (e.touches.length > 1) block(e); }, { passive: false });
  syncViewport();
  new MutationObserver(syncViewport).observe(document.body, { attributes: true, attributeFilter: ['class'] });
}
