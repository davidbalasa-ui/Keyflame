// QR codes for wing badges. Each one opens keyflame.org with the code, badge and word filled in,
// so a kid can scan their card with the camera instead of typing.

import qrcode from 'qrcode-generator';
import { h } from './dom';

/** A QR code as a GIF data URL: an image Safari can long-press to save to Photos. */
export function qrDataUrl(text: string, cell = 6): string {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  return qr.createDataURL(cell, cell * 2);
}

/** The scannable join card image for one badge, from its join link. */
export function badgeQr(link: string, alt: string, cls = 'badge-qr'): HTMLImageElement {
  return h('img', { class: cls, src: qrDataUrl(link), alt, width: 180, height: 180 });
}
