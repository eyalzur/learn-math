import { useState } from "react";
import { StudentPicker } from "./components/StudentPicker";
import { GradePicker } from "./components/GradePicker";
import { TopicPicker } from "./components/TopicPicker";
import { LevelPicker } from "./components/LevelPicker";
import { StylePicker } from "./components/StylePicker";
import { History } from "./components/History";
import { Practice } from "./components/Practice";
import { Result } from "./components/Result";
import { students, availableGrades } from "./data/curriculum";
import type { Student, Topic } from "./data/curriculum";
import type { Lesson } from "./data/style";
import { hasStyleLessons, stylesOf } from "./data/style";
import { speak, speechParts } from "./data/speech";
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
  | { name: "styles"; topic: Topic }
  | { name: "history" }
  | { name: "practice"; topic: Topic | null; lesson: Lesson }
  | { name: "result"; topic: Topic | null; lesson: Lesson; correctCount: number };

/**
 * Where a topic is entered, and where leaving it returns to — computed, never remembered.
 *
 * A topic with more than one style is entered by picking a style, so that is also where
 * "back" goes. Storing the origin in state instead would let it drift out of step with
 * the data and drop a seven-year-old on a screen she was never on; a function of the
 * topic cannot.
 */
function insideTopic(topic: Topic | null): Screen {
  if (topic === null) return { name: "home" };
  return hasStyleLessons(topic) ? { name: "styles", topic } : { name: "levels", topic };
}

function App() {
  const [student, setStudent] = useState<Student | null>(loadStudent);
  const [screen, setScreen] = useState<Screen>({ name: "home" });
  /** Which of the student's available grades is active. Not part of `Screen` — like
   *  `student`, it is decided before any screen renders, and every place that resets it
   *  also resets `screen` to "home" in the same breath, so the two never drift apart. */
  const [gradeId, setGradeId] = useState<string | null>(null);
  /** The read-aloud setting is stored, not held in state; this forces a re-read of it. */
  const [, setReadAloudTick] = useState(0);

  function selectStudent(next: Student) {
    rememberStudent(next.id);
    setStudent(next);
    setGradeId(null);
    setScreen({ name: "home" });
  }

  function switchStudent() {
    rememberStudent(null);
    setStudent(null);
    setGradeId(null);
    setScreen({ name: "home" });
  }

  if (student === null) {
    return <StudentPicker onSelect={selectStudent} />;
  }

  const grades = availableGrades(student);

  // A student with more than one grade (today, only Mika) picks between them before
  // anything else — this is deliberately not folded into `Screen`, see the `gradeId`
  // declaration above. A student with exactly one grade never sees this: `grades.length
  // > 1` is false, so this returns nothing and behaviour is unchanged from before this
  // existed.
  if (grades.length > 1 && gradeId === null) {
    return (
      <GradePicker
        grades={grades}
        onSelect={(g) => setGradeId(g.id)}
        onBack={switchStudent}
        onHistory={() => setScreen({ name: "history" })}
      />
    );
  }

  const grade = grades.length > 1 ? grades.find((g) => g.id === gradeId)! : grades[0];
  const readAloud = readAloudFor(student.id);

  function finish(topic: Topic | null, lesson: Lesson, correctCount: number) {
    recordPractice({
      at: new Date().toISOString(),
      studentId: student!.id,
      gradeLabel: grade.label,
      topicTitle: topic?.title ?? "",
      // A level title or a style title — whichever was practised. History renders
      // "topic · this", so a style lesson reads "מספרים עד 20 · מה בא אחרי" with no
      // change to the stored shape and no migration of the records already sitting on
      // the children's devices.
      levelTitle: lesson.title,
      correct: correctCount,
      total: lesson.questions.length,
    });
    setScreen({ name: "result", topic, lesson, correctCount });
  }

  if (screen.name === "home") {
    return (
      <TopicPicker
        gradeLabel={`שלום ${student.name}! · ${grade.label}`}
        topics={grade.topicSets}
        onSelect={(topic) => setScreen(insideTopic(topic))}
        onBack={grades.length > 1 ? () => setGradeId(null) : switchStudent}
        onHistory={grades.length > 1 ? undefined : () => setScreen({ name: "history" })}
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
        onSelect={(level) => setScreen({ name: "practice", topic, lesson: level })}
        onBack={() => setScreen({ name: "home" })}
      />
    );
  }

  if (screen.name === "styles") {
    const topic = screen.topic;
    return (
      <StylePicker
        heading={topic.title}
        subheading={grade.label}
        styles={stylesOf(topic)}
        onSelect={(style) =>
          setScreen({
            name: "practice",
            topic,
            lesson: { title: style.title, questions: style.questions },
          })
        }
        onBack={() => setScreen({ name: "home" })}
        onSpeak={readAloud ? (text) => speak(speechParts([text])) : undefined}
      />
    );
  }

  if (screen.name === "practice") {
    const { topic, lesson } = screen;
    return (
      <Practice
        lesson={lesson}
        onFinish={(correctCount) => finish(topic, lesson, correctCount)}
        onExit={() => setScreen(insideTopic(topic))}
        readAloud={readAloud}
      />
    );
  }

  if (screen.name === "result") {
    const { topic, lesson, correctCount } = screen;
    return (
      <Result
        lesson={lesson}
        correctCount={correctCount}
        onRetry={() => setScreen({ name: "practice", topic, lesson })}
        onHome={() => setScreen(insideTopic(topic))}
      />
    );
  }

  return <TopicPicker
    gradeLabel={grade.label}
    topics={grade.topicSets}
    onSelect={(topic) => setScreen(insideTopic(topic))}
    onBack={grades.length > 1 ? () => setGradeId(null) : switchStudent}
    onHistory={grades.length > 1 ? undefined : () => setScreen({ name: "history" })}
  />;
}

export default App;
