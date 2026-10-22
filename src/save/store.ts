// Device saves. Everything stays in this browser: no accounts, no personal data.
// IndexedDB is the main store; localStorage is a fallback for browsers that block it.

import type { KeyStats } from '../engine/typing';
import type { TribeId } from '../game/dragons';
import type { UnitId } from '../content/lessons';

export const SAVE_VERSION = 1;
export const MAX_PROFILES = 4;

export interface OwnedDragon {
  id: string;
  tribe: TribeId;
  palette: number;
  name: string;
  /** Correct keystrokes typed while this dragon was active. */
  xp: number;
  hatchedAt: number;
  /** Supporter-only cosmetic skin. */
  skin?: 'starfire';
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
}

export interface Profile {
  id: string;
  name: string;
  createdAt: number;
  embers: number;
  lessons: Record<string, LessonResult>;
  keyStats: KeyStats;
  /** bestWpm is for physical keyboards; touch typing keeps its own record. */
  totals: { correctKeys: number; races: number; lessons: number; bestWpm: number; bestTouchWpm: number; minutes: number };
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
  return { sound: true, reducedMotion: false, dyslexiaFont: false, largeText: false, showKeyboard: true, input: 'auto', relaxed: false };
}

/** A fresh profile starts with an Emberback egg that hatches quickly, for a first-session win. */
export function createProfile(name: string): Profile {
  return {
    id: newId(),
    name,
    createdAt: Date.now(),
    embers: 0,
    lessons: {},
    keyStats: {},
    totals: { correctKeys: 0, races: 0, lessons: 0, bestWpm: 0, bestTouchWpm: 0, minutes: 0 },
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
  return {
    ...base,
    ...r,
    totals: { ...base.totals, ...(r.totals ?? {}) },
    daily: { ...base.daily, ...(r.daily ?? {}) },
    settings: { ...base.settings, ...(r.settings ?? {}) },
    nest: r.nest === undefined ? base.nest : r.nest,
    lessons: r.lessons ?? {},
    keyStats: r.keyStats ?? {},
    basket: r.basket ?? [],
    dragons: r.dragons ?? [],
    unitsRewarded: r.unitsRewarded ?? [],
    races: r.races ?? [],
    milestones: r.milestones ?? [],
    rivalsBeaten: r.rivalsBeaten ?? [],
    decor: r.decor ?? [],
    supporter: r.supporter ?? false,
  } as Profile;
}

const DB_NAME = 'keyflame';
const STORE = 'saves';
const KEY = 'main';
const LS_KEY = 'keyflame-save';

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
