import { useState } from "react";
import { StudentPicker } from "./components/StudentPicker";
import { GradeHome } from "./components/GradeHome";
import { Practice } from "./components/Practice";
import { Result } from "./components/Result";
import { students } from "./data/curriculum";
import type { Level, Student } from "./data/curriculum";
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
  | { name: "grade" }
  | { name: "practice"; level: Level }
  | { name: "result"; level: Level; correctCount: number };

function App() {
  const [student, setStudent] = useState<Student | null>(loadStudent);
  const [screen, setScreen] = useState<Screen>({ name: "grade" });

  function selectStudent(next: Student) {
    rememberStudent(next.id);
    setStudent(next);
    setScreen({ name: "grade" });
  }

  function switchStudent() {
    rememberStudent(null);
    setStudent(null);
    setScreen({ name: "grade" });
  }

  if (student === null) {
    return <StudentPicker onSelect={selectStudent} />;
  }

  if (screen.name === "grade") {
    return (
      <GradeHome
        student={student}
        onSelectLevel={(level) => setScreen({ name: "practice", level })}
        onSwitchStudent={switchStudent}
      />
    );
  }

  if (screen.name === "practice") {
    return (
      <Practice
        level={screen.level}
        onFinish={(correctCount) =>
          setScreen({ name: "result", level: screen.level, correctCount })
        }
        onExit={() => setScreen({ name: "grade" })}
      />
    );
  }

  return (
    <Result
      level={screen.level}
      correctCount={screen.correctCount}
      onRetry={() => setScreen({ name: "practice", level: screen.level })}
      onHome={() => setScreen({ name: "grade" })}
    />
  );
}

export default App;
