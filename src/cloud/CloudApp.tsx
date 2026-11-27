import { useEffect, useMemo, useRef, useState } from "react";
import "./cloud.css";
import { startIdleSpotlightObserver } from "../data/idleSpotlight";
import { apiUrl, cloudMode } from "./config";
import { createHttpApi } from "./httpApi";
import { createLocalApi, demoClock } from "./localApi";
import { completeEmailLinkSignIn, currentIdToken, realAuth, sendSignInLink, signInWithGoogle, signOutParent } from "./parentAuth";
import { readSession, writeSession, type CloudSession } from "./session";
import { ApiError, type CloudApi } from "./server/types";
import { ParentApp } from "./ParentApp";
import { ChildApp } from "./ChildApp";

export function errorText(e: unknown): string {
  const code = e instanceof ApiError ? e.code : "";
  return (
    {
      bad_code: "הקוד לא נכון",
      too_many_attempts: "יותר מדי ניסיונות. נסו שוב עוד כמה דקות",
      offline: "אין חיבור עכשיו",
      children_full: "כבר מחוברים 3 ילדים",
      parents_full: "כבר מחוברים 2 הורים",
      bad_name: "כתבו שם של עד 20 תווים",
      devices_full: "כבר מחוברים 3 מכשירים לילד/ה הזה",
    } as Record<string, string>
  )[code] ?? "משהו השתבש. נסו שוב";
}

export default function CloudApp() {
  const [session, setSession] = useState<CloudSession>(readSession);
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const [parentIn, setParentIn] = useState<boolean>(!realAuth && !!session.parentToken);
  const [booting, setBooting] = useState(realAuth);
  const [view, setView] = useState<"entry" | "gate" | "signin">("entry");
  const [joinCode, setJoinCode] = useState("");
  /** Bumped by the demo bar to make the open screen reload its data (no full page reload). */
  const [epoch, setEpoch] = useState(0);

  // The app-wide "one button glows at a time" animation numbers the buttons through this observer
  // (App.tsx starts it for the old app). Without it every button defaults to the same slot and
  // they all pulse together.
  useEffect(() => startIdleSpotlightObserver(), []);

  const api: CloudApi = useMemo(
    () =>
      cloudMode === "mock"
        ? createLocalApi({ parent: () => sessionRef.current.parentToken, child: () => sessionRef.current.childToken })
        : createHttpApi(apiUrl, {
            parent: async () => (realAuth ? await currentIdToken() : sessionRef.current.parentToken),
            child: () => sessionRef.current.childToken,
          }),
    [],
  );

  function update(next: CloudSession) {
    setSession(next);
    sessionRef.current = next;
    writeSession(next);
  }

  useEffect(() => {
    if (!realAuth) return;
    (async () => {
      try {
        await completeEmailLinkSignIn();
        setParentIn(!!(await currentIdToken()));
      } finally {
        setBooting(false);
      }
    })();
  }, []);

  if (booting) return <div className="cloud"><div className="cloud-card"><h1>רגע…</h1></div></div>;

  const demo = cloudMode === "mock" && (
    <DemoBar
      onAdvance={() => {
        demoClock().advanceDays(8);
        setEpoch((n) => n + 1);
      }}
      onReset={() => {
        demoClock().reset();
        writeSession({});
        window.location.reload();
      }}
      onSwitch={() => {
        update({});
        setParentIn(false);
        setView("entry");
      }}
    />
  );

  if (session.childToken) {
    return (
      <>
        <ChildApp key={epoch} api={api} onLeave={() => update({ ...session, childToken: undefined })} />
        {demo}
      </>
    );
  }

  if (parentIn) {
    return (
      <>
        <ParentApp
          key={epoch}
          api={api}
          joinCode={joinCode}
          onSignOut={async () => {
            await signOutParent();
            update({ ...session, parentToken: undefined });
            setParentIn(false);
            setView("entry");
            setJoinCode("");
          }}
        />
        {demo}
      </>
    );
  }

  return (
    <>
      {view === "entry" && (
        <Entry
          onConnect={async (code) => {
            const { token } = await api.childConnect(code);
            update({ ...session, childToken: token });
          }}
          onParents={() => setView("gate")}
        />
      )}
      {view === "gate" && <ParentGate onPass={() => setView("signin")} onBack={() => setView("entry")} />}
      {view === "signin" && (
        <ParentSignIn
          onBack={() => setView("entry")}
          onDevSignIn={(email, code) => {
            setJoinCode(code);
            update({ ...session, parentToken: `dev:${email}` });
            setParentIn(true);
          }}
          onFirebaseSignedIn={(code) => {
            setJoinCode(code);
            setParentIn(true);
          }}
        />
      )}
      {demo}
    </>
  );
}

function Entry({ onConnect, onParents }: { onConnect: (code: string) => Promise<void>; onParents: () => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="cloud">
      <form
        className="cloud-card"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await onConnect(code);
          } catch (err) {
            setError(errorText(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        <h1>לומדים חשבון</h1>
        <label htmlFor="child-code" style={{ textAlign: "center", fontWeight: 600 }}>הקלידו את הקוד</label>
        <input
          id="child-code"
          className="cloud-input cloud-code-input"
          inputMode="numeric"
          maxLength={4}
          autoComplete="off"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        />
        <div className="cloud-error" role="alert">{error}</div>
        <button className="cloud-btn primary" type="submit" disabled={busy || code.length !== 4}>התחבר</button>
        <button type="button" className="cloud-link link-button" onClick={onParents}>👪 הורים</button>
      </form>
    </div>
  );
}

/** A grown-up check, not security: a child who can multiply 7 × 8 can also ask for help. */
function ParentGate({ onPass, onBack }: { onPass: () => void; onBack: () => void }) {
  const [q] = useState(() => ({ a: 3 + Math.floor(Math.random() * 7), b: 3 + Math.floor(Math.random() * 7) }));
  const [value, setValue] = useState("");
  const [wrong, setWrong] = useState(false);
  return (
    <div className="cloud">
      <form
        className="cloud-card"
        onSubmit={(e) => {
          e.preventDefault();
          if (Number(value) === q.a * q.b) onPass();
          else setWrong(true);
        }}
      >
        <h1>רק להורים</h1>
        <p style={{ textAlign: "center" }}>
          כמה זה <span className="ltr">{q.a} × {q.b}</span>?
        </p>
        <input className="cloud-input cloud-code-input" inputMode="numeric" aria-label="תשובה" value={value} onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))} />
        <div className="cloud-error" role="alert">{wrong ? "לא מדויק. נסו שוב" : ""}</div>
        <button className="cloud-btn primary" type="submit" disabled={!value}>המשך</button>
        <button type="button" className="cloud-link link-button" onClick={onBack}>← חזרה</button>
      </form>
    </div>
  );
}

function ParentSignIn({
  onBack,
  onDevSignIn,
  onFirebaseSignedIn,
}: {
  onBack: () => void;
  onDevSignIn: (email: string, joinCode: string) => void;
  onFirebaseSignedIn: (joinCode: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [join, setJoin] = useState("");
  const [msg, setMsg] = useState("");
  return (
    <div className="cloud">
      <form
        className="cloud-card"
        onSubmit={async (e) => {
          e.preventDefault();
          setMsg("");
          if (!realAuth) return onDevSignIn(email.trim(), join.trim());
          try {
            await sendSignInLink(email.trim());
            setMsg("שלחנו קישור למייל. פתחו אותו במכשיר הזה");
          } catch {
            setMsg("לא הצלחנו לשלוח. נסו שוב");
          }
        }}
      >
        <h1>כניסת הורים</h1>
        <label htmlFor="parent-email">מייל</label>
        <input id="parent-email" className="cloud-input" type="email" dir="ltr" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <label htmlFor="join-code">קוד הצטרפות (להורה השני, אם יש)</label>
        <input id="join-code" className="cloud-input" inputMode="numeric" maxLength={4} dir="ltr" value={join} onChange={(e) => setJoin(e.target.value.replace(/\D/g, ""))} />
        <button className="cloud-btn primary" type="submit">{realAuth ? "שלחו לי קישור למייל" : "כניסה"}</button>
        {realAuth && (
          <button
            type="button"
            className="cloud-btn"
            onClick={async () => {
              try {
                await signInWithGoogle();
                onFirebaseSignedIn(join.trim());
              } catch {
                setMsg("הכניסה עם גוגל לא הצליחה");
              }
            }}
          >
            כניסה עם גוגל
          </button>
        )}
        {!realAuth && <p className="cloud-footnote">מצב בדיקה: אין סיסמה. בגרסה האמיתית נכנסים עם גוגל או קישור במייל.</p>}
        <div className="cloud-toast" role="status">{msg}</div>
        <button type="button" className="cloud-link link-button" onClick={onBack}>← חזרה</button>
      </form>
    </div>
  );
}

function DemoBar({ onAdvance, onReset, onSwitch }: { onAdvance: () => void; onReset: () => void; onSwitch: () => void }) {
  return (
    <div className="cloud-demo" role="group" aria-label="כלי דמו">
      <span>🧪 דמו</span>
      <button type="button" className="link-button" onClick={onAdvance}>⏩ +8 ימים</button>
      <button type="button" className="link-button" onClick={onSwitch}>🔀 החלף תפקיד</button>
      <button type="button" className="link-button" onClick={onReset}>🗑️ אפס הכל</button>
    </div>
  );
}
