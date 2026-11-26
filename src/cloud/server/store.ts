/**
 * A tiny document store: paths like `households/h1/children/c1`, collections are the odd
 * segments, documents the even ones — the same shape Firestore uses, so `api/` maps this
 * 1:1 onto Firestore and the in-browser demo keeps it in memory.
 */
export interface Store {
  get<T>(path: string): Promise<T | undefined>;
  set(path: string, data: unknown): Promise<void>;
  delete(path: string): Promise<void>;
  /** Direct child documents of a collection path. */
  list<T>(collection: string): Promise<{ id: string; data: T }[]>;
  /** Deletes the document and everything nested under it (a child and all of its data). */
  deleteTree(path: string): Promise<void>;
}

export class MemoryStore implements Store {
  private docs = new Map<string, string>();
  private onChange: (() => void) | undefined;

  constructor(initial?: Record<string, unknown>, onChange?: () => void) {
    for (const [k, v] of Object.entries(initial ?? {})) this.docs.set(k, JSON.stringify(v));
    this.onChange = onChange;
  }

  snapshot(): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [k, v] of this.docs) out[k] = JSON.parse(v);
    return out;
  }

  async get<T>(path: string): Promise<T | undefined> {
    const raw = this.docs.get(path);
    return raw === undefined ? undefined : (JSON.parse(raw) as T);
  }

  async set(path: string, data: unknown): Promise<void> {
    this.docs.set(path, JSON.stringify(data));
    this.onChange?.();
  }

  async delete(path: string): Promise<void> {
    this.docs.delete(path);
    this.onChange?.();
  }

  async list<T>(collection: string): Promise<{ id: string; data: T }[]> {
    const prefix = collection + "/";
    const out: { id: string; data: T }[] = [];
    for (const [k, v] of this.docs) {
      if (!k.startsWith(prefix)) continue;
      const rest = k.slice(prefix.length);
      if (rest.includes("/")) continue;
      out.push({ id: rest, data: JSON.parse(v) as T });
    }
    return out;
  }

  async deleteTree(path: string): Promise<void> {
    for (const k of [...this.docs.keys()]) {
      if (k === path || k.startsWith(path + "/")) this.docs.delete(k);
    }
    this.onChange?.();
  }
}
