import { useState } from "react";
import { StudentPicker } from "./components/StudentPicker";
import { TopicPicker } from "./components/TopicPicker";
import { LevelPicker } from "./components/LevelPicker";
import { History } from "./components/History";
import { Practice } from "./components/Practice";
import { Result } from "./components/Result";
import { students, gradeOf } from "./data/curriculum";
import type { Level, Student, Topic } from "./data/curriculum";
import { recordPractice } from "./data/progress";
import { readAloud as readAloudFor, setReadAloud } from "./data/preferences";
import "./App.css";

const STORAGE_KEY = "learn-math:student";

/** localStorage throws in private mode in some browsers — remembering a preference is
 *  never worth taking the app down with it. */
function loadStudent(): Student | null {
  try {
    const id = localStorage.getItem(STORAGE_KEY);
    return students.find((s) => s.id === id) ?? null;
  } catch {
    return null;
  }
}

function rememberStudent(id: string | null) {
  try {
    if (id === null) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // ignore
  }
}

type Screen =
  | { name: "home" }
  | { name: "levels"; topic: Topic | null }
  | { name: "history" }
  | { name: "practice"; topic: Topic | null; level: Level }
  | { name: "result"; topic: Topic | null; level: Level; correctCount: number };

function App() {
  const [student, setStudent] = useState<Student | null>(loadStudent);
  const [screen, setScreen] = useState<Screen>({ name: "home" });
  /** The read-aloud setting is stored, not held in state; this forces a re-read of it. */
  const [, setReadAloudTick] = useState(0);

  function selectStudent(next: Student) {
    rememberStudent(next.id);
    setStudent(next);
    setScreen({ name: "home" });
  }

  function switchStudent() {
    rememberStudent(null);
    setStudent(null);
    setScreen({ name: "home" });
  }

  if (student === null) {
    return <StudentPicker onSelect={selectStudent} />;
  }

  const grade = gradeOf(student);
  const readAloud = readAloudFor(student.id);

  function finish(topic: Topic | null, level: Level, correctCount: number) {
    recordPractice({
      at: new Date().toISOString(),
      studentId: student!.id,
      gradeLabel: grade.label,
      topicTitle: topic?.title ?? "",
      levelTitle: level.title,
      correct: correctCount,
      total: level.questions.length,
    });
    setScreen({ name: "result", topic, level, correctCount });
  }

  if (screen.name === "home") {
    return (
      <TopicPicker
        gradeLabel={`שלום ${student.name}! · ${grade.label}`}
        topics={grade.topicSets}
        onSelect={(topic) => setScreen({ name: "levels", topic })}
        onBack={switchStudent}
        onHistory={() => setScreen({ name: "history" })}
        readAloud={readAloud}
        onReadAloudChange={(value) => {
          setReadAloud(student.id, value);
          // The value lives in storage, so a render is needed to pick it back up.
          setReadAloudTick((n) => n + 1);
        }}
      />
    );
  }

  if (screen.name === "history") {
    return <History student={student} onBack={() => setScreen({ name: "home" })} />;
  }

  if (screen.name === "levels" && screen.topic !== null) {
    const topic = screen.topic;
    return (
      <LevelPicker
        heading={topic.title}
        subheading={grade.label}
        levels={topic.levels}
        onSelect={(level) => setScreen({ name: "practice", topic, level })}
        onBack={() => setScreen({ name: "home" })}
      />
    );
  }

  if (screen.name === "practice") {
    const { topic, level } = screen;
    return (
      <Practice
        level={level}
        onFinish={(correctCount) => finish(topic, level, correctCount)}
        onExit={() =>
          setScreen(topic === null ? { name: "home" } : { name: "levels", topic })
        }
        readAloud={readAloud}
      />
    );
  }

  if (screen.name === "result") {
    const { topic, level, correctCount } = screen;
    return (
      <Result
        level={level}
        correctCount={correctCount}
        onRetry={() => setScreen({ name: "practice", topic, level })}
        onHome={() =>
          setScreen(topic === null ? { name: "home" } : { name: "levels", topic })
        }
      />
    );
  }

  return <TopicPicker
    gradeLabel={grade.label}
    topics={grade.topicSets}
    onSelect={(topic) => setScreen({ name: "levels", topic })}
    onBack={switchStudent}
    onHistory={() => setScreen({ name: "history" })}
  />;
}

export default App;
