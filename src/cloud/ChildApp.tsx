import { useCallback, useEffect, useRef, useState } from "react";
import { gradeById, type Question, type Topic } from "../data/curriculum";
import type { Lesson } from "../data/style";
import { avatarFor } from "../data/avatars";
import type { PaceLevel } from "../data/adaptivePace";
import { speak, speechSupported } from "../data/speech";
import { showError } from "./errors";
import { feedback } from "./feedback";
import { Practice } from "../components/Practice";
import { Result } from "../components/Result";
import { SettingsDialog } from "../components/SettingsDialog";
import { TopicPicker } from "../components/TopicPicker";
import { ApiError, type ChildMe, type CloudApi, type SessionView } from "./server/types";

type Screen =
  | { name: "home" }
  | { name: "practice"; session: SessionView; questions: Question[] }
  | { name: "result"; lesson: Lesson; correctCount: number; topic: Topic };

const STOP_TEXT = "בקשו מההורים להמשיך";

/** The picture the child chose sits in the greeting. (The old profile drawer belongs to the on-device
 *  roster; here nothing about the child lives on the device, so there is no drawer yet.) */
const gradeLine = (name: string, label: string, emoji: string) => `${emoji} שלום ${name}! · ${label}`;

/**
 * The child's side in cloud mode. Everything about the child — who they are, whether they may
 * practise, which questions they get — comes from the server. The practice screen itself is the
 * same `Practice` component as before.
 */
export function ChildApp({ api, initialCode, onLeave }: { api: CloudApi; initialCode: string; onLeave: () => void }) {
  const [me, setMe] = useState<ChildMe | null>(null);
  const [screen, setScreen] = useState<Screen>({ name: "home" });
  const [stopped, setStopped] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [offline, setOffline] = useState(false);

  const load = useCallback(async () => {
    try {
      const next = await api.childMe();
      setMe(next);
      setOffline(false);
    } catch (e) {
      if (e instanceof ApiError && (e.code === "device_revoked" || e.code === "unauthorized")) onLeave();
      else setOffline(true);
    }
  }, [api, onLeave]);

  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(t);
  }, [load]);

  if (!me) {
    return <div className="cloud"><div className="cloud-card"><h1>{offline ? "אין חיבור עכשיו" : "רגע…"}</h1>{offline && <button className="cloud-btn" onClick={() => void load()}>נסו שוב</button>}</div></div>;
  }

  const grade = gradeById(me.child.gradeId);
  const locked = stopped || !me.subscription.active;
  const readAloud = me.settings.readAloud;
  const setSettings = async (patch: Partial<ChildMe["settings"]>) => setMe({ ...me, settings: await api.childSetSettings(patch) });
  const settingsProps = {
    readAloud,
    onReadAloudChange: (v: boolean) => void setSettings({ readAloud: v }),
    paceLevel: me.settings.pace as PaceLevel,
    onPaceLevelChange: (id: string) => void setSettings({ pace: id as ChildMe["settings"]["pace"] }),
  };

  async function start(topic: Topic) {
    try {
      const session = await api.childStartSession({ gradeId: me!.child.gradeId, topicId: topic.id });
      setScreen({ name: "practice", session, questions: session.questions });
    } catch (e) {
      if (e instanceof ApiError && e.code === "subscription_inactive") {
        setStopped(true);
        void load();
      } else setOffline(true);
    }
  }

  const offlineBar = offline && <div className="cloud-banner stopped" role="alert" style={{ position: "fixed", bottom: 8, left: 8, right: 8, zIndex: 40 }}>אין חיבור עכשיו</div>;

  if (screen.name === "practice") {
    const { session, questions } = screen;
    const lesson: Lesson = { title: session.title, questions };
    return (
      <>
        <Practice
          lesson={lesson}
          readAloud={readAloud}
          studentId={me.child.id}
          onDisableReadAloud={() => settingsProps.onReadAloudChange(false)}
          initialIndex={session.resume?.index}
          initialCorrectCount={session.resume?.correctCount}
          onAnswered={(correct) => {
            api.childAnswer(session.sessionId, correct).then(
              (r) => {
                setOffline(false);
                if (r.stopped) {
                  setStopped(true);
                  void load();
                }
                // The next question is replaced with the one the server drew at the new
                // difficulty — it is shown after the feedback, so there is time for this to land.
                else if (r.nextQuestion) setScreen((s) => (s.name === "practice" ? { ...s, questions: s.questions.map((q, i) => (i === r.index ? r.nextQuestion! : q)) } : s));
              },
              () => setOffline(true),
            );
          }}
          onFinish={async (correctCount) => {
            await api.childFinish(session.sessionId).catch(() => setOffline(true));
            const topic = grade.topicSets.find((t) => t.id === session.topicId)!;
            setScreen({ name: "result", lesson, correctCount, topic });
          }}
          onExit={() => setScreen({ name: "home" })}
        />
        {offlineBar}
      </>
    );
  }

  if (screen.name === "result") {
    return (
      <Result
        lesson={screen.lesson}
        correctCount={screen.correctCount}
        onRetry={() => void start(screen.topic)}
        onHome={() => { setScreen({ name: "home" }); void load(); }}
      />
    );
  }

  return (
    <div className="cloud-kids-scope">
      <TopicPicker
        studentId={me.child.id}
        gradeLabel={gradeLine(me.child.name, grade.label, avatarFor({ id: me.child.id, avatar: me.child.avatar }).emoji)}
        locked={locked}
        topics={grade.topicSets}
        onSelect={(t) => void start(t)}
        onBack={() => void load()}
        backLabel="↻ רענון"
        onOpenSettings={() => setSettingsOpen(true)}
        avatar={avatarFor({ id: me.child.id, avatar: me.child.avatar })}
        {...settingsProps}
      />
      {locked && <div aria-hidden="true" style={{ height: 220 }} />}
      {locked && (
        <LockPanel
          me={me}
          api={api}
          initialCode={initialCode}
          onLinked={(next) => {
            setMe(next);
            setStopped(false);
          }}
          onRefresh={() => {
            setStopped(false);
            void load();
          }}
        />
      )}
      {settingsOpen && <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} {...settingsProps} />}
      {offlineBar}
    </div>
  );
}

/**
 * Why the topics are locked, and what to do about it. No profile link yet: type the parent's
 * code. Linked but the subscription ended: nothing to do here, a parent has to renew.
 */
function LockPanel({
  me,
  api,
  initialCode,
  onLinked,
  onRefresh,
}: {
  me: ChildMe;
  api: CloudApi;
  initialCode: string;
  onLinked: (me: ChildMe) => void;
  onRefresh: () => void;
}) {
  const [code, setCode] = useState(initialCode);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [linked, setLinked] = useState(false);
  const tried = useRef(false);

  async function link(value: string) {
    setBusy(true);
    setError("");
    try {
      const next = await api.childLink(value);
      feedback.success('small');
      // Visible success first (INTERACTIONS: 250ms), then the screen changes.
      setLinked(true);
      await new Promise((r) => setTimeout(r, 400));
      onLinked(next);
    } catch (e) {
      setError(showError(e));
    } finally {
      setBusy(false);
    }
  }

  // A code that arrived with the link (a scanned QR) is tried once, without a tap.
  useEffect(() => {
    if (me.linked || tried.current || initialCode.length !== 4) return;
    tried.current = true;
    void link(initialCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="cloud-lock-panel" role="region" aria-label="נעול">
      {me.linked ? (
        <>
          <strong>{STOP_TEXT}</strong>
          <div className="cloud-row">
            {speechSupported() && <button className="cloud-btn" onClick={() => speak([STOP_TEXT])} aria-label="הקראה">🔊</button>}
            <button className="cloud-btn" onClick={onRefresh} aria-label="בדקו שוב">↻</button>
          </div>
        </>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void link(code);
          }}
          style={{ display: "flex", flexDirection: "column", gap: 8 }}
        >
          <label htmlFor="parent-code" style={{ fontWeight: 600, textAlign: "center" }}>הקלידו את הקוד של ההורים</label>
          <input
            id="parent-code"
            className="cloud-input cloud-code-input"
            inputMode="numeric"
            maxLength={4}
            autoComplete="off"
            placeholder="····"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          />
          <div className="cloud-error" role="alert">{error}</div>
          <button className={`cloud-btn primary${linked ? " success" : ""}`} type="submit" disabled={busy || linked || code.length !== 4}>{linked ? "✓ מחוברים!" : "חיבור"}</button>
        </form>
      )}
    </div>
  );
}
