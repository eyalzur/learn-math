import { useCallback, useEffect, useState } from "react";
import { gradeById, type Question, type Topic } from "../data/curriculum";
import type { Lesson } from "../data/style";
import { avatarFor } from "../data/avatars";
import type { PaceLevel } from "../data/adaptivePace";
import { speak, speechSupported } from "../data/speech";
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

/**
 * The child's side in cloud mode. Everything about the child — who they are, whether they may
 * practise, which questions they get — comes from the server. The practice screen itself is the
 * same `Practice` component as before.
 */
export function ChildApp({ api, onLeave }: { api: CloudApi; onLeave: () => void }) {
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

  if (stopped || !me.subscription.active) {
    return <StopScreen onRefresh={() => { setStopped(false); setScreen({ name: "home" }); void load(); }} />;
  }

  const grade = gradeById(me.child.gradeId);
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
      if (e instanceof ApiError && e.code === "subscription_inactive") setStopped(true);
      else setOffline(true);
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
                if (r.stopped) setStopped(true);
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
    <>
      <TopicPicker
        studentId={me.child.id}
        gradeLabel={`שלום ${me.child.name}! · ${grade.label}`}
        topics={grade.topicSets}
        onSelect={(t) => void start(t)}
        onBack={() => void load()}
        backLabel="↻ רענון"
        onOpenSettings={() => setSettingsOpen(true)}
        avatar={avatarFor({ id: me.child.id, avatar: me.child.avatar })}
        {...settingsProps}
      />
      {settingsOpen && <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} {...settingsProps} />}
      {offlineBar}
    </>
  );
}

function StopScreen({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div className="cloud">
      <div className="cloud-card cloud-stop">
        <div className="emoji" aria-hidden="true">🌙</div>
        <h1>{STOP_TEXT}</h1>
        {speechSupported() && <button className="cloud-btn" onClick={() => speak([STOP_TEXT])} aria-label="הקראה">🔊</button>}
        <button className="cloud-link link-button" onClick={onRefresh}>↻</button>
      </div>
    </div>
  );
}
