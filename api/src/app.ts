import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import * as svc from "../../src/cloud/server/service.ts";
import { ApiError } from "../../src/cloud/server/types.ts";
import type { ParentVerifier } from "./auth.ts";

export interface AppOptions {
  deps: svc.Deps;
  verifyParent: ParentVerifier;
  verifyChildToken: (token: string) => svc.ChildIdentity | null;
  allowedOrigins?: string[];
  /** DEV only: lets a test move the clock to expire a subscription. Never enabled in production. */
  devClock?: { offsetMs: number } | null;
}

const bearer = (req: Request) => (req.header("authorization") ?? "").replace(/^Bearer\s+/i, "");

export function createApp(o: AppOptions) {
  const app = express();
  app.use(cors({ origin: o.allowedOrigins?.length ? o.allowedOrigins : true }));
  app.use(express.json({ limit: "100kb" }));

  // Wrong codes are the one thing worth guessing at (4 digits): a few per minute per address.
  const misses = new Map<string, number[]>();
  const tooManyMisses = (ip: string) => (misses.get(ip) ?? []).filter((t) => Date.now() - t < 600_000).length >= 10;
  const noteMiss = (ip: string) => misses.set(ip, [...(misses.get(ip) ?? []).filter((t) => Date.now() - t < 600_000), Date.now()]);

  const h = (fn: (req: Request, res: Response) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch(next);

  const parent = async (req: Request) => {
    try {
      return await o.verifyParent(bearer(req));
    } catch {
      throw new ApiError(401, "unauthorized");
    }
  };
  const child = (req: Request) => {
    const who = o.verifyChildToken(bearer(req));
    if (!who) throw new ApiError(401, "unauthorized");
    return who;
  };

  app.get("/health", (_req, res) => void res.send("ok"));

  // ── parent
  app.get("/parent/household", h(async (q, r) => r.json(await svc.parentHousehold(o.deps, await parent(q)))));
  app.delete("/parent/children/:cid", h(async (q, r) => r.json(await svc.parentDeleteChild(o.deps, await parent(q), q.params.cid))));
  app.post("/parent/child-code", h(async (q, r) => r.json(await svc.parentChildCode(o.deps, await parent(q)))));
  app.post("/parent/children/:cid/disconnect", h(async (q, r) => r.json(await svc.parentDisconnectDevices(o.deps, await parent(q), q.params.cid))));
  app.get("/parent/children/:cid/history", h(async (q, r) => r.json(await svc.parentHistory(o.deps, await parent(q), q.params.cid))));
  app.post("/parent/invite", h(async (q, r) => r.json(await svc.parentInvite(o.deps, await parent(q)))));
  app.post("/parent/join", h(async (q, r) => {
    const p = await parent(q);
    if (tooManyMisses(q.ip ?? "")) throw new ApiError(429, "too_many_attempts");
    try {
      r.json(await svc.parentJoin(o.deps, p, String(q.body?.code ?? "")));
    } catch (e) {
      if (e instanceof ApiError && e.code === "bad_code") noteMiss(q.ip ?? "");
      throw e;
    }
  }));
  app.post("/parent/subscription/pay", h(async (q, r) => r.json(await svc.parentPay(o.deps, await parent(q)))));
  app.post("/parent/subscription/cancel", h(async (q, r) => r.json(await svc.parentCancel(o.deps, await parent(q)))));

  // ── child
  // A child makes their own profile: no parent, no household yet. Capped per address so the
  // endpoint cannot be used to fill the database.
  const registrations = new Map<string, number[]>();
  app.post("/child/register", h(async (q, r) => {
    const ip = q.ip ?? "";
    const recent = (registrations.get(ip) ?? []).filter((t) => Date.now() - t < 3_600_000);
    if (recent.length >= 20) throw new ApiError(429, "too_many_attempts");
    registrations.set(ip, [...recent, Date.now()]);
    const { token, who } = await svc.childRegister(o.deps, q.body ?? {});
    r.json({ token, me: await svc.childMe(o.deps, who) });
  }));
  app.post("/child/link", h(async (q, r) => {
    const who = child(q);
    if (tooManyMisses(q.ip ?? "")) throw new ApiError(429, "too_many_attempts");
    try {
      r.json(await svc.childLink(o.deps, who, String(q.body?.code ?? "")));
    } catch (e) {
      if (e instanceof ApiError && e.code === "bad_code") noteMiss(q.ip ?? "");
      throw e;
    }
  }));
  app.get("/child/me", h(async (q, r) => r.json(await svc.childMe(o.deps, child(q)))));
  app.put("/child/settings", h(async (q, r) => r.json(await svc.childSetSettings(o.deps, child(q), q.body ?? {}))));
  app.post("/child/session", h(async (q, r) => r.json(await svc.childStartSession(o.deps, child(q), q.body ?? {}))));
  app.post("/child/session/:sid/answer", h(async (q, r) => r.json(await svc.childAnswer(o.deps, child(q), q.params.sid, q.body?.correct === true))));
  app.post("/child/session/:sid/finish", h(async (q, r) => { await svc.childFinish(o.deps, child(q), q.params.sid); r.json({ ok: true }); }));

  // ── dev only
  if (o.devClock) {
    const clock = o.devClock;
    app.post("/dev/clock", (q, r) => {
      clock.offsetMs += Number(q.body?.addDays ?? 0) * 86_400_000;
      r.json({ offsetMs: clock.offsetMs });
    });
  }

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ApiError) return void res.status(err.status).json({ error: err.code });
    console.error(err);
    res.status(500).json({ error: "server_error" });
  });
  return app;
}
