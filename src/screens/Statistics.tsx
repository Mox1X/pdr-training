import { useEffect, useRef, useState } from "react";
import { categories, signs } from "../data/signs";
import { isLearned, isDue } from "../progress";
import type { Progress } from "../progress";
import { getSign } from "../quiz";
import { SignImage } from "../components/shared";

export default function Statistics({
  progress,
  onReset,
}: {
  progress: Progress;
  onReset: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    titleRef.current?.focus();
  }, []);
  const learned = signs.filter((s) => isLearned(progress.signs[s.id])).length;
  const untested = signs.filter((s) => !progress.signs[s.id]).length;
  const difficult = signs
    .filter((s) => (progress.signs[s.id]?.wrong ?? 0) > 0)
    .sort((a, b) => progress.signs[b.id].wrong - progress.signs[a.id].wrong);
  const pairs = signs
    .flatMap((s) =>
      Object.entries(progress.signs[s.id]?.confusions ?? {})
        .filter(([, count]) => count >= 2)
        .map(([answerId, count]) => ({
          sign: s,
          answer: getSign(answerId),
          count,
        })),
    )
    .sort((a, b) => b.count - a.count);
  return (
    <main id="main-content" className="stats-screen">
      <h1 ref={titleRef} tabIndex={-1}>
        Ваш прогрес
      </h1>
      <p className="stats-description">
        Вивчено {learned} із {signs.length} · Ще не перевірено: {untested}
      </p>
      <p className="stats-description">
        Знак вивчено після успішних повторень через 1, 3 та 7 днів. Ранні
        правильні відповіді не прискорюють закріплення. Нова помилка знімає цей
        статус. Прогрес зберігається лише в цьому браузері.
      </p>
      <p className="stats-description">
        Пора повторити:{" "}
        {signs.filter((s) => isDue(progress.signs[s.id])).length}
      </p>
      <h2>За категоріями</h2>
      <div className="stats-table">
        {categories.map((c) => (
          <div key={c.id}>
            <span>{c.name}</span>
            <span>
              {
                signs.filter(
                  (s) => s.category === c.id && isLearned(progress.signs[s.id]),
                ).length
              }{" "}
              / {signs.filter((s) => s.category === c.id).length} вивчено
            </span>
          </div>
        ))}
      </div>
      <details className="rule-details">
        <summary>Розклад переглянутих знаків</summary>
        {signs
          .filter((s) => progress.signs[s.id])
          .sort(
            (a, b) =>
              progress.signs[a.id].nextReviewAt -
              progress.signs[b.id].nextReviewAt,
          )
          .map((s) => (
            <p key={s.id}>
              <strong>{s.answerLabel}</strong>
              <br />
              Переглянуто:{" "}
              {new Date(progress.signs[s.id].lastReviewedAt).toLocaleString(
                "uk-UA",
              )}{" "}
              · Наступне повторення:{" "}
              {new Date(progress.signs[s.id].nextReviewAt).toLocaleString(
                "uk-UA",
              )}
            </p>
          ))}
      </details>
      <h2>Найбільше помилок</h2>
      {!difficult.length ? (
        <p>Ще немає помилок. Пройдіть навчання або екзамен.</p>
      ) : (
        <div className="mistake-list">
          {difficult.map((s) => (
            <article className="mistake" key={s.id}>
              <div className="mistake-image">
                <SignImage id={s.id} reveal />
              </div>
              <div className="mistake-copy">
                <h3>{s.answerLabel}</h3>
                <p>
                  Наступне повторення:{" "}
                  {new Date(progress.signs[s.id].nextReviewAt).toLocaleString(
                    "uk-UA",
                  )}
                </p>
                <p>
                  Помилок: {progress.signs[s.id].wrong} · Правильно:{" "}
                  {progress.signs[s.id].correct} ·{" "}
                  {isLearned(progress.signs[s.id])
                    ? "Вивчено"
                    : `До закріплення: ${4 - progress.signs[s.id].reviewStage}`}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
      <h2>Які знаки плутаєте</h2>
      <p className="stats-description">
        Показуємо пари, у яких той самий неправильний варіант вибрано щонайменше
        двічі.
      </p>
      {!pairs.length ? (
        <p>Повторюваних плутанин поки немає.</p>
      ) : (
        pairs.map((pair) => (
          <article
            className="confusion-pair"
            key={`${pair.sign.id}-${pair.answer.id}`}
          >
            <div>
              <SignImage id={pair.sign.id} reveal />
              <span>{pair.sign.answerLabel}</span>
            </div>
            <span>приймаєте за</span>
            <div>
              <SignImage id={pair.answer.id} reveal />
              <span>{pair.answer.answerLabel}</span>
            </div>
            <strong>{pair.count} рази</strong>
          </article>
        ))
      )}
      <div className="reset-progress">
        {confirm ? (
          <>
            <p>
              Видалити всі результати в цьому браузері? Цю дію не можна
              скасувати.
            </p>
            <button
              className="text-button"
              onClick={() => {
                onReset();
                setConfirm(false);
              }}
            >
              Так, скинути прогрес
            </button>
            <button className="text-button" onClick={() => setConfirm(false)}>
              Скасувати
            </button>
          </>
        ) : (
          <button className="text-button" onClick={() => setConfirm(true)}>
            Скинути статистику
          </button>
        )}
      </div>
    </main>
  );
}
