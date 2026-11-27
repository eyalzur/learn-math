import * as svc from "./server/service";
import { MemoryStore } from "./server/store";
import { ApiError, type CloudApi } from "./server/types";

/**
 * The real service running in the page, with its "database" in localStorage — for the demo
 * preview, where there is no server to talk to. Same code as `api/`, so the demo shows the
 * real rules (limits, prices, expiry), just not a real network. Not for production: anyone
 * can open DevTools and edit it.
 */
const DB_KEY = "learn-math:cloud-demo-db";
const CLOCK_KEY = "learn-math:cloud-demo-clock";

/** Demo clock: lives in memory, mirrored to storage when storage is available (some sandboxed
 *  pages refuse it). */
function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
let offsetMs = Number(readStored(CLOCK_KEY) ?? 0);

export function demoClock() {
  return {
    advanceDays(days: number) {
      offsetMs += days * 86_400_000;
      try {
        localStorage.setItem(CLOCK_KEY, String(offsetMs));
      } catch {
        /* in-memory only */
      }
    },
    reset() {
      offsetMs = 0;
      try {
        localStorage.removeItem(CLOCK_KEY);
        localStorage.removeItem(DB_KEY);
      } catch {
        /* nothing stored */
      }
    },
    now: () => Date.now() + offsetMs,
  };
}

export function createLocalApi(tokens: { parent: () => string | undefined; child: () => string | undefined }): CloudApi {
  const clock = demoClock();
  let saved: Record<string, unknown> | undefined;
  try {
    saved = JSON.parse(readStored(DB_KEY) ?? "null") ?? undefined;
  } catch {
    saved = undefined;
  }
  const store: MemoryStore = new MemoryStore(saved, () => {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(store.snapshot()));
    } catch {
      /* quota: the demo keeps working for this page load */
    }
  });
  const deps: svc.Deps = {
    store,
    now: clock.now,
    rng: Math.random,
    newId: () => crypto.randomUUID(),
    issueChildToken: (p) => JSON.stringify(p),
  };

  const parent = (): svc.ParentIdentity => {
    const t = tokens.parent();
    const m = t && /^dev:(.+@.+)$/.exec(t);
    if (!m) throw new ApiError(401, "unauthorized");
    return { uid: `dev-${m[1].toLowerCase()}`, email: m[1].toLowerCase() };
  };
  const child = (): svc.ChildIdentity => {
    try {
      const p = JSON.parse(tokens.child() ?? "");
      if (p.hid && p.cid && p.did) return p;
    } catch {
      /* fall through */
    }
    throw new ApiError(401, "unauthorized");
  };

  return {
    parentHousehold: () => svc.parentHousehold(deps, parent()),
    parentAddChild: (i) => svc.parentAddChild(deps, parent(), i),
    parentDeleteChild: (id) => svc.parentDeleteChild(deps, parent(), id),
    parentConnectCode: (id) => svc.parentConnectCode(deps, parent(), id),
    parentDisconnectDevices: (id) => svc.parentDisconnectDevices(deps, parent(), id),
    parentInvite: () => svc.parentInvite(deps, parent()),
    parentJoin: (code) => svc.parentJoin(deps, parent(), code),
    parentHistory: (id) => svc.parentHistory(deps, parent(), id),
    parentSchedule: (id) => svc.parentSchedule(deps, parent(), id),
    parentSetSchedule: (id, s) => svc.parentSetSchedule(deps, parent(), id, s),
    parentSendReminder: (id, i) => svc.parentSendReminder(deps, parent(), id, i),
    parentPay: () => svc.parentPay(deps, parent()),
    parentCancel: () => svc.parentCancel(deps, parent()),
    childConnect: async (code) => {
      const { token, who } = await svc.childConnect(deps, code);
      return { token, me: await svc.childMe(deps, who) };
    },
    childMe: () => svc.childMe(deps, child()),
    childSetSettings: (s) => svc.childSetSettings(deps, child(), s),
    childStartSession: (i) => svc.childStartSession(deps, child(), i),
    childAnswer: (sid, correct) => svc.childAnswer(deps, child(), sid, correct),
    childFinish: (sid) => svc.childFinish(deps, child(), sid),
    childAbandon: (sid) => svc.childAbandon(deps, child(), sid),
    childInbox: () => svc.childInbox(deps, child()),
    childMarkInboxRead: () => svc.childMarkInboxRead(deps, child()),
  };
}
