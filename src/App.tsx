import { useState } from "react";
import { RULES_SOURCE, SOURCE_REVIEW_DATE } from "./data/signs";
import StartScreen from "./screens/StartScreen";
import QuizScreen from "./screens/QuizScreen";
import ResultScreen from "./screens/ResultScreen";
import Statistics from "./screens/Statistics";
import { useProgress } from "./hooks/useProgress";
import { useQuizSession } from "./hooks/useQuizSession";
export default function App() {
  const { progress, progressRef, warning, save, reset } = useProgress();
  const { quiz, start, changeQuiz, restart, leave } = useQuizSession(
    progressRef,
    save,
  );
  const [screen, setScreen] = useState<"home" | "stats">("home");
  return (
    <>
      <a className="skip-link" href="#main-content">
        Перейти до вмісту
      </a>
      <div className="app-shell">
        <header className="app-header">
          <a className="brand" href="/" aria-label="ПДР Практика — на головну">
            <span className="brand-symbol">
              <svg aria-hidden="true" viewBox="0 0 32 32" fill="none">
                <path d="M13 26V11H8l8-7 8 7h-5v15" fill="currentColor" />
              </svg>
            </span>
            <span>
              ПДР<span className="brand-light"> Практика</span>
            </span>
          </a>
          <nav aria-label="Навігація">
            <button
              className="text-button"
              onClick={() => {
                leave();
                setScreen("home");
              }}
            >
              Практика
            </button>
            <button
              className="text-button"
              onClick={() => {
                leave();
                setScreen("stats");
              }}
            >
              Статистика
            </button>
          </nav>
        </header>
        {warning && (
          <p className="storage-warning" role="alert">
            {warning}
          </p>
        )}
        {screen === "stats" ? (
          <Statistics progress={progress} onReset={reset} />
        ) : !quiz ? (
          <StartScreen onStart={start} progress={progress} />
        ) : quiz.finished ? (
          <ResultScreen state={quiz} onRestart={restart} />
        ) : (
          <QuizScreen key={quiz.index} state={quiz} onChange={changeQuiz} />
        )}
        <footer className="app-footer">
          <span>Практика, що додає впевненості.</span>
          <span>
            <a href={RULES_SOURCE} target="_blank" rel="noreferrer">
              Джерело: ПДР України
            </a>
            <span className="footer-date"> · Звірено {SOURCE_REVIEW_DATE}</span>
          </span>
        </footer>
      </div>
    </>
  );
}
