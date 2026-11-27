import { useMemo, useState } from "react";
import "./cloud.css";
import { demoClock } from "./localApi";
import { makeApi } from "./makeApi";
import { clearAllTokens } from "./session";
import { KidsApp } from "./KidsApp";
import { ParentsApp } from "./ParentsApp";

/**
 * Preview only: the two separate apps side by side, tab by tab, on one in-page backend — so
 * "the parent adds a child, the child types the code" can be tried in one place. In the real
 * product these are two pages (`/` and `/parents/`) that never meet in one screen.
 */
export function DemoApp() {
  const api = useMemo(() => makeApi(), []);
  const [tab, setTab] = useState<"parents" | "kids">("parents");
  const [epoch, setEpoch] = useState(0);
  return (
    <>
      <div className="cloud-tabs" role="tablist" aria-label="האפליקציות">
        <button role="tab" aria-selected={tab === "parents"} className={`link-button ${tab === "parents" ? "on" : ""}`} onClick={() => setTab("parents")}>📱 אפליקציית ההורים</button>
        <button role="tab" aria-selected={tab === "kids"} className={`link-button ${tab === "kids" ? "on" : ""}`} onClick={() => setTab("kids")}>📱 אפליקציית הילדים</button>
      </div>
      <div key={`${tab}-${epoch}`} style={{ paddingTop: 44 }}>
        {tab === "parents" ? <ParentsApp api={api} /> : <KidsApp api={api} />}
      </div>
      <div className="cloud-demo" role="group" aria-label="כלי דמו">
        <span>🧪 דמו</span>
        <button type="button" className="link-button" onClick={() => { demoClock().advanceDays(8); setEpoch((n) => n + 1); }}>⏩ +8 ימים</button>
        <button type="button" className="link-button" onClick={() => { demoClock().reset(); clearAllTokens(); window.location.reload(); }}>🗑️ אפס הכל</button>
      </div>
    </>
  );
}
