import { signs, signsById } from './data/signs';
import { emptyProgress, isProblem } from './progress';
import type { Progress } from './progress';
import type { RoadSign, SignCategory } from './data/signs';

export const QUESTION_COUNT = 10;
export interface Question { signId: string; optionIds: string[] }
export type QuizMode = 'learning' | 'exam' | 'mistakes';
export interface QuizOptions { mode: QuizMode; categories: SignCategory[]; progress: Progress }
export interface QuizState { sessionId: string; mode: QuizMode; selectedCategories: SignCategory[]; questions: Question[]; answers: (string | null)[]; index: number; finished: boolean }
export type QuizAction = { type: 'answer'; optionId: string } | { type: 'next' };

export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function createQuiz(optionsOrRandom: Partial<QuizOptions> | (() => number) = {}, random: () => number = Math.random): QuizState {
  const options = typeof optionsOrRandom === 'function' ? {} : optionsOrRandom;
  if (typeof optionsOrRandom === 'function') random = optionsOrRandom;
  const mode = options.mode ?? 'learning';
  const progress = options.progress ?? emptyProgress();
  let pool = signs.filter(sign => mode === 'exam' || !options.categories || options.categories.includes(sign.category));
  if (mode === 'mistakes') pool = pool.filter(sign => isProblem(progress.signs[sign.id]));
  const count = mode === 'exam' ? 20 : Math.min(QUESTION_COUNT, pool.length);
  if (pool.length < count || count === 0) throw new Error('No eligible signs');
  const selected: RoadSign[] = [];
  if (mode === 'exam') selected.push(...shuffle(pool, random).slice(0, count));
  else {
    pool = [...pool];
    while (selected.length < count) {
      const weight = (sign: RoadSign) => isProblem(progress.signs[sign.id]) ? 4 : 1;
      let cursor = random() * pool.reduce((total, sign) => total + weight(sign), 0);
      let index = pool.length - 1;
      for (let i = 0; i < pool.length; i++) { cursor -= weight(pool[i]); if (cursor < 0) { index = i; break; } }
      selected.push(pool.splice(index, 1)[0]);
    }
  }
  const questions = selected.map(sign => ({ signId: sign.id, optionIds: shuffle([sign.id, ...sign.distractorIds], random) }));
  return { sessionId: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Array.from(crypto.getRandomValues(new Uint32Array(4)), n => n.toString(16).padStart(8, '0')).join(''), mode, selectedCategories: options.categories ?? [...new Set(signs.map(s => s.category))], questions, answers: questions.map(() => null), index: 0, finished: false };
}

export function quizReducer(state: QuizState, action: QuizAction): QuizState {
  if (state.finished) return state;
  if (action.type === 'answer') {
    if (state.answers[state.index] !== null || !state.questions[state.index].optionIds.includes(action.optionId)) return state;
    return { ...state, answers: state.answers.map((answer, i) => i === state.index ? action.optionId : answer) };
  }
  if (state.answers[state.index] === null) return state;
  return state.index === state.questions.length - 1
    ? { ...state, finished: true }
    : { ...state, index: state.index + 1 };
}

export function getScore(state: QuizState): number {
  return state.questions.reduce((score, question, i) => score + Number(state.answers[i] === question.signId), 0);
}

export function getSign(id: string): RoadSign {
  const sign = signsById.get(id);
  if (!sign) throw new Error(`Unknown sign: ${id}`);
  return sign;
}
