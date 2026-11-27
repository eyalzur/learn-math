import { useEffect, useMemo, useState } from "react";
import "./cloud.css";
import { demoClock } from "./localApi";
import { createLocalApi } from "./localApi";
import { DemoLoginsContext } from "./demoContext";
import type { DemoLogins } from "./demoSeed";
import type { CloudApi } from "./server/types";
import { clearAllTokens, getToken } from "./session";
import { gradeById } from "../data/curriculum";
import { KidsApp } from "./KidsApp";
import { ParentsApp } from "./ParentsApp";

/**
 * Preview only: the two separate apps side by side, tab by tab, on one in-page backend — so
 * "the parent adds a child, the child types the code" can be tried in one place. In the real
 * product these are two pages (`/` and `/parents/`) that never meet in one screen.
 */
/** Demo shortcut: the connected child "practises" once (every second answer right) through the same
 *  calls the app makes — so the parents' progress screen has something to show without answering 20 questions. */
async function samplePractice(api: CloudApi): Promise<string> {
  if (!getToken("child")) return "קודם יוצרים פרופיל ילד באפליקציית הילדים";
  const me = await api.childMe();
  if (!me.subscription.active) return "הילד עוד לא מחובר להורים";
  const topic = gradeById(me.child.gradeId).topicSets.find((t) => t.adaptive) ?? gradeById(me.child.gradeId).topicSets[0];
  const session = await api.childStartSession({ gradeId: me.child.gradeId, topicId: topic.id });
  for (let i = session.resume?.index ?? 0; i < session.questions.length; i++) await api.childAnswer(session.sessionId, i % 2 === 0);
  await api.childFinish(session.sessionId);
  return `נוסף תרגול לדוגמה: ${topic.title}`;
}

export function DemoApp() {
  const api = useMemo(() => createLocalApi({ parent: () => getToken("parent"), child: () => getToken("child") }), []);
  const [logins, setLogins] = useState<DemoLogins | null>(null);
  useEffect(() => {
    void api.seedDemo().then(setLogins);
  }, [api]);
  const [tab, setTab] = useState<"parents" | "kids">("parents");
  const [epoch, setEpoch] = useState(0);
  const [note, setNote] = useState("");
  if (!logins) return <div className="cloud"><div className="cloud-card"><h1>מכינים את הדמו…</h1></div></div>;
  return (
    <DemoLoginsContext.Provider value={logins}>
      <div className="cloud-tabs" role="tablist" aria-label="האפליקציות">
        <button role="tab" aria-selected={tab === "parents"} className={`link-button ${tab === "parents" ? "on" : ""}`} onClick={() => setTab("parents")}>📱 אפליקציית ההורים</button>
        <button role="tab" aria-selected={tab === "kids"} className={`link-button ${tab === "kids" ? "on" : ""}`} onClick={() => setTab("kids")}>📱 אפליקציית הילדים</button>
        <span className="cloud-tabs-tools" role="group" aria-label="כלי דמו">
          <span>🧪 דמו:</span>
          <button type="button" className="link-button" onClick={() => void samplePractice(api).then((m) => { setNote(m); setEpoch((n) => n + 1); }, () => setNote("לא הצלחתי"))}>➕ תרגול לדוגמה</button>
          {import.meta.env.VITE_PAYWALL === "1" && (
            <button type="button" className="link-button" onClick={() => { demoClock().advanceDays(8); setEpoch((n) => n + 1); }}>⏩ +8 ימים</button>
          )}
          <button type="button" className="link-button" onClick={() => { demoClock().reset(); clearAllTokens(); window.location.reload(); }}>🗑️ אפס הכל</button>
        </span>
        {note && <span className="cloud-tabs-tools" role="status">{note}</span>}
      </div>
      <div key={`${tab}-${epoch}`} style={{ paddingTop: 104 }}>
        {tab === "parents" ? <ParentsApp api={api} /> : <KidsApp api={api} />}
      </div>
    </DemoLoginsContext.Provider>
  );
}
