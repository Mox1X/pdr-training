import { useState } from "react";
import type { MutableRefObject } from "react";
import type { SignCategory } from "../data/signs";
import { recordAnswer } from "../progress";
import type { Progress } from "../progress";
import { createQuiz } from "../quiz";
import type { QuizState, QuizMode, QuestionFormat } from "../quiz";

export function useQuizSession(
  progressRef: MutableRefObject<Progress>,
  save: (next: Progress) => void,
) {
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const start = (
    mode: QuizMode,
    selected: SignCategory[],
    format: QuestionFormat = "name",
  ) => {
    setQuiz(
      createQuiz({
        mode,
        format,
        categories: selected,
        progress: progressRef.current,
      }),
    );
  };
  const changeQuiz = (next: QuizState) => {
    let updated = progressRef.current;
    if (next.mode !== "exam" || next.finished)
      next.questions.forEach((q, i) => {
        const outcome = next.outcomes[i];
        if (outcome.status === "answered")
          updated = recordAnswer(
            updated,
            next.sessionId,
            q.signId,
            outcome.optionId,
            outcome.answeredAt,
          );
      });
    if (updated !== progressRef.current) save(updated);
    setQuiz(next);
  };
  const restart = () => {
    if (!quiz) return;
    try {
      start(quiz.mode, quiz.selectedCategories, quiz.questions[0].format);
    } catch {
      setQuiz(null);
    }
  };
  return { quiz, start, changeQuiz, restart, leave: () => setQuiz(null) };
}
