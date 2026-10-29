// The teacher's locked backup. Student names and the teacher key are encrypted on the
// teacher's device (AES-GCM, key from the teacher password by PBKDF2) before they are sent,
// so Keyflame only ever stores a blob it can't read. The same password also makes a separate
// proof, which is how the server knows to hand the blob back on another device.

import { restoreVault, saveVault, vaultSalt, type TeacherClass } from './classApi';

const ITERATIONS = 150000;
export const MIN_PASSWORD = 6;

/** What a device keeps so it can update the backup without asking for the password again. */
export interface VaultKeys {
  salt: string;
  /** The AES key, raw, in base64. */
  aes: string;
  proof: string;
}

/** What the backup holds. */
export interface VaultData {
  key: string;
  roster: Record<number, string>;
  /** Badge numbers of deleted students, never given out again. */
  retired?: number[];
}

const b64 = (bytes: Uint8Array): string => btoa(String.fromCharCode(...bytes));
const unb64 = (s: string): Uint8Array => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const hex = (bytes: Uint8Array): string => [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');

export function newSalt(): string {
  return b64(crypto.getRandomValues(new Uint8Array(16)));
}

export async function deriveKeys(password: string, salt: string): Promise<VaultKeys> {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unb64(salt), iterations: ITERATIONS }, base, 512));
  return { salt, aes: b64(bits.slice(0, 32)), proof: hex(bits.slice(32)) };
}

async function aesKey(k: VaultKeys): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', unb64(k.aes), 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function lock(data: VaultData, k: VaultKeys): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const box = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await aesKey(k), new TextEncoder().encode(JSON.stringify(data))));
  return `v1.${b64(iv)}.${b64(box)}`;
}

export async function unlock(blob: string, k: VaultKeys): Promise<VaultData> {
  const [v, iv, box] = blob.split('.');
  if (v !== 'v1') throw new Error('Unknown backup');
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv) }, await aesKey(k), unb64(box));
  return JSON.parse(new TextDecoder().decode(plain)) as VaultData;
}

/** Locks and uploads the backup. */
export async function pushVault(t: TeacherClass, k: VaultKeys, roster: Record<number, string>, retired: number[]): Promise<boolean> {
  return saveVault(t, k.salt, k.proof, await lock({ key: t.key, roster, retired }, k));
}

export type RestoreResult = { ok: true; data: VaultData; keys: VaultKeys } | { ok: false; why: 'none' | 'wrong' };

/** Opens a class on this device with its code and the teacher password. */
export async function pullVault(code: string, password: string): Promise<RestoreResult> {
  const salt = await vaultSalt(code);
  if (!salt) return { ok: false, why: 'none' };
  const keys = await deriveKeys(password, salt);
  const blob = await restoreVault(code, keys.proof);
  if (!blob) return { ok: false, why: 'wrong' };
  return { ok: true, data: await unlock(blob, keys), keys };
}
