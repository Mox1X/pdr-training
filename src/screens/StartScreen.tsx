import { useEffect, useState } from "react";
import { categories, signs } from "../data/signs";
import type { SignCategory } from "../data/signs";
import { isLearned, isProblem, isDue } from "../progress";
import type { Progress } from "../progress";
import type { QuizMode, QuestionFormat } from "../quiz";
import { Arrow, Mark, PrimaryButton, SignImage } from "../components/shared";

export default function StartScreen({
  onStart,
  progress,
}: {
  onStart: (
    mode: QuizMode,
    selected: SignCategory[],
    format: QuestionFormat,
  ) => void;
  progress: Progress;
}) {
  const [selected, setSelected] = useState<SignCategory[]>(
    categories.map((c) => c.id),
  );
  const [mode, setMode] = useState<QuizMode>("learning");
  const [format, setFormat] = useState<QuestionFormat>("name");
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    const refresh = () => setNow(Date.now());
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  const nextReview = signs
    .filter((s) => selected.includes(s.category))
    .map((s) => progress.signs[s.id]?.nextReviewAt)
    .filter((t): t is number => t !== undefined && t > now)
    .sort((a, b) => a - b)[0];
  const eligible = signs.filter(
    (s) =>
      selected.includes(s.category) &&
      (mode !== "mistakes" || isProblem(progress.signs[s.id])) &&
      (mode !== "review" || isDue(progress.signs[s.id], now)),
  ).length;
  const available = mode === "exam" || eligible > 0;
  const count = mode === "exam" ? 20 : Math.min(10, eligible);
  return (
    <main id="main-content" className="start-screen">
      <section className="intro">
        <div className="intro-copy">
          <h1>
            Знайте знаки.
            <br />
            <span>Рухайтесь впевнено.</span>
          </h1>
          <p className="intro-description">
            Дорожні знаки України — по одному за раз.
            <br className="desktop-break" /> Впізнавайте, перевіряйте себе та
            розбирайте помилки.
          </p>
          <fieldset className="mode-picker">
            <legend>Режим практики</legend>
            {(
              [
                ["learning", "Навчання"],
                ["exam", "Екзамен"],
                ["mistakes", "Робота над помилками"],
                ["review", "Повторити сьогодні"],
              ] as const
            ).map(([id, label]) => (
              <label key={id}>
                <input
                  type="radio"
                  name="mode"
                  checked={mode === id}
                  onChange={() => setMode(id)}
                />
                {label}
              </label>
            ))}
          </fieldset>
          <p className="mode-description">
            {mode === "exam"
              ? "20 випадкових знаків з усіх груп. Результат і пояснення — лише наприкінці."
              : mode === "review"
                ? "Повторення за розкладом, починаючи з найбільш прострочених. До 10 знаків."
                : mode === "mistakes"
                  ? "Повторюйте знаки, у яких помилялися, доки не закріпите знання."
                  : "До 10 знаків. Пояснення після кожної відповіді; проблемні знаки трапляються частіше."}
          </p>
          {mode !== "exam" && (
            <fieldset className="mode-picker">
              <legend>Формат запитання</legend>
              {(
                [
                  ["name", "Знак → назва"],
                  ["image", "Назва → знак"],
                  ["recall", "Спочатку згадати"],
                ] as const
              ).map(([id, label]) => (
                <label key={id}>
                  <input
                    type="radio"
                    name="format"
                    checked={format === id}
                    onChange={() => setFormat(id)}
                  />
                  {label}
                </label>
              ))}
            </fieldset>
          )}
          {mode !== "exam" && (
            <fieldset className="category-picker">
              <legend>Категорії</legend>
              {categories.map((c) => (
                <label key={c.id}>
                  <input
                    type="checkbox"
                    checked={selected.includes(c.id)}
                    onChange={(e) =>
                      setSelected(
                        e.target.checked
                          ? [...selected, c.id]
                          : selected.filter((id) => id !== c.id),
                      )
                    }
                  />
                  {c.name}
                </label>
              ))}
            </fieldset>
          )}
          {available ? (
            <PrimaryButton onClick={() => onStart(mode, selected, format)}>
              {mode === "exam"
                ? "Почати екзамен"
                : mode === "mistakes"
                  ? "Повторити помилки"
                  : mode === "review"
                    ? "Почати повторення"
                    : "Почати тест"}
            </PrimaryButton>
          ) : (
            <div className="empty-notice">
              <p>
                {selected.length === 0
                  ? "Оберіть хоча б одну категорію."
                  : mode === "review"
                    ? `На сьогодні повторень немає.${nextReview ? " Найближче: " + new Date(nextReview).toLocaleString("uk-UA") : " Спочатку пройдіть навчання."}`
                    : "У вибраних категоріях немає знаків для роботи над помилками."}
              </p>
              {selected.length > 0 && (
                <button
                  className="text-button"
                  onClick={() => setMode("learning")}
                >
                  Перейти до навчання
                </button>
              )}
            </div>
          )}
          <p className="mode-description">
            {available && `${count} запитань · `}Вивчено{" "}
            {signs.filter((s) => isLearned(progress.signs[s.id])).length} із{" "}
            {signs.length}
          </p>
          <p className="start-note">Без реєстрації. У власному темпі.</p>
        </div>
        <div className="sign-showcase" aria-label="Приклади дорожніх знаків">
          <div className="showcase-top">
            <span>Зосередьтесь на головному</span>
            <span className="decorative-cross" aria-hidden="true">
              +
            </span>
          </div>
          <div className="showcase-signs">
            <SignImage id="2.3" reveal className="showcase-priority" />
            <SignImage id="1.1" reveal className="showcase-warning" />
            <SignImage id="4.1" reveal className="showcase-mandatory" />
          </div>
          <div className="showcase-bottom">
            <span>Один знак. Чотири варіанти.</span>
            <span className="small-arrow">
              <Arrow />
            </span>
          </div>
        </div>
      </section>
      <div className="session-details" aria-label="Формат тесту">
        <span>
          <strong>{count}</strong> запитань у тесті
        </span>
        <span>
          <strong>4</strong> варіанти відповіді
        </span>
        <span>
          <svg
            width="19"
            height="19"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              cx="12"
              cy="12"
              r="8"
              stroke="currentColor"
              strokeWidth="1.6"
            />
            <path
              d="M12 7v5l3 2"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
          Без таймера
        </span>
        <span>
          <Mark correct />
          {mode === "exam"
            ? "Розбір після екзамену"
            : "Пояснення кожної відповіді"}
        </span>
      </div>
      <section className="catalogue-summary" aria-labelledby="catalogue-title">
        <div className="section-heading">
          <h2 id="catalogue-title">Що тренуємо</h2>
          <p>
            Знаків: {signs.length} · Груп: {categories.length}
          </p>
        </div>
        <div className="category-list">
          {categories.map((category) => (
            <div className="category-item" key={category.id}>
              <SignImage id={category.sampleId} reveal />
              <div>
                <h3>{category.name}</h3>
                <p>{category.description}</p>
              </div>
              <span
                className="category-count"
                aria-label={`${signs.filter((s) => s.category === category.id).length} знаків`}
              >
                {String(
                  signs.filter((s) => s.category === category.id).length,
                ).padStart(2, "0")}
              </span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
