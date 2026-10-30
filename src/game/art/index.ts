// The cel-shaded art for each tribe. A tribe missing here still draws with the classic art.

import type { TribeId } from '../dragons';
import type { TribeArt } from './cel';
import { EMBERBACK } from './emberback';

export const CEL_ART: Partial<Record<TribeId, TribeArt>> = {
  emberback: EMBERBACK,
};
