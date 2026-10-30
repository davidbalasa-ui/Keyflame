// The cel-shaded art for each tribe. A tribe missing here still draws with the classic art.

import type { TribeId } from '../dragons';
import type { TribeArt } from './cel';
import { DUNESKIMMER } from './duneskimmer';
import { EMBERBACK } from './emberback';
import { FROSTSPINE } from './frostspine';
import { MOSSCLAW } from './mossclaw';
import { SHADEGLIDE } from './shadeglide';
import { STORMCREST } from './stormcrest';
import { TIDEFIN } from './tidefin';

export const CEL_ART: Record<TribeId, TribeArt> = {
  emberback: EMBERBACK,
  tidefin: TIDEFIN,
  stormcrest: STORMCREST,
  mossclaw: MOSSCLAW,
  frostspine: FROSTSPINE,
  duneskimmer: DUNESKIMMER,
  shadeglide: SHADEGLIDE,
};
