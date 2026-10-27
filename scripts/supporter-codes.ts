// Prints fresh supporter codes, one per line: npm run codes -- 10
import { makeSupporterCode } from '../src/game/supporter';

const n = Math.min(Math.max(Number(process.argv[2]) || 1, 1), 500);
for (let i = 0; i < n; i++) console.log(makeSupporterCode());
