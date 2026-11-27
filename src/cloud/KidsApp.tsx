import { useEffect, useRef, useState } from "react";
import "./cloud.css";
import { grades } from "../data/curriculum";
import { startIdleSpotlightObserver } from "../data/idleSpotlight";
import { CreateStudentDialog } from "../components/CreateStudentDialog";
import { errorText } from "./errors";
import { InstallHint } from "./InstallHint";
import { useDemoLogins } from "./demoContext";
import { setToken, useToken } from "./session";
import type { CloudApi } from "./server/types";
import { ChildApp } from "./ChildApp";

/** A code that came with the link a parent shared (`?code=1234`) — used once, to link the
 *  profile as soon as it exists. */
/** A code that came with a "new phone" link (`?device=1234`). */
const deviceCodeFromUrl = () => new URLSearchParams(window.location.search).get("device")?.replace(/\D/g, "").slice(0, 4) || "";
const linkCodeFromUrl = () => new URLSearchParams(window.location.search).get("code")?.replace(/\D/g, "").slice(0, 4) || "";

/**
 * The kids' app. A child makes their own profile; a parent's code then links it to the family
 * (ChildApp). Nothing here is a parent screen, and the parents' app has nothing of this.
 */
export function KidsApp({ api }: { api: CloudApi }) {
  // Numbers the buttons for the app-wide "one glows at a time" animation (see App.tsx).
  useEffect(() => startIdleSpotlightObserver(), []);
  const token = useToken("child");
  const [creating, setCreating] = useState(false);
  const [oldProfile, setOldProfile] = useState(false);
  const [error, setError] = useState("");
  const [initialCode] = useState(linkCodeFromUrl);
  const [initialDevice] = useState(deviceCodeFromUrl);
  const [reconnecting, setReconnecting] = useState(initialDevice !== "");
  const tried = useRef(false);
  const noToken = !token;
  // A "new phone" link: the code in it is used once, without a tap.
  useEffect(() => {
    if (!noToken || initialDevice === "" || tried.current) return;
    tried.current = true;
    api.childReconnect(initialDevice).then(
      (r) => setToken("child", r.token),
      (e) => {
        setError(errorText(e));
        setReconnecting(false);
      },
    );
  }, [api, initialDevice, noToken]);

  if (token) return <ChildApp api={api} initialCode={initialCode} onLeave={() => setToken("child", undefined)} />;
  if (reconnecting) return <div className="cloud"><div className="cloud-card"><h1>רגע…</h1></div></div>;
  if (oldProfile) {
    return (
      <Reconnect
        onBack={() => setOldProfile(false)}
        onReconnect={async (code) => setToken("child", (await api.childReconnect(code)).token)}
      />
    );
  }
  return (
    <>
      <Landing error={error} onStart={() => { setError(""); setCreating(true); }} onOld={() => setOldProfile(true)} />
      {/* The same "new student" dialog the app has always had: name, grade cards, a picture to pick. */}
      <CreateStudentDialog
        open={creating}
        grades={grades}
        onClose={() => setCreating(false)}
        onCreate={(name, gradeId, avatar) => {
          api.childRegister({ name: name.trim().slice(0, 20), gradeId, avatar }).then(
            (r) => setToken("child", r.token),
            (e) => {
              setCreating(false);
              setError(errorText(e));
            },
          );
        }}
      />
    </>
  );
}

/** The kids' front door. Big, friendly, one button. */
function Landing({ onStart, onOld, error }: { onStart: () => void; onOld: () => void; error: string }) {
  const demo = useDemoLogins();
  return (
    <div className="cloud cloud-landing">
      <div className="cloud-card" style={{ justifyContent: "center", flex: 1 }}>
        <div className="cloud-hero" aria-hidden="true">🧮</div>
        <h1>לומדים חשבון</h1>
        <p className="cloud-lead">תרגילים, כוכבים, וכיף.</p>
        <div className="cloud-error" role="alert">{error}</div>
        <button className="cloud-btn primary" onClick={onStart}>פרופיל חדש</button>
        <button className="cloud-btn" onClick={onOld}>כבר יש לי פרופיל</button>
        <InstallHint appName="לומדים חשבון" />
        {demo && (
          <div className="cloud-demo-logins" role="group" aria-label="כניסה מהירה לדמו">
            <span>🧪 דמו, כניסה מהירה:</span>
            {demo.kids.map((k) => (
              <button key={k.name} type="button" className="cloud-btn" onClick={() => setToken("child", k.token)}>{k.name} · {k.grade}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** A new phone: the parent made a code for this child's profile. */
function Reconnect({ onBack, onReconnect }: { onBack: () => void; onReconnect: (code: string) => Promise<void> }) {
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
            await onReconnect(code);
          } catch (err) {
            setError(errorText(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        <button type="button" className="cloud-link link-button" onClick={onBack} style={{ alignSelf: "flex-start" }}>← חזרה</button>
        <h1>כבר יש לי פרופיל</h1>
        <label htmlFor="device-code" style={{ fontWeight: 600, textAlign: "center" }}>הקלידו את הקוד שההורים נתנו</label>
        <input
          id="device-code"
          className="cloud-input cloud-code-input"
          inputMode="numeric"
          maxLength={4}
          autoComplete="off"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        />
        <div className="cloud-error" role="alert">{error}</div>
        <button className="cloud-btn primary" type="submit" disabled={busy || code.length !== 4}>חיבור</button>
      </form>
    </div>
  );
}
