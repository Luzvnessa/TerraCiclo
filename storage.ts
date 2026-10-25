export const storageKeys = {
  field: "terraciclo.field",
  preferences: "terraciclo.preferences",
  selectedRotation: "terraciclo.selectedRotation",
  soilChecklist: "terraciclo.soilChecklist",
  soilNotes: "terraciclo.soilNotes",
  calendar: "terraciclo.calendar",
  environment: "terraciclo.environment"
} as const;

export function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writeStorage<T>(key: string, value: T): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeStorage(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
