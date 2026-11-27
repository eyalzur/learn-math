import { useEffect, useState } from "react";
import "./cloud.css";
import { startIdleSpotlightObserver } from "../data/idleSpotlight";
import { errorText } from "./errors";
import { setToken, useToken } from "./session";
import type { CloudApi } from "./server/types";
import { ChildApp } from "./ChildApp";

/** The kids' app: a code from a parent, then practice. Nothing else — no sign-in, no parent
 *  screens, no way to reach them. */
export function KidsApp({ api }: { api: CloudApi }) {
  // Numbers the buttons for the app-wide "one glows at a time" animation (see App.tsx).
  useEffect(() => startIdleSpotlightObserver(), []);
  const token = useToken("child");
  if (token) return <ChildApp api={api} onLeave={() => setToken("child", undefined)} />;
  return <Connect onConnect={async (code) => setToken("child", (await api.childConnect(code)).token)} />;
}

function Connect({ onConnect }: { onConnect: (code: string) => Promise<void> }) {
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
      </form>
    </div>
  );
}
