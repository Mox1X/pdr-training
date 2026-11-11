import { signsById } from './data/signs';
export interface SignProgress { correct: number; wrong: number; streak: number; lastSessionId: string; confusions: Record<string, number> }
export interface Progress { version: 1; signs: Record<string, SignProgress> }
export const STORAGE_KEY = 'pdr.progress.v1';
export const emptyProgress = (): Progress => ({ version: 1, signs: {} });
export const isLearned = (entry?: SignProgress) => (entry?.streak ?? 0) >= 3;
export const isProblem = (entry?: SignProgress) => (entry?.wrong ?? 0) > 0 && !isLearned(entry);
export function recordAnswer(progress: Progress, sessionId: string, signId: string, answerId: string): Progress {
  if (!signsById.has(signId) || !signsById.has(answerId)) return progress;
  const previous = progress.signs[signId] ?? { correct: 0, wrong: 0, streak: 0, lastSessionId: '', confusions: {} };
  if (previous.lastSessionId === sessionId) return progress;
  const correct = signId === answerId;
  const entry: SignProgress = { correct: previous.correct + Number(correct), wrong: previous.wrong + Number(!correct), streak: correct ? Math.min(3, previous.streak + 1) : 0, lastSessionId: sessionId, confusions: { ...previous.confusions } };
  if (!correct) entry.confusions[answerId] = (entry.confusions[answerId] ?? 0) + 1;
  return { version: 1, signs: { ...progress.signs, [signId]: entry } };
}
export function loadProgress(): { progress: Progress; warning: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { progress: emptyProgress(), warning: '' };
    const value = JSON.parse(raw);
    if (value.version !== 1 || !value.signs || typeof value.signs !== 'object' || Array.isArray(value.signs)) throw Error('Invalid data');
    const clean = emptyProgress();
    for (const [id, entry] of Object.entries(value.signs)) {
      if (!signsById.has(id)) continue;
      const e = entry as SignProgress;
      if (!e || ![e.correct, e.wrong, e.streak].every(n => Number.isSafeInteger(n) && n >= 0) || e.streak > 3 || e.streak > e.correct || typeof e.lastSessionId !== 'string' || !e.confusions || typeof e.confusions !== 'object' || Array.isArray(e.confusions)) throw Error('Invalid entry');
      const confusions: Record<string, number> = {};
      for (const [other, count] of Object.entries(e.confusions)) {
        if (!Number.isSafeInteger(count) || count < 0) throw Error('Invalid confusion');
        if (signsById.has(other) && other !== id) confusions[other] = count;
      }
      clean.signs[id] = { ...e, confusions };
    }
    return { progress: clean, warning: '' };
  } catch {
    return { progress: emptyProgress(), warning: 'Не вдалося прочитати прогрес. Ця сесія працюватиме без збереження; попередні дані залишено в браузері.' };
  }
}
