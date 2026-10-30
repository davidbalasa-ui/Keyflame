// QR codes for wing badges. Each one opens keyflame.org with the code and badge filled in,
// so a kid can scan their card with the camera instead of typing.

import qrcode from 'qrcode-generator';
import { joinLink } from '../game/wing';
import { h } from './dom';

/** A QR code as a GIF data URL: an image Safari can long-press to save to Photos. */
export function qrDataUrl(text: string, cell = 6): string {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  return qr.createDataURL(cell, cell * 2);
}

/** The scannable join card image for one badge. */
export function badgeQr(code: string, badge: number, cls = 'badge-qr'): HTMLImageElement {
  return h('img', { class: cls, src: qrDataUrl(joinLink(code, badge)), alt: `QR code to join with code ${code}, badge ${badge}`, width: 180, height: 180 });
}
