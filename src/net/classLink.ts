// Live classroom link over Supabase Realtime. Each class is one channel: presence says who
// is online and ready, and broadcasts start races. Each race gets its own small channel for
// progress, so a busy class doesn't flood every device. Nothing is stored by Realtime.
// The client library is loaded only when a class screen opens.

import type { RealtimeChannel, RealtimeClient } from '@supabase/realtime-js';
import { CONFIG } from '../config';
import type { Member, MemberStatus, RaceStart } from '../game/classroom';

export type LinkState = 'connecting' | 'online' | 'offline';

export interface RaceHandlers {
  tick: (id: string, progress: number, ms: number) => void;
  done: (id: string, ms: number, wpm: number, accuracy: number) => void;
}

export interface RaceRoom {
  sendTick(progress: number, ms: number): void;
  sendDone(ms: number, wpm: number, accuracy: number): void;
  leave(): void;
}

export interface ClassLink {
  readonly code: string;
  readonly me: Member;
  state(): LinkState;
  /** Everyone online in the class, this device's riders included. */
  members(): Member[];
  setStatus(status: MemberStatus): void;
  /** Tells the class to race. Listeners on this device hear it too. */
  startRace(race: RaceStart): void;
  onChange(cb: () => void): () => void;
  onRace(cb: (race: RaceStart) => void): () => void;
  joinRace(raceId: string, handlers: RaceHandlers): RaceRoom;
  close(): void;
}

/** Short field names keep every message small. */
interface Wire {
  id: string;
  n: string;
  l: Member['look'];
  r: Member['role'];
  s: MemberStatus;
  t: boolean;
  since: number;
}

const toWire = (m: Member): Wire => ({ id: m.id, n: m.name, l: m.look, r: m.role, s: m.status, t: m.touch, since: m.since });
const fromWire = (w: Wire): Member => ({ id: w.id, name: w.n, look: w.l, role: w.r, status: w.s, touch: w.t, since: w.since });

let client: RealtimeClient | null = null;

async function realtime(): Promise<RealtimeClient> {
  if (client) return client;
  const { RealtimeClient } = await import('@supabase/realtime-js');
  const url = CONFIG.supabaseUrl.replace(/^http/, 'ws') + '/realtime/v1';
  client = new RealtimeClient(url, { params: { apikey: CONFIG.feedbackKey, eventsPerSecond: 20 }, heartbeatIntervalMs: 15000 });
  return client;
}

export async function openClassLink(code: string, me: Member): Promise<ClassLink> {
  const rt = await realtime();
  const changeCbs = new Set<() => void>();
  const raceCbs = new Set<(race: RaceStart) => void>();
  let state: LinkState = 'connecting';
  let others: Member[] = [];
  let closed = false;
  const changed = (): void => changeCbs.forEach((cb) => cb());

  const channel: RealtimeChannel = rt.channel(`class-${code}`, {
    config: { broadcast: { self: false }, presence: { key: me.id, enabled: true } },
  });

  channel.on('presence', { event: 'sync' }, () => {
    const all = channel.presenceState<Wire>();
    const seen = new Map<string, Member>();
    for (const metas of Object.values(all)) {
      for (const w of metas) if (w.id && w.id !== me.id) seen.set(w.id, fromWire(w));
    }
    others = [...seen.values()];
    changed();
  });
  channel.on('broadcast', { event: 'race' }, ({ payload }) => {
    raceCbs.forEach((cb) => cb(payload as RaceStart));
  });

  const track = (): void => {
    if (state === 'online') void channel.track(toWire(me));
  };

  channel.subscribe((status) => {
    if (closed) return;
    if (status === 'SUBSCRIBED') {
      state = 'online';
      track();
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
      state = 'offline';
    }
    changed();
  });

  return {
    code,
    me,
    state: () => state,
    members: () => [me, ...others],
    setStatus(status) {
      if (me.status === status) return;
      me.status = status;
      track();
      changed();
    },
    startRace(race) {
      void channel.send({ type: 'broadcast', event: 'race', payload: race });
      raceCbs.forEach((cb) => cb(race));
    },
    onChange(cb) {
      changeCbs.add(cb);
      return () => changeCbs.delete(cb);
    },
    onRace(cb) {
      raceCbs.add(cb);
      return () => raceCbs.delete(cb);
    },
    joinRace(raceId, handlers) {
      const room = rt.channel(`race-${code}-${raceId}`, { config: { broadcast: { self: false } } });
      room.on('broadcast', { event: 'tick' }, ({ payload }) => handlers.tick(payload.id, payload.p, payload.ms));
      room.on('broadcast', { event: 'done' }, ({ payload }) => handlers.done(payload.id, payload.ms, payload.w, payload.a));
      room.subscribe();
      const send = (event: string, payload: Record<string, unknown>): void => void room.send({ type: 'broadcast', event, payload: { id: me.id, ...payload } });
      // A finish is the one message that must arrive, so it goes out again a moment later.
      return {
        sendTick: (p, ms) => send('tick', { p: Math.round(p * 1000) / 1000, ms: Math.round(ms) }),
        sendDone: (ms, w, a) => {
          const msg = { ms: Math.round(ms), w: Math.round(w * 10) / 10, a: Math.round(a * 1000) / 1000 };
          send('done', msg);
          window.setTimeout(() => send('done', msg), 1500);
        },
        leave: () => window.setTimeout(() => void rt.removeChannel(room), 2000),
      };
    },
    close() {
      closed = true;
      changeCbs.clear();
      raceCbs.clear();
      void channel.untrack().catch(() => undefined);
      void rt.removeChannel(channel);
    },
  };
}
