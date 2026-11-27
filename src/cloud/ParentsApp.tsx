import { useEffect, useState } from "react";
import "./cloud.css";
import { startIdleSpotlightObserver } from "../data/idleSpotlight";
import { completeEmailLinkSignIn, currentIdToken, realAuth, sendSignInLink, signInWithGoogle, signOutParent } from "./parentAuth";
import { setToken, useToken } from "./session";
import type { CloudApi } from "./server/types";
import { ParentApp } from "./ParentApp";
import { InstallHint } from "./InstallHint";
import { useDemoLogins } from "./demoContext";

/** A code that came with the link a parent shared (`?join=1234`). */
const joinFromUrl = () => new URLSearchParams(window.location.search).get("join")?.replace(/\D/g, "").slice(0, 4) || "";

/** The parents' app: sign in, then everything about the household. A separate app from the
 *  kids' one (own page, own install) — it has no child screens and the kids' app has none of
 *  these, so there is no gate to get past. */
export function ParentsApp({ api }: { api: CloudApi }) {
  useEffect(() => startIdleSpotlightObserver(), []);
  const token = useToken("parent");
  const [firebaseIn, setFirebaseIn] = useState(false);
  const [booting, setBooting] = useState(realAuth);
  const [joinCode, setJoinCode] = useState("");
  const [initialJoin] = useState(joinFromUrl);

  useEffect(() => {
    if (!realAuth) return;
    (async () => {
      try {
        await completeEmailLinkSignIn();
        setFirebaseIn(!!(await currentIdToken()));
      } finally {
        setBooting(false);
      }
    })();
  }, []);

  if (booting) return <div className="cloud"><div className="cloud-card"><h1>רגע…</h1></div></div>;

  if (realAuth ? firebaseIn : !!token) {
    return (
      <ParentApp
        api={api}
        joinCode={joinCode}
        onSignOut={async () => {
          await signOutParent();
          setToken("parent", undefined);
          setFirebaseIn(false);
          setJoinCode("");
        }}
      />
    );
  }
  return (
    <ParentSignIn
      initialJoin={initialJoin}
      onDevSignIn={(email, code) => {
        setJoinCode(code);
        setToken("parent", `dev:${email}`);
      }}
      onFirebaseSignedIn={(code) => {
        setJoinCode(code);
        setFirebaseIn(true);
      }}
    />
  );
}

export function ParentSignIn({
  initialJoin,
  onDevSignIn,
  onFirebaseSignedIn,
}: {
  initialJoin: string;
  onDevSignIn: (email: string, joinCode: string) => void;
  onFirebaseSignedIn: (joinCode: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [join, setJoin] = useState(initialJoin);
  const demo = useDemoLogins();
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
        <div className="cloud-hero" aria-hidden="true">👪</div>
        <h1>אפליקציית ההורים</h1>
        <p className="cloud-lead">מנוי אחד לכל הבית. מחברים את הילדים ועוקבים אחרי התרגול.</p>
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
        <InstallHint appName="אפליקציית ההורים" />
        {demo && (
          <div className="cloud-demo-logins" role="group" aria-label="כניסה מהירה לדמו">
            <span>🧪 דמו, כניסה מהירה:</span>
            {demo.parents.map((p) => (
              <button key={p.name} type="button" className="cloud-btn" onClick={() => onDevSignIn(p.token.slice(4), "")}>כניסה כ{p.name}</button>
            ))}
          </div>
        )}
      </form>
    </div>
  );
}

