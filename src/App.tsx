import { useState } from "react";
import { Home } from "./components/Home";
import { Practice } from "./components/Practice";
import { Result } from "./components/Result";
import type { ExerciseSet } from "./data/exerciseSets";
import "./App.css";

type Screen =
  | { name: "home" }
  | { name: "practice"; set: ExerciseSet }
  | { name: "result"; set: ExerciseSet; correctCount: number };

function App() {
  const [screen, setScreen] = useState<Screen>({ name: "home" });

  if (screen.name === "home") {
    return <Home onSelect={(set) => setScreen({ name: "practice", set })} />;
  }

  if (screen.name === "practice") {
    return (
      <Practice
        set={screen.set}
        onFinish={(correctCount) => setScreen({ name: "result", set: screen.set, correctCount })}
        onExit={() => setScreen({ name: "home" })}
      />
    );
  }

  return (
    <Result
      set={screen.set}
      correctCount={screen.correctCount}
      onRetry={() => setScreen({ name: "practice", set: screen.set })}
      onHome={() => setScreen({ name: "home" })}
    />
  );
}

export default App;
