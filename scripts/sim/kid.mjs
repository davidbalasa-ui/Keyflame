// The one command an AI tester uses to play: node scripts/sim/kid.mjs <player> <command> [args]
// Commands: look | tap N | fill N text | type | key Enter | scroll down|up | wait S | shot | note text | stats
const [who, cmd = 'look', ...args] = process.argv.slice(2);
const port = process.env.CTRL_PORT ?? 4300;
import { request } from 'node:http';
// Plain http with no timeout: typing a long race at a slow kid's speed can take minutes.
const req = request({ host: 'localhost', port, method: 'POST', path: '/' }, (res) => {
  let out = '';
  res.on('data', (c) => (out += c));
  res.on('end', () => console.log(out));
});
req.on('error', (e) => console.log(`ERROR: ${e.message}`));
req.end(JSON.stringify({ who, cmd, args }));
