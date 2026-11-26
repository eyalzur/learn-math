import type { Student } from "./curriculum";

/**
 * Promise-returning even though the only implementation today (`localStorageUserStore`)
 * is synchronous underneath — a future server-backed store cannot be synchronous, so
 * every caller already has to tolerate that before one exists. Swapping `userStore`'s
 * assignment below to a `fetch`-based implementation is meant to be the only change this
 * ever needs; see docs/features/manage-students/architecture.md, "Technical Approach".
 */
export interface UserStore {
  list(): Promise<Student[]>;
  create(name: string, gradeId: string, avatar?: string): Promise<Student>;
  setAvatar(id: string, avatar: string): Promise<void>;
  remove(id: string): Promise<void>;
}

const STORAGE_KEY = "learn-math:users";

/** Same guard as every other localStorage read in this app — private-mode throws are a
 *  small disappointment, not something worth taking the app down over. */
function readAll(): Student[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Student[]) : [];
  } catch {
    return [];
  }
}

function writeAll(list: Student[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

export const localStorageUserStore: UserStore = {
  list: () => Promise.resolve(readAll()),
  create: (name, gradeId, avatar) => {
    const student: Student = { id: crypto.randomUUID(), name: name.trim(), gradeId };
    if (avatar) student.avatar = avatar;
    writeAll([...readAll(), student]);
    return Promise.resolve(student);
  },
  setAvatar: (id, avatar) => {
    writeAll(readAll().map((s) => (s.id === id ? { ...s, avatar } : s)));
    return Promise.resolve();
  },
  remove: (id) => {
    writeAll(readAll().filter((s) => s.id !== id));
    return Promise.resolve();
  },
};

export const userStore: UserStore = localStorageUserStore;
