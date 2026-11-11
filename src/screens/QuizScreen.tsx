import { useEffect, useRef, useState, useCallback } from "react";
import { categories } from "../data/signs";
import {
  getScore,
  getSign,
  quizReducer,
  answersOf,
  answeredCount,
  requiredImages,
} from "../quiz";
import type { QuizState } from "../quiz";
import {
  Mark,
  PrimaryButton,
  SignImage,
  Explanation,
} from "../components/shared";

export default function QuizScreen({
  state,
  onChange,
}: {
  state: QuizState;
  onChange: (state: QuizState) => void;
}) {
  const question = state.questions[state.index];
  const sign = getSign(question.signId);
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [attempt, setAttempt] = useState(0);
  const onStatus = useCallback(
    (image: string, status: string) =>
      setStatuses((old) =>
        old[image] === status ? old : { ...old, [image]: status },
      ),
    [],
  );
  const required = requiredImages(question);
  const failed = required.filter((img) => statuses[img] === "error");
  const ready = required.every((img) => statuses[img] === "loaded");
  const answer = answersOf(state)[state.index];
  const answered = answer !== null;
  const correct = answer === sign.id;
  const exam = state.mode === "exam";
  const reveal = answered && !exam;
  const reverse = question.format === "image";
  const hidden = question.format === "recall" && !question.revealed;
  const firstOptionRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (question.format === "recall" && question.revealed && !answered && ready)
      firstOptionRef.current?.focus();
  }, [question.revealed, question.format, answered, ready]);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [state.index]);
  useEffect(() => {
    if (answered && !exam) feedbackRef.current?.focus({ preventScroll: true });
  }, [answered, exam]);

  return (
    <main id="main-content" className="quiz-screen">
      <div className="quiz-topline">
        <span>
          Запитання <strong>{answeredCount(state) + (answered ? 0 : 1)}</strong>{" "}
          із {state.targetCount}
        </span>
        <span className="score">
          {exam ? (
            "Екзамен"
          ) : (
            <>
              <Mark correct />
              <span>
                Правильних: <strong>{getScore(state)}</strong>
              </span>
            </>
          )}
        </span>
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-label="Відповідей на запитання"
        aria-valuemin={0}
        aria-valuemax={state.targetCount}
        aria-valuenow={
          answersOf(state).filter((value) => value !== null).length
        }
      >
        <span
          style={{
            width: `${(answersOf(state).filter((value) => value !== null).length / state.targetCount) * 100}%`,
          }}
        />
      </div>
      <h1 ref={titleRef} tabIndex={-1} className="quiz-title">
        {reverse
          ? "Який знак відповідає назві?"
          : hidden
            ? "Згадайте значення цього знака"
            : "Що означає цей дорожній знак?"}
      </h1>
      <div className="question-layout">
        <div className="sign-panel">
          <div className="sign-stage">
            {reverse ? (
              <h2 className="reverse-prompt">{sign.answerLabel}</h2>
            ) : (
              <SignImage
                key={sign.id}
                id={sign.id}
                image={question.image}
                reveal={reveal}
                onStatus={onStatus}
                attempt={attempt}
              />
            )}
          </div>
          <p>
            {reveal
              ? `Знак ${sign.number} · ${categories.find((item) => item.id === sign.category)?.name}`
              : reverse
                ? "Знайдіть знак із цією назвою"
                : "Уважно розгляньте зображення"}
          </p>
        </div>
        <div className="answer-panel">
          {!answered && !ready && (
            <div className="image-recovery" role="status">
              <p>
                {failed.length
                  ? "Зображення недоступне. Можна повторити завантаження або пропустити без штрафу."
                  : "Завантаження зображень…"}
              </p>
              {failed.length > 0 && (
                <>
                  <button
                    className="text-button"
                    onClick={() => {
                      setStatuses({});
                      setAttempt((n) => n + 1);
                    }}
                  >
                    Повторити завантаження
                  </button>
                  <button
                    className="text-button"
                    onClick={() =>
                      onChange(
                        quizReducer(state, {
                          type: "skip",
                          failedImages: failed,
                        }),
                      )
                    }
                  >
                    Пропустити без штрафу
                  </button>
                </>
              )}
            </div>
          )}
          <p className="answer-instruction" id="answer-instruction">
            Оберіть одну відповідь
          </p>
          {hidden ? (
            <div className="recall-prompt">
              <p>
                Спробуйте назвати знак подумки. Потім перевірте себе за
                варіантами.
              </p>
              <PrimaryButton
                onClick={() => onChange(quizReducer(state, { type: "reveal" }))}
              >
                Показати варіанти
              </PrimaryButton>
            </div>
          ) : (
            <div
              className={`options${reverse ? " image-options" : ""}`}
              role="group"
              aria-labelledby="answer-instruction"
            >
              {question.optionIds.map((id, i) => {
                const option = getSign(id);
                const right = reveal && id === sign.id;
                const wrong = reveal && id === answer && !correct;
                return (
                  <button
                    ref={i === 0 ? firstOptionRef : undefined}
                    key={id}
                    className={`answer-option${right ? " is-correct" : ""}${wrong ? " is-wrong" : ""}${exam && answered && id === answer ? " is-selected" : ""}`}
                    disabled={answered || !ready}
                    onClick={() =>
                      onChange(
                        quizReducer(state, { type: "answer", optionId: id }),
                      )
                    }
                  >
                    <span className="option-index" aria-hidden="true">
                      {["А", "Б", "В", "Г"][i]}
                    </span>
                    <span className="option-copy">
                      {reverse ? (
                        <SignImage
                          id={id}
                          image={question.optionImages[id]}
                          reveal={reveal}
                          onStatus={onStatus}
                          attempt={attempt}
                          alt={
                            reveal
                              ? undefined
                              : `Варіант ${["А", "Б", "В", "Г"][i]}`
                          }
                        />
                      ) : (
                        option.answerLabel
                      )}
                      {(right || wrong) && (
                        <span className="option-status">
                          {right ? "Правильна відповідь" : "Ваша відповідь"}
                        </span>
                      )}
                    </span>
                    {(right || wrong) && (
                      <span className="option-mark">
                        <Mark correct={right} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
          {question.format === "recall" && (
            <p className="answer-hint">
              Перевірка з варіантами після самостійного згадування.
            </p>
          )}
          {answered && exam ? (
            <div className="answer-feedback">
              <p role="status">
                Відповідь прийнято. Результат буде наприкінці.
              </p>
              <PrimaryButton
                onClick={() => onChange(quizReducer(state, { type: "next" }))}
              >
                {answeredCount(state) >= state.targetCount
                  ? "Показати результат"
                  : "Далі"}
              </PrimaryButton>
            </div>
          ) : answered ? (
            <div
              className="answer-feedback"
              ref={feedbackRef}
              tabIndex={-1}
              role="status"
            >
              <h2 className={correct ? "correct-heading" : "wrong-heading"}>
                {correct ? "Правильно!" : "Цього разу — помилка"}
              </h2>
              {!correct && (
                <p className="correct-answer">
                  Правильна відповідь: <strong>{sign.answerLabel}</strong>.
                </p>
              )}
              <Explanation id={sign.id} />
              <PrimaryButton
                onClick={() => onChange(quizReducer(state, { type: "next" }))}
              >
                {answeredCount(state) >= state.targetCount
                  ? "Показати результат"
                  : "Далі"}
              </PrimaryButton>
            </div>
          ) : (
            <p className="answer-hint">
              {exam
                ? "Результат і пояснення — після завершення екзамену."
                : "Після вибору перевіримо відповідь і покажемо пояснення."}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
