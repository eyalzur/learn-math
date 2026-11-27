import { useSyncExternalStore } from "react";

/**
 * The only things kept on a device. Two roles, two keys, because the kids' app and the parents'
 * app are separate apps that happen to share a browser origin: a parent testing in the same
 * browser must not be signed in as the child, or the other way round.
 *   child  — the token that binds this device to one child
 *   parent — dev/demo sign-in only (real Firebase keeps its own session)
 * Kept in memory too, so a page whose storage is blocked still works until it is closed.
 */
export type Role = "parent" | "child";

const key = (r: Role) => `learn-math:cloud-${r}-token`;
const mem: Partial<Record<Role, string | undefined>> = {};
const loaded: Partial<Record<Role, boolean>> = {};
const listeners = new Set<() => void>();

export function getToken(role: Role): string | undefined {
  if (!loaded[role]) {
    loaded[role] = true;
    try {
      mem[role] = localStorage.getItem(key(role)) ?? undefined;
    } catch {
      /* storage blocked: memory only */
    }
  }
  return mem[role];
}

export function setToken(role: Role, token: string | undefined): void {
  loaded[role] = true;
  mem[role] = token;
  try {
    if (token) localStorage.setItem(key(role), token);
    else localStorage.removeItem(key(role));
  } catch {
    /* memory only */
  }
  listeners.forEach((l) => l());
}

export function clearAllTokens(): void {
  setToken("parent", undefined);
  setToken("child", undefined);
}

export function useToken(role: Role): string | undefined {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => void listeners.delete(cb);
    },
    () => getToken(role),
  );
}
