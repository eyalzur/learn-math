import { useState } from "react";
import { StudentPicker } from "./components/StudentPicker";
import { GradePicker } from "./components/GradePicker";
import { TopicPicker } from "./components/TopicPicker";
import { TopicLesson } from "./components/TopicLesson";
import { LevelPicker } from "./components/LevelPicker";
import { StylePicker } from "./components/StylePicker";
import { History } from "./components/History";
import { Practice } from "./components/Practice";
import { Result } from "./components/Result";
import { students, grades, gradeById } from "./data/curriculum";
import type { Student, Topic, Question } from "./data/curriculum";
import type { Lesson } from "./data/style";
import { hasStyleLessons, stylesOf } from "./data/style";
import { speak, speechParts } from "./data/speech";
import { recordPractice } from "./data/progress";
import { readAloud as readAloudFor, setReadAloud } from "./data/preferences";
import "./App.css";

const STORAGE_KEY = "learn-math:student";
const MENU_POSITION_STORAGE_KEY = "learn-math:menu-position";

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

/**
 * Where in the menu each student last was, keyed by student id — same
 * reload-survives-but-switching-resets rule the student picker already follows, so
 * returning to the app feels as familiar as choosing a student does.
 *
 * `topic` is present only once the student has gone deeper than the grade's topic list —
 * absent means "home" (the topic list itself) is as deep as it goes.
 */
interface MenuPosition {
  gradeId: string;
  topic?: { id: string; kind: "styles" | "levels" };
}

function loadMenuPosition(studentId: string): MenuPosition | null {
  try {
    const raw = localStorage.getItem(MENU_POSITION_STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Record<string, MenuPosition>;
    return saved[studentId] ?? null;
  } catch {
    return null;
  }
}

function rememberMenuPosition(studentId: string, position: MenuPosition | null) {
  try {
    const raw = localStorage.getItem(MENU_POSITION_STORAGE_KEY);
    const saved = raw ? (JSON.parse(raw) as Record<string, MenuPosition>) : {};
    if (position === null) delete saved[studentId];
    else saved[studentId] = position;
    localStorage.setItem(MENU_POSITION_STORAGE_KEY, JSON.stringify(saved));
  } catch {
    // ignore
  }
}

type Screen =
  | { name: "home" }
  | { name: "lesson"; topic: Topic }
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
  // No level screen was ever shown on the way in for an adaptive topic, so there is none
  // to land back on — leaving practice goes straight to the topics list, same as design.md
  // describes for the entry direction too.
  if (topic.adaptive) return { name: "home" };
  return hasStyleLessons(topic) ? { name: "styles", topic } : { name: "levels", topic };
}

/** A fresh set of questions at the topic's starting difficulty, one per question count. */
function freshAdaptiveSession(topic: Topic & { adaptive: NonNullable<Topic["adaptive"]> }) {
  const { adaptive } = topic;
  const questions = Array.from({ length: adaptive.questionCount }, () =>
    adaptive.generate(adaptive.initialDifficulty),
  );
  return { difficulty: adaptive.initialDifficulty, streak: 0, answeredCount: 0, questions };
}

/**
 * Where a returning student should land — the deepest screen their saved position still
 * actually supports. Falls back a layer at a time (never throws, never guesses) whenever
 * something about the saved position no longer matches today's data: a removed grade or
 * topic, or a topic that has since moved to adaptive difficulty or switched between
 * styles and levels. `gradeId === null` defers entirely to the grade gate, which already
 * shows `GradePicker` in that case regardless of what this returns.
 */
function resolveScreen(studentId: string, gradeId: string | null): Screen {
  if (gradeId === null) return { name: "home" };
  const position = loadMenuPosition(studentId);
  if (!position || position.gradeId !== gradeId || !position.topic) return { name: "home" };
  let grade;
  try {
    grade = gradeById(gradeId);
  } catch {
    return { name: "home" };
  }
  const topic = grade.topicSets.find((t) => t.id === position.topic!.id);
  if (!topic || topic.adaptive) return { name: "home" };
  if (position.topic.kind === "styles" && hasStyleLessons(topic)) return { name: "styles", topic };
  if (position.topic.kind === "levels" && !hasStyleLessons(topic)) return { name: "levels", topic };
  return { name: "home" };
}

function App() {
  const [student, setStudent] = useState<Student | null>(loadStudent);
  /** Which grade is active. Not part of `Screen` — like `student`, it is decided before
   *  any screen renders. Survives a reload the same way `student` does; only switching
   *  away from the grade screen (or the student) clears it, never a refresh mid-session. */
  const [gradeId, setGradeId] = useState<string | null>(() => {
    const initial = loadStudent();
    return initial ? (loadMenuPosition(initial.id)?.gradeId ?? null) : null;
  });
  /** Starts wherever the student's saved menu position points, not always "home" — see
   *  `resolveScreen`. */
  const [screen, setScreen] = useState<Screen>(() => {
    const initial = loadStudent();
    if (!initial) return { name: "home" };
    return resolveScreen(initial.id, loadMenuPosition(initial.id)?.gradeId ?? null);
  });
  /** The read-aloud setting is stored, not held in state; this forces a re-read of it. */
  const [, setReadAloudTick] = useState(0);

  /** Live state for a topic's runtime-generated questions — `null` outside one. Not part
   *  of `Screen`, for the same reason `gradeId` isn't: the questions for an adaptive
   *  lesson change after every answer, which `screen.practice.lesson` (a snapshot) cannot
   *  do without becoming stale the moment the array is replaced elsewhere. `screen` still
   *  carries a `lesson` for an adaptive topic so its shape doesn't have to fork — the
   *  practice screen below just prefers this over it when both exist. */
  const [adaptiveSession, setAdaptiveSession] = useState<{
    difficulty: number;
    streak: number;
    answeredCount: number;
    questions: Question[];
  } | null>(null);

  function selectStudent(next: Student) {
    rememberStudent(next.id);
    setStudent(next);
    const nextGradeId = loadMenuPosition(next.id)?.gradeId ?? null;
    setGradeId(nextGradeId);
    setScreen(resolveScreen(next.id, nextGradeId));
  }

  function switchStudent() {
    rememberStudent(null);
    setStudent(null);
    setGradeId(null);
    setScreen({ name: "home" });
  }

  /** Choosing a grade, or explicitly stepping back to reconsider — either way this is
   *  the one place that keeps `gradeId` and its stored copy in sync. A new (or cleared)
   *  grade always drops any deeper saved position — it belonged to the previous grade. */
  function chooseGrade(id: string | null) {
    if (student) rememberMenuPosition(student.id, id === null ? null : { gradeId: id });
    setGradeId(id);
  }

  /** Entering a topic from its card — unchanged from before docs/features/topic-lesson
   *  existed. An adaptive topic skips the level screen entirely — there is nothing to
   *  pick, so a fresh set of questions is generated immediately and practice starts on
   *  it. Every other topic is unaffected: `insideTopic` alone decides where it lands. */
  function enterTopic(topic: Topic) {
    if (topic.adaptive) {
      if (student && gradeId) rememberMenuPosition(student.id, { gradeId });
      const session = freshAdaptiveSession(topic as Topic & { adaptive: NonNullable<Topic["adaptive"]> });
      setAdaptiveSession(session);
      setScreen({ name: "practice", topic, lesson: { title: topic.title, questions: session.questions } });
      return;
    }
    const dest = insideTopic(topic);
    if (student && gradeId) {
      rememberMenuPosition(
        student.id,
        dest.name === "styles" || dest.name === "levels"
          ? { gradeId, topic: { id: topic.id, kind: dest.name } }
          : { gradeId },
      );
    }
    setScreen(dest);
  }

  /** The topic's card also offers "שיעור" as a secondary action (see
   *  `TopicPicker`'s `onLesson`) — this opens it directly, without touching how picking
   *  the card itself behaves. */
  function enterLesson(topic: Topic) {
    setScreen({ name: "lesson", topic });
  }

  /** The lesson screen's worked examples: one per difficulty tier for a topic with
   *  `adaptive` (רותם/עומר — each tier is usually a different question pattern, not just
   *  bigger numbers, so showing only the easiest would skip most of the topic), or the
   *  topic's single easiest written example otherwise (מיקה — kept short on purpose, she's
   *  still learning to read). `generate` is called with no explicit `rng`, so it falls back
   *  to `Math.random` exactly like practice already does — fresh numbers each time the
   *  lesson opens, not a fixed snapshot. Empty only if a topic's data is missing entirely,
   *  which nothing in today's content does. */
  function lessonQuestions(topic: Topic): Question[] {
    if (!topic.adaptive) {
      const q = topic.levels.find((l) => l.id === "easy")?.questions[0] ?? topic.levels[0]?.questions[0];
      return q ? [q] : [];
    }
    const { generate, minDifficulty, maxDifficulty } = topic.adaptive;
    const questions: Question[] = [];
    for (let d = minDifficulty; d <= maxDifficulty; d++) questions.push(generate(d));
    return questions;
  }

  /** The one thing an adaptive lesson adds to answering a question: the next not-yet-seen
   *  question is regenerated at the updated difficulty. Questions already shown are left
   *  alone — only what the child hasn't reached yet ever changes under them. */
  function handleAdaptiveAnswered(topic: Topic, correct: boolean) {
    const adaptive = topic.adaptive;
    if (!adaptive) return;
    setAdaptiveSession((prev) => {
      if (!prev) return prev;
      const streak = correct ? prev.streak + 1 : 0;
      const difficulty = adaptive.nextDifficulty(prev.difficulty, correct, streak);
      const answeredCount = prev.answeredCount + 1;
      const questions = prev.questions.map((q, i) =>
        i >= answeredCount ? adaptive.generate(difficulty) : q,
      );
      return { difficulty, streak, answeredCount, questions };
    });
  }

  if (student === null) {
    return <StudentPicker onSelect={selectStudent} />;
  }

  // Checked before the grade gate below, not after: history needs a student but never a
  // grade, and the grade-choice screen's own history link would otherwise be unreachable
  // — clicking it sets `screen` to "history", but `gradeId` is still null, so the gate
  // below would just render the grade picker again and swallow the click.
  if (screen.name === "history") {
    return <History student={student} onBack={() => setScreen({ name: "home" })} />;
  }

  // Every student picks a grade before anything else — this is deliberately not folded
  // into `Screen`, see the `gradeId` declaration above.
  if (gradeId === null) {
    return (
      <GradePicker
        grades={grades}
        onSelect={(g) => chooseGrade(g.id)}
        onBack={switchStudent}
        onHistory={() => setScreen({ name: "history" })}
      />
    );
  }

  const grade = grades.find((g) => g.id === gradeId)!;
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
      // the children's devices. An adaptive topic has no "this" — there was never a level
      // or style to name — so it stays empty and History omits the separator for it.
      levelTitle: topic?.adaptive ? "" : lesson.title,
      correct: correctCount,
      total: lesson.questions.length,
    });
    // No difficulty carries between visits — Out of Scope in product-spec.md — so the
    // session ends the moment a practice does, win or leave.
    setAdaptiveSession(null);
    setScreen({ name: "result", topic, lesson, correctCount });
  }

  if (screen.name === "home") {
    return (
      <TopicPicker
        gradeLabel={`שלום ${student.name}! · ${grade.label}`}
        topics={grade.topicSets}
        onSelect={enterTopic}
        onLesson={enterLesson}
        onBack={() => chooseGrade(null)}
        backLabel="← חזרה"
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

  if (screen.name === "lesson") {
    const topic = screen.topic;
    const questions = lessonQuestions(topic);
    // `TopicPicker` only offers the "שיעור" link on a reviewed topic, and every reviewed
    // topic's data carries either `adaptive` or a written "easy" level — so this is not a
    // state a click can produce today; the empty check is only a safety net against topic
    // data changing under an already-open tab, not something a real session hits.
    if (questions.length === 0) return null;
    return (
      <TopicLesson
        topicTitle={topic.title}
        gradeLabel={grade.label}
        questions={questions}
        onBack={() => setScreen({ name: "home" })}
        onPractice={() => enterTopic(topic)}
      />
    );
  }

  if (screen.name === "levels" && screen.topic !== null) {
    const topic = screen.topic;
    return (
      <LevelPicker
        heading={topic.title}
        subheading={grade.label}
        levels={topic.levels}
        onSelect={(level) => setScreen({ name: "practice", topic, lesson: level })}
        onBack={() => {
          if (student && gradeId) rememberMenuPosition(student.id, { gradeId });
          setScreen({ name: "home" });
        }}
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
        onBack={() => {
          if (student && gradeId) rememberMenuPosition(student.id, { gradeId });
          setScreen({ name: "home" });
        }}
        onSpeak={readAloud ? (text) => speak(speechParts([text])) : undefined}
      />
    );
  }

  if (screen.name === "practice") {
    const { topic } = screen;
    // The live, regenerating array takes over from the snapshot the screen was entered
    // with — see `adaptiveSession`'s own comment for why the two exist side by side.
    const lesson =
      topic?.adaptive && adaptiveSession
        ? { title: topic.title, questions: adaptiveSession.questions }
        : screen.lesson;
    return (
      <Practice
        lesson={lesson}
        onFinish={(correctCount) => finish(topic, lesson, correctCount)}
        onExit={() => {
          setAdaptiveSession(null);
          setScreen(insideTopic(topic));
        }}
        readAloud={readAloud}
        onAnswered={topic?.adaptive ? (correct) => handleAdaptiveAnswered(topic, correct) : undefined}
      />
    );
  }

  if (screen.name === "result") {
    const { topic, lesson, correctCount } = screen;
    return (
      <Result
        lesson={lesson}
        correctCount={correctCount}
        onRetry={() => (topic?.adaptive ? enterTopic(topic) : setScreen({ name: "practice", topic, lesson }))}
        onHome={() => setScreen(insideTopic(topic))}
      />
    );
  }

  return <TopicPicker
    gradeLabel={grade.label}
    topics={grade.topicSets}
    onSelect={enterTopic}
    onLesson={enterLesson}
    onBack={() => chooseGrade(null)}
    backLabel="← חזרה"
    onHistory={() => setScreen({ name: "history" })}
  />;
}

export default App;
