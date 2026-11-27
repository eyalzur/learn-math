import type { Store } from "../../src/cloud/server/store.ts";

/** Firestore adapter. Paths are already in Firestore shape (collection/doc/collection/doc).
 *  NOT yet exercised against a real Firestore — only `MemoryStore` is tested. */
export async function firestoreStore(projectId?: string): Promise<Store> {
  const { initializeApp, getApps } = await import("firebase-admin/app");
  const { getFirestore } = await import("firebase-admin/firestore");
  if (!getApps().length) initializeApp(projectId ? { projectId } : undefined);
  const db = getFirestore();
  return {
    async get<T>(path: string) {
      const snap = await db.doc(path).get();
      return snap.exists ? (snap.data() as T) : undefined;
    },
    async set(path, data) {
      await db.doc(path).set(JSON.parse(JSON.stringify(data)));
    },
    async delete(path) {
      await db.doc(path).delete();
    },
    async list<T>(collection: string) {
      const snap = await db.collection(collection).get();
      return snap.docs.map((d) => ({ id: d.id, data: d.data() as T }));
    },
    async deleteTree(path) {
      await db.recursiveDelete(db.doc(path));
    },
  };
}
