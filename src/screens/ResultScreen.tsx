import { useEffect, useRef } from "react";
import {
  getScore,
  getSign,
  answersOf,
  answeredCount,
  skippedCount,
} from "../quiz";
import type { QuizState } from "../quiz";
import {
  Mark,
  PrimaryButton,
  SignImage,
  Explanation,
} from "../components/shared";

export default function ResultScreen({
  state,
  onRestart,
}: {
  state: QuizState;
  onRestart: () => void;
}) {
  const score = getScore(state);
  const total = answeredCount(state);
  const skipped = skippedCount(state);
  const mistakes = state.questions.flatMap((question, i) =>
    answersOf(state)[i] !== null &&
    (state.mode === "exam" || answersOf(state)[i] !== question.signId)
      ? [
          {
            sign: getSign(question.signId),
            answer: getSign(answersOf(state)[i]!),
            image: question.image,
          },
        ]
      : [],
  );
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);
  return (
    <main id="main-content" className="result-screen">
      <p className="result-notice">
        Відповідей: {total} · Пропущено без штрафу: {skipped}
        {total < state.targetCount && (
          <>
            <br />
            {state.mode === "exam" ? "Екзамен неповний. " : "Сесію скорочено. "}
            Доступні запитання закінчилися.
          </>
        )}
        {total === 0 && (
          <>
            <br />
            Немає оцінених відповідей.
          </>
        )}
      </p>
      <section className="result-summary">
        <div
          className="result-score"
          aria-label={`${score} правильних відповідей із ${total}`}
        >
          <strong>{score}</strong>
          <span>/ {total}</span>
        </div>
        <div className="result-copy">
          <p>
            {state.mode === "exam"
              ? "Екзамен"
              : state.mode === "mistakes"
                ? "Робота над помилками"
                : "Навчання"}{" "}
            · {total ? Math.round((score / total) * 100) + "%" : "—"} правильних
          </p>
          <h1 tabIndex={-1} ref={headingRef}>
            {total === 0
              ? "Немає оцінених відповідей"
              : score === total
                ? "Усі знаки впізнано!"
                : score / total >= 0.7
                  ? "Гарна робота. Продовжуйте!"
                  : "Кожна спроба — крок уперед."}
          </h1>
          <p>
            {total === 0 ? "Спробуйте нову сесію, коли зображення будуть доступні." : score === total
              ? "Жодної помилки в цьому тесті. Спробуйте нову добірку знаків."
              : "Перегляньте пояснення нижче, щоб наступного разу впізнати ці знаки."}
          </p>
          <PrimaryButton onClick={onRestart}>Новий тест</PrimaryButton>
        </div>
      </section>
      <section className="mistakes-section" aria-labelledby="mistakes-title">
        <div className="section-heading">
          <h2 id="mistakes-title">
            {total === 0 ? "Розбір недоступний" : state.mode === "exam"
              ? "Розбір усіх відповідей"
              : mistakes.length
                ? "Розберімо помилки"
                : "Чудовий результат"}
          </h2>
          <p>
            {mistakes.length
              ? `Правильних відповідей: ${score} із ${total}`
              : total === 0 ? "Немає оцінених відповідей" : `Усі ${total} відповідей правильні`}
          </p>
        </div>
        {mistakes.length ? (
          <div className="mistake-list">
            {mistakes.map(({ sign, answer, image }) => (
              <article className="mistake" key={sign.id}>
                <div className="mistake-image">
                  <SignImage id={sign.id} image={image} reveal />
                </div>
                <div className="mistake-copy">
                  <p className="sign-number">Знак {sign.number}</p>
                  <h3>{sign.answerLabel}</h3>
                  <p
                    className={
                      answer.id === sign.id
                        ? "correct-heading"
                        : "previous-answer"
                    }
                  >
                    {answer.id === sign.id
                      ? "Правильно"
                      : "Ваша відповідь: " + answer.answerLabel}
                  </p>
                  <Explanation id={sign.id} />
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="perfect-message">
            <Mark correct />{total===0 ? "Для розбору потрібна хоча б одна відповідь." : "У цій добірці немає помилок для повторення."}
          </p>
        )}
      </section>
    </main>
  );
}
