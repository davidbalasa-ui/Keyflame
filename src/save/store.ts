// Device saves. Everything stays in this browser: no accounts, no personal data.
// IndexedDB is the main store; localStorage is a fallback for browsers that block it.

import type { KeyStats } from '../engine/typing';
import type { TribeId } from '../game/dragons';
import type { UnitId } from '../content/lessons';
import type { ReadingLevel } from '../content/facts';

export const SAVE_VERSION = 1;
export const MAX_PROFILES = 4;
export const LESSON_LOG_MAX = 50;

export interface OwnedDragon {
  id: string;
  tribe: TribeId;
  palette: number;
  name: string;
  /** Correct keystrokes typed while this dragon was active. */
  xp: number;
  hatchedAt: number;
  /** Set only on the supporter's own Starglint dragon (id STARGLINT_ID). */
  skin?: 'starglint';
  /** Index into MARKINGS; older dragons have none and are plain. */
  marking?: number;
  /** Evolution stars, one per extra copy of this look hatched (0 to 4). */
  stars?: number;
  /** Starglint only: race without key hints, the rider's choice. */
  noHints?: boolean;
}

/** The supporter pack's own dragon. It sits outside every tribe, set and perk. */
export const STARGLINT_ID = 'starglint';
export const isStarglint = (d: { id: string }): boolean => d.id === STARGLINT_ID;

/** Gives a supporter their Starglint dragon once. Returns it, or null when not a supporter. */
export function ensureStarglint(p: Profile): OwnedDragon | null {
  if (!p.supporter) return null;
  let d = p.dragons.find(isStarglint);
  if (!d) {
    // Stormcrest only fills the required field; the art, name and perk all come from Starglint.
    d = { id: STARGLINT_ID, tribe: 'stormcrest', palette: 0, name: 'Starglint', xp: 0, hatchedAt: Date.now(), skin: 'starglint' };
    p.dragons.push(d);
  }
  d.skin = 'starglint';
  d.stars = 0;
  return d;
}

export interface NestEgg {
  tribe: TribeId;
  /** Correct keystrokes of warmth so far. */
  warmth: number;
  seed: number;
}

export interface LessonResult {
  stars: number;
  bestWpm: number;
  bestAccuracy: number;
}

export interface RaceRecord {
  at: number;
  wpm: number;
  accuracy: number;
  place: number;
  input?: InputMode;
  course?: string;
}

/** keyboard = physical keys; touch = the game's tap keyboard; device = the phone's own keyboard. */
export type InputMode = 'keyboard' | 'touch' | 'device';

export interface Settings {
  sound: boolean;
  reducedMotion: boolean;
  dyslexiaFont: boolean;
  largeText: boolean;
  showKeyboard: boolean;
  /** 'auto' picks touch on phones and tablets, keyboard elsewhere. */
  input: InputMode | 'auto';
  /** Lessons let mistakes through and hide the clock. */
  relaxed: boolean;
  /** Which facts races use once every letter is learned; null until the player picks. */
  readingLevel: ReadingLevel | null;
}

export interface Profile {
  id: string;
  name: string;
  createdAt: number;
  embers: number;
  lessons: Record<string, LessonResult>;
  keyStats: KeyStats;
  /** bestWpm is for physical keyboards; touch typing keeps its own record. */
  totals: {
    correctKeys: number; races: number; lessons: number; bestWpm: number; bestTouchWpm: number; minutes: number;
    wins: number;
    /** Races at 98% accuracy or better, and races with no mistakes. */
    cleanRaces: number;
    perfectRaces: number;
    /** Every ember ever earned, even ones spent since. */
    embersEarned: number;
    /** Different days with a race or lesson. */
    playDays: number;
  };
  nest: NestEgg | null;
  basket: TribeId[];
  dragons: OwnedDragon[];
  activeDragonId: string | null;
  unitsRewarded: UnitId[];
  races: RaceRecord[];
  daily: { date: string; races: number; lessons: number };
  lastBackupAt: number;
  settings: Settings;
  /** Milestone eggs already awarded. */
  milestones: string[];
  /** Courses whose story rival has been beaten. */
  rivalsBeaten: string[];
  /** Aerie decorations owned. */
  decor: string[];
  supporter: boolean;
  /** The code that unlocks the supporter pack on another device, if this rider has it. */
  supporterCode?: string;
  /** Facts typed in races, oldest first. This is the player's Fact Book. */
  factsSeen: string[];
  /** Achievement id whose title shows under the rider's name. */
  title: string | null;
  /** Codex sets already paid out. */
  setsClaimed: string[];
  /** Achievements already announced. Missing on saves from before achievements. */
  achievements?: string[];
  /** True once copies hatched before evolution existed have been turned into stars. */
  starsBackfilled?: boolean;
  /** Season challenge progress by month (YYYY-MM). Missing on saves from before seasons. */
  seasonLog?: Record<string, SeasonLog>;
  /** Random key that lets a class follow this rider over time. Only its sha256 leaves the device. */
  classKey?: string;
  /** The class this rider's lessons and races count toward, if any, and their badge number in it. */
  classCode?: string;
  classBadge?: number;
  /** The badge's secret word, so this device can show the rider's own QR code. */
  classWord?: string;
  /** The name the grown-up gave this rider in their wing. Shown on this device only. */
  wingName?: string;
  /** Days in a row with a race or lesson. Missing on saves from before streaks. */
  streak?: { last: string; days: number; best: number };
  /** Recent lessons, newest first, for the Progress and Family charts. */
  lessonLog?: LessonRecord[];
  /** Average of the first three races on each kind of input, and when the third one finished. */
  startSpeed?: Partial<Record<'keyboard' | 'touch', StartSpeed>>;
}

export interface StartSpeed {
  wpm: number;
  at: number;
}

export interface LessonRecord {
  at: number;
  lesson: string;
  stars: number;
  /** Null in relaxed mode, which has no clock. */
  wpm: number | null;
  accuracy: number;
}

/** One month of a season: counts toward its three challenges. */
export interface SeasonLog {
  /** Which season ran that month. */
  season: string;
  races: number;
  wins: number;
  clean: number;
  perfect: number;
  keys: number;
  lessons: number;
  days: number;
  lastDay: string;
  /** Challenge numbers (0 to 2) already paid out. */
  paid: number[];
}

export interface SaveData {
  version: number;
  activeId: string | null;
  profiles: Profile[];
}

export const NAME_ADJECTIVES = ['Brave', 'Swift', 'Clever', 'Bright', 'Bold', 'Lucky', 'Mighty', 'Quiet', 'Sunny', 'Starry', 'Fierce', 'Gentle'];
export const NAME_NOUNS = ['Rider', 'Flyer', 'Keeper', 'Racer', 'Scout', 'Glider', 'Seeker', 'Ranger', 'Spark', 'Comet', 'Falcon', 'Ember'];

export function today(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function newId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function defaultSettings(): Settings {
  return { sound: true, reducedMotion: false, dyslexiaFont: false, largeText: false, showKeyboard: true, input: 'auto', relaxed: false, readingLevel: null };
}

/** A fresh profile starts with an Emberback egg that hatches quickly, for a first-session win. */
export function createProfile(name: string): Profile {
  return {
    id: newId(),
    name,
    createdAt: Date.now(),
    embers: 0,
    starsBackfilled: true,
    lessons: {},
    keyStats: {},
    totals: { correctKeys: 0, races: 0, lessons: 0, bestWpm: 0, bestTouchWpm: 0, minutes: 0, wins: 0, cleanRaces: 0, perfectRaces: 0, embersEarned: 0, playDays: 0 },
    nest: { tribe: 'emberback', warmth: 0, seed: Math.floor(Math.random() * 1e9) },
    basket: [],
    dragons: [],
    activeDragonId: null,
    unitsRewarded: [],
    races: [],
    daily: { date: today(), races: 0, lessons: 0 },
    lastBackupAt: Date.now(),
    settings: defaultSettings(),
    milestones: [],
    rivalsBeaten: [],
    decor: [],
    supporter: false,
    factsSeen: [],
    title: null,
    setsClaimed: [],
    achievements: [],
  };
}

export function emptySave(): SaveData {
  return { version: SAVE_VERSION, activeId: null, profiles: [] };
}

/** Fills in fields added after a save was written, so old saves keep working. */
export function migrate(raw: unknown): SaveData {
  const data = (raw && typeof raw === 'object' ? raw : {}) as Partial<SaveData>;
  const profiles = Array.isArray(data.profiles) ? data.profiles.map(normalizeProfile).filter(Boolean) as Profile[] : [];
  return {
    version: SAVE_VERSION,
    activeId: profiles.some((p) => p.id === data.activeId) ? data.activeId ?? null : null,
    profiles: profiles.slice(0, MAX_PROFILES),
  };
}

export function normalizeProfile(raw: unknown): Profile | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<Profile>;
  if (typeof r.id !== 'string' || typeof r.name !== 'string') return null;
  const base = createProfile(r.name);
  const races = Array.isArray(r.races) ? r.races : [];
  // Counters added later start from what the save still remembers.
  const old = r.totals ?? ({} as Partial<Profile['totals']>);
  const totals = {
    ...base.totals,
    wins: races.filter((x) => x.place === 1).length,
    cleanRaces: races.filter((x) => x.accuracy >= 0.98).length,
    perfectRaces: races.filter((x) => x.accuracy >= 1).length,
    embersEarned: typeof r.embers === 'number' ? r.embers : 0,
    playDays: old.races || old.lessons ? 1 : 0,
    ...old,
  };
  const p = {
    ...base,
    ...r,
    totals,
    daily: { ...base.daily, ...(r.daily ?? {}) },
    settings: { ...base.settings, ...(r.settings ?? {}) },
    nest: r.nest === undefined ? base.nest : r.nest,
    lessons: r.lessons ?? {},
    keyStats: r.keyStats ?? {},
    basket: r.basket ?? [],
    dragons: backfillStars(r.dragons ?? [], r.starsBackfilled === true),
    starsBackfilled: true,
    unitsRewarded: r.unitsRewarded ?? [],
    races: r.races ?? [],
    milestones: r.milestones ?? [],
    rivalsBeaten: r.rivalsBeaten ?? [],
    decor: r.decor ?? [],
    supporter: r.supporter ?? false,
    supporterCode: typeof r.supporterCode === 'string' ? r.supporterCode : undefined,
    factsSeen: Array.isArray(r.factsSeen) ? r.factsSeen.filter((id) => typeof id === 'string') : [],
    title: typeof r.title === 'string' ? r.title : null,
    setsClaimed: Array.isArray(r.setsClaimed) ? r.setsClaimed.filter((id) => typeof id === 'string') : [],
    achievements: Array.isArray(r.achievements) ? r.achievements.filter((id) => typeof id === 'string') : undefined,
    classKey: typeof r.classKey === 'string' && /^[0-9a-f]{32}$/.test(r.classKey) ? r.classKey : undefined,
    classCode: typeof r.classCode === 'string' && /^[A-Z]{6}$/.test(r.classCode) ? r.classCode : undefined,
    classBadge: Number.isInteger(r.classBadge) && r.classBadge! >= 1 && r.classBadge! <= 99 ? r.classBadge : undefined,
    classWord: typeof r.classWord === 'string' && /^[A-Z]{3,5}$/.test(r.classWord) ? r.classWord : undefined,
    wingName: typeof r.wingName === 'string' && r.wingName.trim() ? r.wingName.trim().slice(0, 40) : undefined,
    streak: r.streak && typeof r.streak.last === 'string' && Number.isInteger(r.streak.days) && r.streak.days > 0 ? { last: r.streak.last, days: r.streak.days, best: Number.isInteger(r.streak.best) ? Math.max(r.streak.best, r.streak.days) : r.streak.days } : undefined,
    startSpeed: cleanStartSpeed(r.startSpeed),
    lessonLog: Array.isArray(r.lessonLog) ? r.lessonLog.filter((x) => x && Number.isFinite(x.at) && Number.isFinite(x.accuracy) && (x.wpm === null || Number.isFinite(x.wpm))).slice(0, LESSON_LOG_MAX) : undefined,
  } as Profile;
  return starglintDragon(p);
}

function cleanStartSpeed(raw: Profile['startSpeed']): Profile['startSpeed'] {
  if (!raw || typeof raw !== 'object') return undefined;
  const out: NonNullable<Profile['startSpeed']> = {};
  for (const k of ['keyboard', 'touch'] as const) {
    const v = raw[k];
    if (v && Number.isFinite(v.wpm) && v.wpm >= 0 && Number.isFinite(v.at) && v.at > 0) out[k] = { wpm: v.wpm, at: v.at };
  }
  return Object.keys(out).length ? out : undefined;
}

/**
 * Starglint used to be a skin any dragon could wear (first called Starfire). Now it is
 * one dragon of its own: other dragons go back to their tribe look, and a rider who was
 * flying in the skin flies the Starglint dragon instead.
 */
function starglintDragon(p: Profile): Profile {
  const active = p.dragons.find((d) => d.id === p.activeDragonId);
  const wasWearing = !!active && !!active.skin && !isStarglint(active);
  for (const d of p.dragons) if (!isStarglint(d)) delete d.skin;
  const own = ensureStarglint(p);
  if (own && active && wasWearing) {
    // Keep the size the rider was used to seeing.
    own.xp = Math.max(own.xp, active.xp);
    p.activeDragonId = own.id;
  }
  return p;
}

/**
 * Before evolution, a repeated look hatched as a separate dragon. Those riders get
 * the stars they would have earned: the most grown dragon of each look gains one
 * star per extra copy. The copies stay, so no named dragon ever disappears.
 */
function backfillStars(dragons: OwnedDragon[], done: boolean): OwnedDragon[] {
  if (done) return dragons;
  const byLook = new Map<string, OwnedDragon[]>();
  for (const d of dragons) {
    if (isStarglint(d)) continue;
    const k = `${d.tribe}:${d.palette}:${d.marking ?? 0}`;
    byLook.set(k, [...(byLook.get(k) ?? []), d]);
  }
  for (const group of byLook.values()) {
    if (group.length < 2) continue;
    const holder = group.reduce((a, b) => (b.xp > a.xp ? b : a));
    holder.stars = Math.min(4, Math.max(holder.stars ?? 0, group.length - 1));
  }
  return dragons;
}

const DB_NAME = 'keyflame';
const STORE = 'saves';
const KEY = 'main';
export const LS_KEY = 'keyflame-save';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(): Promise<unknown> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(value: SaveData): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadSave(): Promise<SaveData> {
  try {
    const fromDb = await idbGet();
    if (fromDb) return migrate(fromDb);
  } catch {
    // IndexedDB unavailable (private mode in some browsers); fall through.
  }
  try {
    const ls = localStorage.getItem(LS_KEY);
    if (ls) return migrate(JSON.parse(ls));
  } catch {
    // Corrupt or blocked; start fresh rather than crash.
  }
  return emptySave();
}

export async function writeSave(data: SaveData): Promise<void> {
  const copy = JSON.parse(JSON.stringify(data)) as SaveData;
  try {
    await idbPut(copy);
  } catch {
    // ignore, localStorage below still keeps a copy
  }
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(copy));
  } catch {
    // Storage full or blocked. Nothing more we can do on this device.
  }
}

// Backup codes let a kid move progress to another device without an account.

function toBase64Url(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '==='.slice((b64.length + 3) % 4));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export function exportBackupCode(profile: Profile): string {
  return 'KF1-' + toBase64Url(JSON.stringify(profile));
}

export function importBackupCode(code: string): Profile | null {
  const trimmed = code.trim().replace(/\s+/g, '');
  if (!trimmed.startsWith('KF1-')) return null;
  try {
    return normalizeProfile(JSON.parse(fromBase64Url(trimmed.slice(4))));
  } catch {
    return null;
  }
}
