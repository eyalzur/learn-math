import { ApiError, type CloudApi } from "./server/types";

/** The screens' `CloudApi`, spoken over HTTP to `api/`. `tokens` is read on every call so a
 *  fresh Firebase ID token (they expire hourly) is always the one sent. */
export function createHttpApi(
  baseUrl: string,
  tokens: { parent: () => Promise<string | undefined>; child: () => string | undefined },
): CloudApi {
  async function call<T>(who: "parent" | "child" | "none", method: string, path: string, body?: unknown): Promise<T> {
    const token = who === "parent" ? await tokens.parent() : who === "child" ? tokens.child() : undefined;
    let res: Response;
    try {
      res = await fetch(baseUrl + path, {
        method,
        headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new ApiError(0, "offline");
    }
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new ApiError(res.status, json?.error ?? "server_error");
    return json as T;
  }
  const P = <T,>(m: string, p: string, b?: unknown) => call<T>("parent", m, p, b);
  const C = <T,>(m: string, p: string, b?: unknown) => call<T>("child", m, p, b);
  return {
    parentHousehold: () => P("GET", "/parent/household"),
    parentAddChild: (i) => P("POST", "/parent/children", i),
    parentDeleteChild: (id) => P("DELETE", `/parent/children/${id}`),
    parentConnectCode: (id) => P("POST", `/parent/children/${id}/code`),
    parentDisconnectDevices: (id) => P("POST", `/parent/children/${id}/disconnect`),
    parentInvite: () => P("POST", "/parent/invite"),
    parentJoin: (code) => P("POST", "/parent/join", { code }),
    parentHistory: (id) => P("GET", `/parent/children/${id}/history`),
    parentPay: () => P("POST", "/parent/subscription/pay"),
    parentCancel: () => P("POST", "/parent/subscription/cancel"),
    childConnect: (code) => call("none", "POST", "/child/connect", { code }),
    childMe: () => C("GET", "/child/me"),
    childSetSettings: (s) => C("PUT", "/child/settings", s),
    childStartSession: (i) => C("POST", "/child/session", i),
    childAnswer: (sid, correct) => C("POST", `/child/session/${encodeURIComponent(sid)}/answer`, { correct }),
    childFinish: async (sid) => void (await C("POST", `/child/session/${encodeURIComponent(sid)}/finish`)),
    childAbandon: async () => {},
  };
}
