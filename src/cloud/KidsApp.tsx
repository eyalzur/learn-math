import { useEffect, useState } from "react";
import "./cloud.css";
import { grades } from "../data/curriculum";
import { startIdleSpotlightObserver } from "../data/idleSpotlight";
import { errorText } from "./errors";
import { InstallHint } from "./InstallHint";
import { setToken, useToken } from "./session";
import type { CloudApi } from "./server/types";
import { ChildApp } from "./ChildApp";

/** A code that came with the link a parent shared (`?code=1234`) — used once, to link the
 *  profile as soon as it exists. */
const linkCodeFromUrl = () => new URLSearchParams(window.location.search).get("code")?.replace(/\D/g, "").slice(0, 4) || "";

/**
 * The kids' app. A child makes their own profile; a parent's code then links it to the family
 * (ChildApp). Nothing here is a parent screen, and the parents' app has nothing of this.
 */
export function KidsApp({ api }: { api: CloudApi }) {
  // Numbers the buttons for the app-wide "one glows at a time" animation (see App.tsx).
  useEffect(() => startIdleSpotlightObserver(), []);
  const token = useToken("child");
  const [step, setStep] = useState<"landing" | "profile">("landing");
  const [initialCode] = useState(linkCodeFromUrl);

  if (token) return <ChildApp api={api} initialCode={initialCode} onLeave={() => setToken("child", undefined)} />;
  if (step === "landing") return <Landing onStart={() => setStep("profile")} />;
  return (
    <NewProfile
      onBack={() => setStep("landing")}
      onCreate={async (name, gradeId) => setToken("child", (await api.childRegister({ name, gradeId })).token)}
    />
  );
}

/** The kids' front door. Big, friendly, one button. */
function Landing({ onStart }: { onStart: () => void }) {
  return (
    <div className="cloud cloud-landing">
      <div className="cloud-card" style={{ justifyContent: "center", flex: 1 }}>
        <div className="cloud-hero" aria-hidden="true">🧮</div>
        <h1>לומדים חשבון</h1>
        <p className="cloud-lead">תרגילים, כוכבים, וכיף.</p>
        <button className="cloud-btn primary" onClick={onStart}>פרופיל חדש</button>
        <InstallHint appName="לומדים חשבון" />
      </div>
    </div>
  );
}

function NewProfile({ onBack, onCreate }: { onBack: () => void; onCreate: (name: string, gradeId: string) => Promise<void> }) {
  const [name, setName] = useState("");
  const [gradeId, setGradeId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="cloud">
      <form
        className="cloud-card"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!gradeId) return;
          setBusy(true);
          setError("");
          try {
            await onCreate(name.trim(), gradeId);
          } catch (err) {
            setError(errorText(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        <button type="button" className="cloud-link link-button" onClick={onBack} style={{ alignSelf: "flex-start" }}>← חזרה</button>
        <h1>פרופיל חדש</h1>
        <label htmlFor="profile-name" style={{ fontWeight: 600 }}>איך קוראים לך?</label>
        <input id="profile-name" className="cloud-input" maxLength={20} autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} />
        <div style={{ fontWeight: 600 }} id="profile-grade-label">באיזו כיתה?</div>
        <div className="cloud-days" role="group" aria-labelledby="profile-grade-label">
          {grades.map((g) => (
            <button
              key={g.id}
              type="button"
              className={`cloud-day ${gradeId === g.id ? "on" : ""}`}
              aria-label={g.label}
              aria-pressed={gradeId === g.id}
              onClick={() => setGradeId(g.id)}
            >
              {g.shortLabel}
            </button>
          ))}
        </div>
        <div className="cloud-error" role="alert">{error}</div>
        <button className="cloud-btn primary" type="submit" disabled={busy || !name.trim() || !gradeId}>יצירת פרופיל</button>
      </form>
    </div>
  );
}
