/** The only things kept on the device: which parent is signed in (dev/demo only — real Firebase
 *  keeps its own) and which child this device is bound to. Everything else lives on the server. */
const KEY = "learn-math:cloud-session";

export interface CloudSession {
  parentToken?: string;
  childToken?: string;
}

export function readSession(): CloudSession {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function writeSession(next: CloudSession): void {
  try {
    if (Object.keys(next).length === 0) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode: the session lasts until the page closes */
  }
}
