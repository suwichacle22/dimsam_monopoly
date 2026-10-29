import { useSyncExternalStore } from "react";

export type Session = {
  password: string;
  token: string;
  name: string;
  variant: "blue" | "pink";
};

const KEY = "dimsam.session";
const listeners = new Set<() => void>();
let cache: Session | null | undefined;

function read(): Session | null {
  if (typeof window === "undefined") return null;
  if (cache !== undefined) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    cache = null;
  }
  return cache;
}

export function getSession(): Session | null {
  return read();
}

export function setSession(patch: Partial<Session> | null) {
  if (typeof window === "undefined") return;
  if (patch === null) {
    cache = null;
    localStorage.removeItem(KEY);
  } else {
    cache = { password: "", token: "", name: "", variant: "blue", ...(read() ?? {}), ...patch };
    localStorage.setItem(KEY, JSON.stringify(cache));
  }
  listeners.forEach((l) => l());
}

export function useSession(): Session | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => null,
  );
}
