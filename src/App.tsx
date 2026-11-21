import { useEffect, useState } from "react";
import { StudentPicker } from "./components/StudentPicker";
import { GradePicker } from "./components/GradePicker";
import { TopicPicker } from "./components/TopicPicker";
import { TopicLesson } from "./components/TopicLesson";
import { LevelPicker } from "./components/LevelPicker";
import { StylePicker } from "./components/StylePicker";
import { History } from "./components/History";
import { Practice } from "./components/Practice";
import { Result } from "./components/Result";
import { SettingsDialog } from "./components/SettingsDialog";
import { grades, gradeById } from "./data/curriculum";
import type { Student, Topic, Question } from "./data/curriculum";
import type { Lesson } from "./data/style";
import { hasStyleLessons, stylesOf } from "./data/style";
import { speak, speechParts } from "./data/speech";
import { recordPractice, clearStudent as clearStudentProgress } from "./data/progress";
import { withoutRepeatingPrompt } from "./data/adaptiveHelpers";
import {
  loadAdaptiveTier,
  saveAdaptiveTier,
  clearStudent as clearStudentAdaptiveTiers,
} from "./data/adaptiveProgress";
import { userStore } from "./data/userStore";
import { startIdleSpotlightObserver } from "./data/idleSpotlight";
import { readAloud as readAloudFor, setReadAloud } from "./data/preferences";
import "./App.css";

const STORAGE_KEY = "learn-math:student";
const MENU_POSITION_STORAGE_KEY = "learn-math:menu-position";

/** localStorage throws in private mode in some browsers — remembering a preference is
 *  never worth taking the app down with it. */
function loadRememberedId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
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

/** A fresh set of questions at the given starting difficulty, one per question count —
 *  the caller decides that starting point: `adaptive.initialDifficulty` for a first-ever
 *  visit, or a resumed tier from `adaptiveProgress.ts` for a returning one. */
function freshAdaptiveSession(
  topic: Topic & { adaptive: NonNullable<Topic["adaptive"]> },
  startingDifficulty: number,
) {
  const { adaptive } = topic;
  const questions = Array.from({ length: adaptive.questionCount }, () =>
    adaptive.generate(startingDifficulty),
  );
  return { difficulty: startingDifficulty, streak: 0, answeredCount: 0, questions };
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
  /** The full roster — owned here, not fetched separately by `StudentPicker`, since
   *  `student` below also needs it (to resolve the remembered id) the moment it loads.
   *  Starts empty and is populated once `userStore.list()` resolves (see the effect
   *  below) — with the `localStorage`-backed store this settles before the first paint
   *  in practice, so there is deliberately no separate loading state (see
   *  docs/features/manage-students/architecture.md, "Edge Cases"). */
  const [students, setStudents] = useState<Student[]>([]);
  const [student, setStudent] = useState<Student | null>(null);
  /** Which grade is active. Not part of `Screen` — like `student`, it is decided before
   *  any screen renders. Survives a reload the same way `student` does; only switching
   *  away from the grade screen (or the student) clears it, never a refresh mid-session. */
  const [gradeId, setGradeId] = useState<string | null>(null);
  /** Starts wherever the student's saved menu position points, not always "home" — see
   *  `resolveScreen`. */
  const [screen, setScreen] = useState<Screen>({ name: "home" });

  // Resolves the roster and the remembered student together, once, on mount — a
  // `UserStore` is `Promise`-based even today (see userStore.ts), so this can't be a
  // synchronous `useState` initializer the way it used to be when `students` was a
  // hardcoded constant.
  useEffect(() => {
    userStore.list().then((list) => {
      setStudents(list);
      const remembered = loadRememberedId();
      const initial = list.find((s) => s.id === remembered) ?? null;
      if (initial) {
        const initialGradeId = loadMenuPosition(initial.id)?.gradeId ?? null;
        setStudent(initial);
        setGradeId(initialGradeId);
        setScreen(resolveScreen(initial.id, initialGradeId));
      }
    });
  }, []);

  // Keeps the idle-spotlight CSS animation's --spot-i/--spot-n indices live for the
  // app's whole lifetime via a MutationObserver, not React's own render cycle — a
  // dialog whose open state lives in a descendant component's own useState (e.g.
  // StudentPicker's create-student dialog) never re-renders App itself, so a reindex
  // tied to App's render cycle alone misses it. Found live: that dialog's own
  // .grade-card buttons never got a --spot-i, defaulting their stagger delay to the
  // same 0s and "breathing" in sync instead of one at a time. See idleSpotlight.ts.
  useEffect(() => startIdleSpotlightObserver(), []);

  /** The per-student settings (read-aloud, hold-to-zoom strength) are stored rather than
   *  held in state; this forces a re-read after either of them is written. */
  const [, setPreferencesTick] = useState(0);
  /** The ⚙️ settings dialog's open/closed state — lives here, not inside `TopicPicker`
   *  (where it used to), because it must be reachable from two mutually exclusive sibling
   *  screens (the topic list and the notebook practice screen), and `App` is their one
   *  shared ancestor. Neither `<TopicPicker>` nor `<Practice>` below is ever given a
   *  changing `key`, so this survives every re-render exactly like `screen`/`adaptiveSession`
   *  already do — see docs/features/notebook-nav-buttons-visibility/architecture.md for why
   *  this is safe despite the "don't lift this" note that used to live in `TopicPicker`
   *  (docs/features/notebook-hold-to-zoom/architecture.md, "סבב ו׳" — that warning was about
   *  a changing `key` specifically, not about where the state lives). */
  const [settingsOpen, setSettingsOpen] = useState(false);

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

  /** New user: added to the roster but deliberately not auto-selected — stays on the
   *  picker (design.md's explicit call), so creating several students in a row doesn't
   *  jump into practice after each one. */
  function createStudent(name: string, gradeId: string) {
    userStore.create(name, gradeId).then((created) => {
      setStudents((prev) => [...prev, created]);
    });
  }

  /** Deletion is irreversible by design (product-spec.md) — removes the roster entry and
   *  every bit of saved progress/history/adaptive-tier data for this id, from the three
   *  places that each separately key by it. */
  function deleteStudent(id: string) {
    userStore.remove(id).then(() => {
      setStudents((prev) => prev.filter((s) => s.id !== id));
    });
    clearStudentProgress(id);
    clearStudentAdaptiveTiers(id);
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
      const { adaptive } = topic;
      const savedTier = student && gradeId ? loadAdaptiveTier(student.id, gradeId, topic.id) : null;
      const startingDifficulty =
        savedTier === null
          ? adaptive.initialDifficulty
          : Math.min(adaptive.maxDifficulty, Math.max(adaptive.minDifficulty, savedTier));
      const session = freshAdaptiveSession(
        topic as Topic & { adaptive: NonNullable<Topic["adaptive"]> },
        startingDifficulty,
      );
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
   *  still learning to read). Uses `lessonExample` when a topic defines one (today: only
   *  "זוויות וחפיפת משולשים", so its lesson reliably shows the one sibling pattern per tier
   *  that carries extra "why is this true" content, not whichever `generate` happens to
   *  pick), falling back to `generate` otherwise — exactly as before this field existed.
   *  Called with no explicit `rng`, so it falls back to `Math.random` exactly like practice
   *  already does — fresh numbers each time the lesson opens, not a fixed snapshot. Empty
   *  only if a topic's data is missing entirely, which nothing in today's content does. */
  function lessonQuestions(topic: Topic): Question[] {
    if (!topic.adaptive) {
      const q = topic.levels.find((l) => l.id === "easy")?.questions[0] ?? topic.levels[0]?.questions[0];
      return q ? [q] : [];
    }
    const { generate, lessonExample, minDifficulty, maxDifficulty } = topic.adaptive;
    const pickExample = lessonExample ?? generate;
    const questions: Question[] = [];
    for (let d = minDifficulty; d <= maxDifficulty; d++) questions.push(pickExample(d));
    return questions;
  }

  /** The one thing an adaptive lesson adds to answering a question: the next not-yet-seen
   *  question is regenerated at the updated difficulty. Questions already shown are left
   *  alone — only what the child hasn't reached yet ever changes under them. */
  function handleAdaptiveAnswered(topic: Topic, correct: boolean) {
    const adaptive = topic.adaptive;
    if (!adaptive || !adaptiveSession) return;
    const streak = correct ? adaptiveSession.streak + 1 : 0;
    const difficulty = adaptive.nextDifficulty(adaptiveSession.difficulty, correct, streak);
    // Written on every answer, not only at the end of a session — this is also the save
    // point for a session abandoned via "חזרה" (there is no separate save there), see
    // docs/features/adaptive-lesson-start/architecture.md.
    if (student && gradeId) saveAdaptiveTier(student.id, gradeId, topic.id, difficulty);
    setAdaptiveSession((prev) => {
      if (!prev) return prev;
      const answeredCount = prev.answeredCount + 1;
      // Only the question at exactly `answeredCount` is ever shown as generated here — every
      // index past it gets regenerated again (and discarded) the next time this runs, so only
      // this one needs to avoid repeating the question just answered. See
      // docs/features/no-repeat-consecutive-questions/architecture.md, "Edge Cases".
      const questions = prev.questions.map((q, i) => {
        if (i < answeredCount) return q;
        if (i === answeredCount) {
          return withoutRepeatingPrompt(() => adaptive.generate(difficulty), prev.questions[answeredCount - 1].prompt);
        }
        return adaptive.generate(difficulty);
      });
      return { difficulty, streak, answeredCount, questions };
    });
  }

  if (student === null) {
    return (
      <StudentPicker
        students={students}
        onSelect={selectStudent}
        onCreate={createStudent}
        onDelete={deleteStudent}
      />
    );
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
      // Separate from levelTitle on purpose — see progress.ts: an adaptive topic has no
      // named level, but "by difficulty" stats still need something to group it under.
      difficultyLabel: topic?.adaptive ? `רמה ${adaptiveSession?.difficulty ?? ""}` : undefined,
      correct: correctCount,
      total: lesson.questions.length,
    });
    // The reached difficulty itself was already saved after the last answer (see
    // handleAdaptiveAnswered) — clearing this in-memory session doesn't lose it, see
    // docs/features/adaptive-lesson-start/architecture.md.
    setAdaptiveSession(null);
    setScreen({ name: "result", topic, lesson, correctCount });
  }

  // Shared between whichever screen's own ⚙️ button decides whether to show itself (via
  // hasAnySettings()) and the dialog that actually renders it — same props, two different
  // consumers.
  const settingsProps = {
    readAloud,
    onReadAloudChange: (value: boolean) => {
      setReadAloud(student.id, value);
      // The value lives in storage, so a render is needed to pick it back up.
      setPreferencesTick((n) => n + 1);
    },
  };

  if (screen.name === "home") {
    return (
      <>
        <TopicPicker
          gradeLabel={`שלום ${student.name}! · ${grade.label}`}
          topics={grade.topicSets}
          onSelect={enterTopic}
          onLesson={enterLesson}
          onBack={() => chooseGrade(null)}
          backLabel="← חזרה"
          onHistory={() => setScreen({ name: "history" })}
          onOpenSettings={() => setSettingsOpen(true)}
          {...settingsProps}
        />
        {settingsOpen && <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} {...settingsProps} />}
      </>
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
      <>
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
        {settingsOpen && <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} {...settingsProps} />}
      </>
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
    onOpenSettings={() => setSettingsOpen(true)}
  />;
}

export default App;
