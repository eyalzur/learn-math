import { useEffect, useState } from "react";
import "./cloud.css";
import { grades } from "../data/curriculum";
import { startIdleSpotlightObserver } from "../data/idleSpotlight";
import { CreateStudentDialog } from "../components/CreateStudentDialog";
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
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [initialCode] = useState(linkCodeFromUrl);

  if (token) return <ChildApp api={api} initialCode={initialCode} onLeave={() => setToken("child", undefined)} />;
  return (
    <>
      <Landing error={error} onStart={() => { setError(""); setCreating(true); }} />
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
function Landing({ onStart, error }: { onStart: () => void; error: string }) {
  return (
    <div className="cloud cloud-landing">
      <div className="cloud-card" style={{ justifyContent: "center", flex: 1 }}>
        <div className="cloud-hero" aria-hidden="true">🧮</div>
        <h1>לומדים חשבון</h1>
        <p className="cloud-lead">תרגילים, כוכבים, וכיף.</p>
        <div className="cloud-error" role="alert">{error}</div>
        <button className="cloud-btn primary" onClick={onStart}>פרופיל חדש</button>
        <InstallHint appName="לומדים חשבון" />
      </div>
    </div>
  );
}
