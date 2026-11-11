import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { categories, RULES_SOURCE, signs, SOURCE_REVIEW_DATE } from './data/signs';
import { emptyProgress, isLearned, isProblem, loadProgress, recordAnswer, STORAGE_KEY } from './progress';
import type { Progress } from './progress';
import type { SignCategory } from './data/signs';
import { createQuiz, getScore, getSign, quizReducer } from './quiz';
import type { QuizState, QuizMode } from './quiz';

function Arrow({ back = false }: { back?: boolean }) {
  return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" style={back ? { transform: 'rotate(180deg)' } : undefined}><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function Mark({ correct }: { correct: boolean }) {
  return <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />{correct ? <path d="m8 12 2.5 2.5L16 9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /> : <path d="m9 9 6 6m0-6-6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />}</svg>;
}
function PrimaryButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <button className="primary-button" onClick={onClick}>{children}<Arrow /></button>;
}
function SignImage({ id, reveal = false, className = '' }: { id: string; reveal?: boolean; className?: string }) {
  const sign = getSign(id);
  const [failed, setFailed] = useState(false);
  if (failed) return <p className="image-error" role="alert">Не вдалося завантажити знак. Оновіть сторінку, щоб спробувати ще раз.</p>;
  return <img className={`sign-image ${className}`} src={sign.image} alt={reveal ? `Знак ${sign.number}: ${sign.name}` : 'Дорожній знак, назву якого потрібно визначити'} onError={() => setFailed(true)} draggable={false} />;
}
function SourceLink({ href = RULES_SOURCE }: { href?: string }) {
  return <a className="source-link" href={href} target="_blank" rel="noreferrer">Переглянути в ПДР <span aria-hidden="true">↗</span></a>;
}

function StartScreen({ onStart, progress }: { onStart: (mode: QuizMode, selected: SignCategory[]) => void; progress: Progress }) {
  const [mode, setMode] = useState<QuizMode>('learning');
  const [selected, setSelected] = useState<SignCategory[]>(categories.map(c => c.id));
  const eligible = signs.filter(s => selected.includes(s.category) && (mode !== 'mistakes' || isProblem(progress.signs[s.id]))).length;
  const available = mode === 'exam' || eligible > 0;
  const count = mode === 'exam' ? 20 : Math.min(10, eligible);
  return <main id="main-content" className="start-screen">
    <section className="intro">
      <div className="intro-copy">
        <h1>Знайте знаки.<br /><span>Рухайтесь впевнено.</span></h1>
        <p className="intro-description">Дорожні знаки України — по одному за раз.<br className="desktop-break" /> Впізнавайте, перевіряйте себе та розбирайте помилки.</p>
        <fieldset className="mode-picker"><legend>Режим практики</legend>{([['learning', 'Навчання'], ['exam', 'Екзамен'], ['mistakes', 'Робота над помилками']] as const).map(([id, label]) => <label key={id}><input type="radio" name="mode" checked={mode === id} onChange={() => setMode(id)} />{label}</label>)}</fieldset>
        <p className="mode-description">{mode === 'exam' ? '20 випадкових знаків з усіх груп. Результат і пояснення — лише наприкінці.' : mode === 'mistakes' ? 'Повторюйте знаки, у яких помилялися, доки не закріпите знання.' : 'До 10 знаків. Пояснення помилок одразу; проблемні знаки трапляються частіше.'}</p>
        {mode !== 'exam' && <fieldset className="category-picker"><legend>Категорії</legend>{categories.map(c => <label key={c.id}><input type="checkbox" checked={selected.includes(c.id)} onChange={e => setSelected(e.target.checked ? [...selected, c.id] : selected.filter(id => id !== c.id))} />{c.name}</label>)}</fieldset>}
        {available ? <PrimaryButton onClick={() => onStart(mode, selected)}>{mode === 'exam' ? 'Почати екзамен' : mode === 'mistakes' ? 'Повторити помилки' : 'Почати тест'}</PrimaryButton> : <div className="empty-notice"><p>{selected.length === 0 ? 'Оберіть хоча б одну категорію.' : 'У вибраних категоріях немає знаків для роботи над помилками.'}</p>{selected.length > 0 && <button className="text-button" onClick={() => setMode('learning')}>Перейти до навчання</button>}</div>}
        <p className="mode-description">{available && `${count} запитань · `}Вивчено {signs.filter(s => isLearned(progress.signs[s.id])).length} із {signs.length}</p>
        <p className="start-note">Без реєстрації. У власному темпі.</p>
      </div>
      <div className="sign-showcase" aria-label="Приклади дорожніх знаків">
        <div className="showcase-top"><span>Зосередьтесь на головному</span><span className="decorative-cross" aria-hidden="true">+</span></div>
        <div className="showcase-signs">
          <SignImage id="2.3" reveal className="showcase-priority" />
          <SignImage id="1.1" reveal className="showcase-warning" />
          <SignImage id="4.1" reveal className="showcase-mandatory" />
        </div>
        <div className="showcase-bottom"><span>Один знак. Чотири варіанти.</span><span className="small-arrow"><Arrow /></span></div>
      </div>
    </section>
    <div className="session-details" aria-label="Формат тесту">
      <span><strong>{count}</strong> запитань у тесті</span>
      <span><strong>4</strong> варіанти відповіді</span>
      <span><svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6" /><path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>Без таймера</span>
      <span><Mark correct />{mode === 'exam' ? 'Розбір після екзамену' : 'Пояснення помилок'}</span>
    </div>
    <section className="catalogue-summary" aria-labelledby="catalogue-title">
      <div className="section-heading"><h2 id="catalogue-title">Що тренуємо</h2><p>{signs.length} знаки · {categories.length} груп</p></div>
      <div className="category-list">{categories.map((category) => <div className="category-item" key={category.id}>
        <SignImage id={category.sampleId} reveal />
        <div><h3>{category.name}</h3><p>{category.description}</p></div>
        <span className="category-count" aria-label={`${signs.filter(s => s.category === category.id).length} знаків`}>{String(signs.filter(s => s.category === category.id).length).padStart(2, '0')}</span>
      </div>)}</div>
    </section>
  </main>;
}

function QuizScreen({ state, onChange }: { state: QuizState; onChange: (state: QuizState) => void }) {
  const question = state.questions[state.index];
  const sign = getSign(question.signId);
  const answer = state.answers[state.index];
  const answered = answer !== null;
  const correct = answer === sign.id;
  const exam = state.mode === 'exam';
  const reveal = answered && !exam;
  const titleRef = useRef<HTMLHeadingElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [state.index]);
  useEffect(() => {
    if (answered && !exam) feedbackRef.current?.focus({ preventScroll: true });
  }, [answered, exam]);

  return <main id="main-content" className="quiz-screen">
    <div className="quiz-topline"><span>Запитання <strong>{state.index + 1}</strong> із {state.questions.length}</span><span className="score">{exam ? 'Екзамен' : <><Mark correct /><span>Правильних: <strong>{getScore(state)}</strong></span></>}</span></div>
    <div className="progress-track" role="progressbar" aria-label="Відповідей на запитання" aria-valuemin={0} aria-valuemax={state.questions.length} aria-valuenow={state.answers.filter((value) => value !== null).length}><span style={{ width: `${state.answers.filter((value) => value !== null).length / state.questions.length * 100}%` }} /></div>
    <h1 ref={titleRef} tabIndex={-1} className="quiz-title">Що означає цей дорожній знак?</h1>
    <div className="question-layout">
      <div className="sign-panel"><div className="sign-stage"><SignImage key={sign.id} id={sign.id} reveal={reveal} /></div><p>{reveal ? `Знак ${sign.number} · ${categories.find((item) => item.id === sign.category)?.name}` : 'Уважно розгляньте зображення'}</p></div>
      <div className="answer-panel">
        <p className="answer-instruction" id="answer-instruction">Оберіть одну відповідь</p>
        <div className="options" role="group" aria-labelledby="answer-instruction">{question.optionIds.map((id, i) => {
          const option = getSign(id);
          const right = reveal && id === sign.id;
          const wrong = reveal && id === answer && !correct;
          return <button key={id} className={`answer-option${right ? ' is-correct' : ''}${wrong ? ' is-wrong' : ''}${exam && answered && id === answer ? ' is-selected' : ''}`} disabled={answered} onClick={() => onChange(quizReducer(state, { type: 'answer', optionId: id }))}>
            <span className="option-index" aria-hidden="true">{['А', 'Б', 'В', 'Г'][i]}</span>
            <span className="option-copy">{option.name}{(right || wrong) && <span className="option-status">{right ? 'Правильна відповідь' : 'Ваша відповідь'}</span>}</span>
            {(right || wrong) && <span className="option-mark"><Mark correct={right} /></span>}
          </button>;
        })}</div>
        {answered && exam ? <div className="answer-feedback"><p role="status">Відповідь прийнято. Результат буде наприкінці.</p><PrimaryButton onClick={() => onChange(quizReducer(state, { type: 'next' }))}>{state.index === state.questions.length - 1 ? 'Показати результат' : 'Далі'}</PrimaryButton></div> : answered ? <div className="answer-feedback" ref={feedbackRef} tabIndex={-1} role="status">
          <h2 className={correct ? 'correct-heading' : 'wrong-heading'}>{correct ? 'Правильно!' : 'Цього разу — помилка'}</h2>
          {!correct && <p className="correct-answer">Правильна відповідь: <strong>{sign.name}</strong>.</p>}
          {!correct && <><p>{sign.explanation}</p><SourceLink href={sign.source} /></>}
          <PrimaryButton onClick={() => onChange(quizReducer(state, { type: 'next' }))}>{state.index === state.questions.length - 1 ? 'Показати результат' : 'Далі'}</PrimaryButton>
        </div> : <p className="answer-hint">{exam ? 'Результат і пояснення — після завершення екзамену.' : 'Після вибору перевіримо відповідь і пояснимо помилку.'}</p>}
      </div>
    </div>
  </main>;
}

function ResultScreen({ state, onRestart }: { state: QuizState; onRestart: () => void }) {
  const score = getScore(state);
  const mistakes = state.questions.flatMap((question, i) => state.answers[i] !== question.signId ? [{ sign: getSign(question.signId), answer: getSign(state.answers[i]!) }] : []);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);
  return <main id="main-content" className="result-screen">
    <section className="result-summary">
      <div className="result-score" aria-label={`${score} правильних відповідей із ${state.questions.length}`}><strong>{score}</strong><span>/ {state.questions.length}</span></div>
      <div className="result-copy"><p>{state.mode === 'exam' ? 'Екзамен' : state.mode === 'mistakes' ? 'Робота над помилками' : 'Навчання'} · {Math.round(score / state.questions.length * 100)}% правильних</p><h1 tabIndex={-1} ref={headingRef}>{score === state.questions.length ? 'Усі знаки впізнано!' : score / state.questions.length >= .7 ? 'Гарна робота. Продовжуйте!' : 'Кожна спроба — крок уперед.'}</h1><p>{score === state.questions.length ? 'Жодної помилки в цьому тесті. Спробуйте нову добірку знаків.' : 'Перегляньте пояснення нижче, щоб наступного разу впізнати ці знаки.'}</p><PrimaryButton onClick={onRestart}>Новий тест</PrimaryButton></div>
    </section>
    <section className="mistakes-section" aria-labelledby="mistakes-title"><div className="section-heading"><h2 id="mistakes-title">{mistakes.length ? 'Розберімо помилки' : 'Чудовий результат'}</h2><p>{mistakes.length ? `Правильних відповідей: ${score} із ${state.questions.length}` : `Усі ${state.questions.length} відповідей правильні`}</p></div>
      {mistakes.length ? <div className="mistake-list">{mistakes.map(({ sign, answer }) => <article className="mistake" key={sign.id}>
        <div className="mistake-image"><SignImage id={sign.id} reveal /></div>
        <div className="mistake-copy"><p className="sign-number">Знак {sign.number}</p><h3>{sign.name}</h3><p className="previous-answer">Ваша відповідь: {answer.name}</p><p>{sign.explanation}</p><SourceLink href={sign.source} /></div>
      </article>)}</div> : <p className="perfect-message"><Mark correct />У цій добірці немає помилок для повторення.</p>}
    </section>
  </main>;
}

function Statistics({ progress, onReset }: { progress: Progress; onReset: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { titleRef.current?.focus(); }, []);
  const learned = signs.filter(s => isLearned(progress.signs[s.id])).length;
  const untested = signs.filter(s => !progress.signs[s.id]).length;
  const difficult = signs.filter(s => (progress.signs[s.id]?.wrong ?? 0) > 0).sort((a,b) => progress.signs[b.id].wrong - progress.signs[a.id].wrong);
  const pairs = signs.flatMap(s => Object.entries(progress.signs[s.id]?.confusions ?? {}).filter(([, count]) => count >= 2).map(([answerId, count]) => ({ sign: s, answer: getSign(answerId), count }))).sort((a,b) => b.count - a.count);
  return <main id="main-content" className="stats-screen"><h1 ref={titleRef} tabIndex={-1}>Ваш прогрес</h1>
    <p className="stats-description">Вивчено {learned} із {signs.length} · Ще не перевірено: {untested}</p>
    <p className="stats-description">Знак вивчено після трьох правильних відповідей у різних сесіях. Нова помилка знімає цей статус. Прогрес зберігається лише в цьому браузері.</p>
    <h2>За категоріями</h2><div className="stats-table">{categories.map(c => <div key={c.id}><span>{c.name}</span><span>{signs.filter(s => s.category === c.id && isLearned(progress.signs[s.id])).length} / {signs.filter(s => s.category === c.id).length} вивчено</span></div>)}</div>
    <h2>Найбільше помилок</h2>{!difficult.length ? <p>Ще немає помилок. Пройдіть навчання або екзамен.</p> : <div className="mistake-list">{difficult.map(s => <article className="mistake" key={s.id}><div className="mistake-image"><SignImage id={s.id} reveal /></div><div className="mistake-copy"><h3>{s.name}</h3><p>Помилок: {progress.signs[s.id].wrong} · Правильно: {progress.signs[s.id].correct} · {isLearned(progress.signs[s.id]) ? 'Вивчено' : `До закріплення: ${3-progress.signs[s.id].streak}`}</p></div></article>)}</div>}
    <h2>Які знаки плутаєте</h2><p className="stats-description">Показуємо пари, у яких той самий неправильний варіант вибрано щонайменше двічі.</p>{!pairs.length ? <p>Повторюваних плутанин поки немає.</p> : pairs.map(pair => <article className="confusion-pair" key={`${pair.sign.id}-${pair.answer.id}`}><div><SignImage id={pair.sign.id} reveal /><span>{pair.sign.name}</span></div><span>приймаєте за</span><div><SignImage id={pair.answer.id} reveal /><span>{pair.answer.name}</span></div><strong>{pair.count} рази</strong></article>)}
    <div className="reset-progress">{confirm ? <><p>Видалити всі результати в цьому браузері? Цю дію не можна скасувати.</p><button className="text-button" onClick={() => { onReset(); setConfirm(false); }}>Так, скинути прогрес</button><button className="text-button" onClick={() => setConfirm(false)}>Скасувати</button></> : <button className="text-button" onClick={() => setConfirm(true)}>Скинути статистику</button>}</div>
  </main>;
}

export default function App() {
  const [loaded] = useState(loadProgress);
  const [progress, setProgress] = useState(loaded.progress);
  const progressRef = useRef(progress);
  const canSave = useRef(!loaded.warning);
  const [warning, setWarning] = useState(loaded.warning);
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const [screen, setScreen] = useState<'home' | 'stats'>('home');
  const save = (next: Progress) => {
    progressRef.current = next; setProgress(next);
    if (!canSave.current) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); }
    catch { canSave.current = false; setWarning('Збереження недоступне. Прогрес цієї сесії залишиться лише до оновлення сторінки.'); }
  };
  const start = (mode: QuizMode, selected: SignCategory[]) => { setScreen('home'); setQuiz(createQuiz({ mode, categories: selected, progress: progressRef.current })); };
  const changeQuiz = (next: QuizState) => {
    let updated = progressRef.current;
    if (next.mode !== 'exam' || next.finished) next.questions.forEach((q, i) => { const answer = next.answers[i]; if (answer) updated = recordAnswer(updated, next.sessionId, q.signId, answer); });
    if (updated !== progressRef.current) save(updated);
    setQuiz(next);
  };
  const reset = () => {
    try { localStorage.removeItem(STORAGE_KEY); canSave.current = true; setWarning(''); }
    catch { canSave.current = false; setWarning('Не вдалося видалити збережені дані браузера. Поточний прогрес скинуто лише в пам’яті.'); }
    progressRef.current = emptyProgress(); setProgress(progressRef.current);
  };
  return <><a className="skip-link" href="#main-content">Перейти до вмісту</a><div className="app-shell">
    <header className="app-header"><a className="brand" href="/" aria-label="ПДР Практика — на головну"><span className="brand-symbol"><svg aria-hidden="true" viewBox="0 0 32 32" fill="none"><path d="M13 26V11H8l8-7 8 7h-5v15" fill="currentColor" /></svg></span><span>ПДР<span className="brand-light"> Практика</span></span></a><nav aria-label="Навігація"><button className="text-button" onClick={() => {setQuiz(null); setScreen('home');}}>Практика</button><button className="text-button" onClick={() => {setQuiz(null); setScreen('stats');}}>Статистика</button></nav></header>
    {warning && <p className="storage-warning" role="alert">{warning}</p>}
    {screen === 'stats' ? <Statistics progress={progress} onReset={reset} /> : !quiz ? <StartScreen onStart={start} progress={progress} /> : quiz.finished ? <ResultScreen state={quiz} onRestart={() => { if (quiz.mode === 'mistakes' && !signs.some(s => quiz.selectedCategories.includes(s.category) && isProblem(progress.signs[s.id]))) setQuiz(null); else start(quiz.mode, quiz.selectedCategories); }} /> : <QuizScreen state={quiz} onChange={changeQuiz} />}
    <footer className="app-footer"><span>Практика, що додає впевненості.</span><span><a href={RULES_SOURCE} target="_blank" rel="noreferrer">Джерело: ПДР України</a><span className="footer-date"> · Звірено {SOURCE_REVIEW_DATE}</span></span></footer>
  </div></>;
}
