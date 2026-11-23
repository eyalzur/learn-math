import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { normalizeMathSpeech } from "../src/data/hebrewMathSpeech";

const EXAMPLES = [
  "7 − 3 = 4",
  "-2 + 10",
  "(4 + 1) × 3",
  "12 ÷ 4",
  "2.5 + 0.5",
  "3x + 5 = 20",
  "2³",
  "3/4",
];

function speak(text: string, onEnd: () => void) {
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();
  const heVoice = voices.find((v) => v.lang.startsWith("he"));
  if (heVoice) utter.voice = heVoice;
  utter.lang = "he-IL";
  utter.rate = 0.95;
  utter.onend = onEnd;
  utter.onerror = onEnd;
  window.speechSynthesis.speak(utter);
}

function Demo() {
  const [custom, setCustom] = useState("");
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);
  const [voiceInfo, setVoiceInfo] = useState("טוען קולות...");

  useEffect(() => {
    function updateVoices() {
      const voices = window.speechSynthesis.getVoices();
      const he = voices.filter((v) => v.lang.startsWith("he"));
      setVoiceInfo(
        he.length
          ? `נמצאו ${he.length} קולות עבריים: ${he.map((v) => v.name).join(", ")}`
          : `לא נמצא קול עברי במכשיר הזה (${voices.length} קולות זמינים בסך הכל) — ההקראה תשתמש בקול ברירת-המחדל.`,
      );
    }
    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;
  }, []);

  function play(idx: number, text: string) {
    setSpeakingIdx(idx);
    speak(normalizeMathSpeech(text), () => setSpeakingIdx(null));
  }

  return (
    <div style={{ maxWidth: 560, margin: "24px auto", padding: "0 16px", fontFamily: "system-ui, sans-serif", direction: "rtl" }}>
      <h1 style={{ fontSize: 20 }}>הקראה בעברית — בדיקה חיה</h1>
      <p style={{ color: "#666", fontSize: 14 }}>
        המנרמל האמיתי (<code>normalizeMathSpeech</code>) רץ כאן ממש, והטקסט המנורמל מוקרא
        דרך קול-ההקראה המובנה של המכשיר שלך (עוד אין שרת-ענן מחובר). כל שורה: הביטוי
        המקורי, הטקסט שיוקרא בפועל, וכפתור-הקראה.
      </p>
      <p style={{ fontSize: 13, background: "#fff3cd", padding: "8px 12px", borderRadius: 8 }}>{voiceInfo}</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
        {EXAMPLES.map((ex, i) => (
          <div key={i} style={{ border: "1px solid #ddd", borderRadius: 10, padding: "10px 14px" }}>
            <div style={{ fontSize: 15, direction: "ltr", textAlign: "left", fontWeight: 700 }}>{ex}</div>
            <div style={{ fontSize: 14, color: "#444", margin: "4px 0" }}>{normalizeMathSpeech(ex)}</div>
            <button
              onClick={() => play(i, ex)}
              style={{
                fontSize: 13,
                padding: "6px 14px",
                borderRadius: 999,
                border: "none",
                background: speakingIdx === i ? "#999" : "#7c5cff",
                color: "white",
                cursor: "pointer",
              }}
            >
              {speakingIdx === i ? "🔊 מקריא..." : "▶ הקריאו"}
            </button>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 16, marginTop: 24 }}>נסו ביטוי משלכם</h2>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="למשל: 15 − 8 = 7"
          style={{ flex: 1, direction: "ltr", padding: "8px 10px", fontSize: 15, border: "1px solid #ccc", borderRadius: 8 }}
        />
        <button
          onClick={() => play(-1, custom)}
          disabled={!custom.trim()}
          style={{
            fontSize: 13,
            padding: "6px 14px",
            borderRadius: 999,
            border: "none",
            background: speakingIdx === -1 ? "#999" : "#7c5cff",
            color: "white",
            cursor: custom.trim() ? "pointer" : "not-allowed",
          }}
        >
          {speakingIdx === -1 ? "🔊 מקריא..." : "▶ הקריאו"}
        </button>
      </div>
      {custom.trim() && <p style={{ fontSize: 14, color: "#444" }}>{normalizeMathSpeech(custom)}</p>}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<Demo />);
