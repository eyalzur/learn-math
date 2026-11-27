import { useCallback, useEffect, useState } from "react";
import { grades } from "../data/curriculum";
import { pricing } from "../data/pricing";
import { errorText } from "./errors";
import { appLinks, CodeCard, inviteText } from "./CodeCard";
import { type ChildView, type CloudApi, type HouseholdView, type ProgressView } from "./server/types";

type View =
  | { name: "home" }
  | { name: "child"; id: string }
  | { name: "subscription" }
  | { name: "connections" }
  | { name: "childCode" }
  | { name: "invite" }
  | { name: "privacy" };

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("he-IL", { day: "numeric", month: "numeric" });
const gradeLabel = (id: string) => grades.find((g) => g.id === id)?.label ?? "";

export function ParentApp({ api, joinCode, onSignOut }: { api: CloudApi; joinCode: string; onSignOut: () => void }) {
  const [hh, setHh] = useState<HouseholdView | null>(null);
  const [view, setView] = useState<View>({ name: "home" });
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    setError("");
    try {
      return await fn();
    } catch (e) {
      setError(errorText(e));
      return undefined;
    }
  }, []);

  useEffect(() => {
    run(async () => {
      if (joinCode) {
        try {
          setHh(await api.parentJoin(joinCode));
          return;
        } catch {
          /* a wrong or used code: fall through and open the parent's own household */
        }
      }
      setHh(await api.parentHousehold());
    });
  }, [api, joinCode, run]);

  const flash = (text: string) => {
    setToast(text);
    window.setTimeout(() => setToast(""), 2500);
  };
  const back = () => setView({ name: "home" });

  if (!hh) {
    return (
      <div className="cloud">
        <div className="cloud-card">
          <h1>הורים</h1>
          <div className="cloud-error" role="alert">{error}</div>
          {!error && <p style={{ textAlign: "center" }}>רגע…</p>}
          {error && <button className="cloud-btn" onClick={() => window.location.reload()}>נסו שוב</button>}
        </div>
      </div>
    );
  }

  const sub = hh.subscription;
  /** Prices, trial and lock are off for now (see `HouseholdView.paywall`): nothing about them is shown. */
  const paywall = hh.paywall;
  const kid = (id: string): ChildView | undefined => hh.children.find((c) => c.id === id);
  const subLine =
    sub.status === "trial"
      ? `שבוע ניסיון — נשארו ${sub.daysLeft} ימים`
      : sub.status === "active"
        ? `מתחדש ב-${fmtDate(sub.paidUntil!)}`
        : "המנוי הסתיים. חדשו כדי לראות עדכונים";

  if (view.name === "home") {
    return (
      <div className="cloud">
        <div className="cloud-card">
          <h1>הורים</h1>
          {paywall && <div className={`cloud-banner ${sub.status === "expired" ? "stopped" : ""}`} role="status">{subLine}</div>}
          <h2>מה עשו השבוע</h2>
          {hh.children.length === 0 && <p>עוד לא חיברתם ילדים. הילדים יוצרים פרופיל באפליקציה שלהם, ואתם נותנים להם קוד.</p>}
          {hh.children.map((c) => (
            <button key={c.id} className={`cloud-kid ${paywall && sub.status === "expired" ? "gray" : ""}`} onClick={() => setView({ name: "child", id: c.id })}>
              <span className={`cloud-dot ${c.lastPracticeAt && new Date(c.lastPracticeAt).toDateString() === new Date().toDateString() ? "on" : ""}`} aria-hidden="true" />
              <span style={{ flex: 1 }}>
                <strong>{c.name}</strong> · {gradeLabel(c.gradeId)}
                <br />
                {c.practicesThisWeek > 0 ? `תרגלו ${c.practicesThisWeek} פעמים` : "עוד לא תרגלו השבוע"}
              </span>
              <span aria-hidden="true">←</span>
            </button>
          ))}
          {hh.children.length < pricing.maxChildren ? (
            <button className="cloud-btn primary" onClick={() => setView({ name: "childCode" })}>חיבור ילד/ה: קוד</button>
          ) : (
            <p className="cloud-footnote">כבר מחוברים {pricing.maxChildren} ילדים</p>
          )}
          {hh.parents.length < pricing.maxParents && <button className="cloud-btn" onClick={() => setView({ name: "invite" })}>הזמנת הורה נוסף</button>}
          {paywall && <button className="cloud-btn" onClick={() => setView({ name: "subscription" })}>מנוי</button>}
          <div className="cloud-row">
            <button className="cloud-link link-button" onClick={() => setView({ name: "connections" })}>חיבורים</button>
            <button className="cloud-link link-button" onClick={() => setView({ name: "privacy" })}>פרטיות</button>
            <button className="cloud-link link-button" onClick={onSignOut}>יציאה</button>
          </div>
          <div className="cloud-error" role="alert">{error}</div>
        </div>
      </div>
    );
  }

  if (view.name === "child") {
    const c = kid(view.id);
    if (!c) return <Shell back={back} error={error} toast={toast} title="הורים"><p>הילד/ה לא נמצא/ה.</p></Shell>;
    return (
      <ChildScreen
        api={api}
        child={c}
        onBack={back}
        onChanged={setHh}
        run={run}
        error={error}
      />
    );
  }

  if (view.name === "childCode") {
    return (
      <Shell back={back} error={error} toast={toast} title="חיבור ילד/ה">
        <p style={{ textAlign: "center" }}>הילדים יוצרים פרופיל באפליקציה שלהם ומקלידים את הקוד, או סורקים אותו.</p>
        <FreshCode make={api.parentChildCode} link={appLinks.kids} share={inviteText.child} qrLabel="QR לחיבור ילד" run={run} />
      </Shell>
    );
  }

  if (view.name === "invite") {
    return (
      <Shell back={back} error={error} toast={toast} title="הזמנת הורה נוסף">
        <p style={{ textAlign: "center" }}>ההורה השני פותח את אפליקציית ההורים ומקליד את הקוד בכניסה, או סורק אותו.</p>
        <FreshCode make={api.parentInvite} link={appLinks.parents} share={inviteText.parent} qrLabel="QR להצטרפות הורה" run={run} />
      </Shell>
    );
  }

  if (view.name === "subscription") {
    return (
      <Shell back={back} error={error} toast={toast} title="מנוי">
        <div className="cloud-pill" role="status">{subLine}</div>
        <p style={{ textAlign: "center" }}>
          <span className="ltr">{pricing.firstMonthNis} ₪</span> לחודש הראשון, אחר כך <span className="ltr">{pricing.laterMonthNis} ₪</span> לחודש
        </p>
        <button
          className="cloud-btn primary"
          onClick={async () => {
            const next = await run(() => api.parentPay());
            if (next) { setHh(next); flash("שולם ✓"); }
          }}
        >
          לשלם <span className="ltr">{sub.nextPriceNis} ₪</span>
        </button>
        <p className="cloud-footnote">שלב בדיקה — אין חיוב אמיתי. התשלום האמיתי יתחבר בהמשך.</p>
        {sub.status !== "expired" && (
          <button
            className="cloud-link link-button"
            onClick={async () => {
              if (!window.confirm("הילדים לא יוכלו לתרגל עד שתחדשו. לבטל את המנוי?")) return;
              const next = await run(() => api.parentCancel());
              if (next) setHh(next);
            }}
          >
            ביטול מנוי
          </button>
        )}
      </Shell>
    );
  }

  if (view.name === "connections") {
    return (
      <Shell back={back} error={error} toast={toast} title="חיבורים">
        <p>הורים <span className="ltr">{hh.parents.length}/{pricing.maxParents}</span></p>
        <ul className="cloud-list">{hh.parents.map((p) => <li key={p.uid}><span className="ltr">{p.email}</span></li>)}</ul>
        <p>ילדים <span className="ltr">{hh.children.length}/{pricing.maxChildren}</span></p>
        {hh.parents.length < pricing.maxParents && <button className="cloud-btn" onClick={() => setView({ name: "invite" })}>הזמנת הורה נוסף</button>}
        {hh.children.length < pricing.maxChildren ? (
          <button className="cloud-btn primary" onClick={() => setView({ name: "childCode" })}>חיבור ילד/ה: קוד</button>
        ) : (
          <p className="cloud-footnote">כבר מחוברים {pricing.maxChildren} ילדים</p>
        )}
      </Shell>
    );
  }

  return (
    <Shell back={back} error={error} toast={toast} title="פרטיות">
      <p><strong>טיוטה — הנוסח הסופי יגיע.</strong></p>
      <p>נשמרים רק: כינוי שהילד/ה בוחר/ת, כיתה וקצב ההתקדמות בתרגולים. לא שם מלא, לא תאריך לידה, לא תמונות.</p>
      <p>רק ההורים בבית רואים את המידע. מחיקת ילד/ה מוחקת את כל המידע עליו/ה.</p>
    </Shell>
  );
}

function Shell({ title, back, error, toast, children }: { title: string; back: () => void; error: string; toast: string; children: React.ReactNode }) {
  return (
    <div className="cloud">
      <div className="cloud-card">
        <button className="cloud-link link-button" onClick={back} style={{ alignSelf: "flex-start" }}>← חזרה</button>
        <h1>{title}</h1>
        {children}
        <div className="cloud-error" role="alert">{error}</div>
        <div className="cloud-toast" role="status">{toast}</div>
      </div>
    </div>
  );
}

/** Asks for a fresh code when the screen opens, and again on request. */
function FreshCode({ make, link, share, qrLabel, run }: {
  make: () => Promise<{ code: string; expiresAt: string }>;
  link: (code: string) => string;
  share: (code: string, link: string) => string;
  qrLabel: string;
  run: <T>(f: () => Promise<T>) => Promise<T | undefined>;
}) {
  const [code, setCode] = useState<string | null>(null);
  const fresh = useCallback(async () => {
    const r = await run(make);
    if (r) setCode(r.code);
  }, [make, run]);
  useEffect(() => { void fresh(); }, [fresh]);
  return (
    <>
      <CodeCard code={code} link={code ? link(code) : ""} qrLabel={qrLabel} shareText={code ? share(code, link(code)) : undefined} />
      <button className="cloud-btn" onClick={fresh}>קוד חדש</button>
    </>
  );
}

function ChildScreen({ api, child, onBack, onChanged, run, error }: {
  api: CloudApi; child: ChildView; onBack: () => void;
  onChanged: (h: HouseholdView) => void; run: <T>(f: () => Promise<T>) => Promise<T | undefined>; error: string;
}) {
  const [progress, setProgress] = useState<ProgressView | null>(null);
  const [confirming, setConfirming] = useState(false);
  useEffect(() => { void run(async () => setProgress(await api.parentProgress(child.id))); }, [api, child.id, run]);
  return (
    <div className="cloud">
      <div className="cloud-card">
        <button className="cloud-link link-button" onClick={onBack} style={{ alignSelf: "flex-start" }}>← חזרה</button>
        <h1>{child.name}</h1>
        <p style={{ textAlign: "center" }}>
          {gradeLabel(child.gradeId)} · {(progress?.practicesThisWeek ?? child.practicesThisWeek) > 0 ? `תרגלו ${progress?.practicesThisWeek ?? child.practicesThisWeek} פעמים השבוע` : "עוד לא תרגלו השבוע"}
        </p>
        {progress && progress.topics.length === 0 && <p style={{ textAlign: "center" }}>עוד אין תרגולים.</p>}
        {progress && progress.topics.length > 0 && (
          <>
            <h2>לפי נושא</h2>
            <ul className="cloud-list" aria-label="התקדמות לפי נושא">
              {progress.topics.map((t) => (
                <li key={`${t.gradeLabel}-${t.topicId}`}>
                  <strong>{t.topicTitle}</strong> · {t.gradeLabel}
                  <br />
                  <span className="ltr">{t.correct}/{t.total}</span> נכון (<span className="ltr">{t.percent}%</span>) · {t.practices} תרגולים
                  {t.level !== null && <> · רמה <span className="ltr">{t.level}</span></>} · {fmtDate(t.lastAt)}
                </li>
              ))}
            </ul>
            <h2>תרגולים אחרונים</h2>
            <ul className="cloud-list" aria-label="תרגולים אחרונים">
              {progress.recent.map((h) => (
                <li key={h.id}>{h.topicTitle} · <span className="ltr">{h.correct}/{h.total}</span> · {fmtDate(h.at)}</li>
              ))}
            </ul>
          </>
        )}
        <div className="cloud-row">
          <button className="cloud-btn" disabled={child.devicesCount === 0} onClick={async () => { const h = await run(() => api.parentDisconnectDevices(child.id)); if (h) onChanged(h); }}>
            נתק מכשירים ({child.devicesCount})
          </button>
        </div>
        <button className="cloud-link link-button" onClick={() => setConfirming(true)}>מחק את הילד/ה</button>
        <div className="cloud-error" role="alert">{error}</div>
      </div>
      {confirming && (
        <div className="cloud-overlay" role="dialog" aria-modal="true" aria-label="מחיקת ילד/ה">
          <div className="cloud-dialog">
            <p>יימחק הכל: ההתקדמות וההגדרות. אי אפשר לבטל.</p>
            <button className="cloud-btn danger" onClick={async () => { const h = await run(() => api.parentDeleteChild(child.id)); if (h) { onChanged(h); onBack(); } }}>מחק הכל</button>
            <button className="cloud-btn" onClick={() => setConfirming(false)}>ביטול</button>
          </div>
        </div>
      )}
    </div>
  );
}
