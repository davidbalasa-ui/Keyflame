// Ad slots for menu and results screens only, never during typing.
// Nothing renders until an AdSense ID is configured, and supporters never see ads.

import { CONFIG } from '../config';
import { hasProfile, profile } from './app';
import { h } from './dom';

type AdPlace = keyof typeof CONFIG.adSlots;

declare global {
  interface Window {
    adsbygoogle?: unknown[] & { requestNonPersonalizedAds?: number };
  }
}

let scriptAdded = false;

function loadScript(): void {
  if (scriptAdded) return;
  scriptAdded = true;
  // The site is for children: ask for non-personalized (contextual) ads only.
  // The AdSense account must also mark the site as child-directed.
  const queue = (window.adsbygoogle = window.adsbygoogle || []);
  queue.requestNonPersonalizedAds = 1;
  const s = document.createElement('script');
  s.async = true;
  s.crossOrigin = 'anonymous';
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(CONFIG.adsenseClient)}`;
  document.head.append(s);
}

export function adsEnabled(): boolean {
  if (!CONFIG.adsenseClient) return false;
  return !(hasProfile() && profile().supporter);
}

export function AdSlot(place: AdPlace): HTMLElement | null {
  const slot = CONFIG.adSlots[place];
  if (!adsEnabled() || !slot) return null;
  loadScript();
  const ins = h('ins', {
    class: 'adsbygoogle',
    style: 'display:block',
    'data-ad-client': CONFIG.adsenseClient,
    'data-ad-slot': slot,
    'data-ad-format': 'auto',
    'data-full-width-responsive': 'true',
  });
  const wrap = h('aside', { class: 'ad-slot', 'aria-label': 'Advertisement' }, h('small', { class: 'ad-label' }, 'Ad'), ins);
  queueMicrotask(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // Ad blocked or failed; the game carries on.
    }
  });
  return wrap;
}
