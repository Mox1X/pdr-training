import { signsById } from './data/signs';
export const DAY = 86_400_000;
export interface SignProgress { correct: number; wrong: number; streak: number; lastSessionId: string; confusions: Record<string, number>; lastReviewedAt: number; nextReviewAt: number; reviewStage: number }
export interface Progress { version: 2; signs: Record<string, SignProgress> }
export const STORAGE_KEY = 'pdr.progress.v2';
export const emptyProgress = (): Progress => ({ version: 2, signs: {} });
export const isLearned = (entry?: SignProgress) => (entry?.reviewStage ?? 0) >= 4;
export const isProblem = (entry?: SignProgress) => (entry?.wrong ?? 0) > 0 && !isLearned(entry);
export const isDue = (entry: SignProgress | undefined, now = Date.now()) => !!entry && entry.nextReviewAt <= now;
export function recordAnswer(progress: Progress, sessionId: string, signId: string, answerId: string, now = Date.now()): Progress {
  if (!signsById.has(signId) || !signsById.has(answerId) || !Number.isFinite(now) || now < 0) return progress;
  const previous = progress.signs[signId];
  if (previous?.lastSessionId === sessionId) return progress;
  const correct = signId === answerId;
  const time = Math.max(now, previous?.lastReviewedAt ?? 0);
  let stage = previous?.reviewStage ?? 0;
  let due = previous?.nextReviewAt ?? time;
  if (!correct) { stage = 0; due = time + DAY; }
  else if (!previous || now >= due) { stage = Math.min(4, stage + 1); due = time + [1, 1, 3, 7, 7][stage] * DAY; }
  const entry: SignProgress = { correct: (previous?.correct ?? 0) + Number(correct), wrong: (previous?.wrong ?? 0) + Number(!correct), streak: correct ? (previous?.streak ?? 0) + 1 : 0, lastSessionId: sessionId, lastReviewedAt: time, nextReviewAt: due, reviewStage: stage, confusions: { ...previous?.confusions } };
  if (!correct) entry.confusions[answerId] = (entry.confusions[answerId] ?? 0) + 1;
  return { version: 2, signs: { ...progress.signs, [signId]: entry } };
}
export function loadProgress(): { progress: Progress; warning: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { progress: emptyProgress(), warning: '' };
    const value = JSON.parse(raw);
    if (value.version !== 2 || !value.signs || typeof value.signs !== 'object' || Array.isArray(value.signs)) throw Error('Invalid data');
    const clean = emptyProgress();
    for (const [id, entry] of Object.entries(value.signs)) {
      if (!signsById.has(id)) continue;
      const e = entry as SignProgress;
      if (!e || ![e.correct,e.wrong,e.streak,e.lastReviewedAt,e.nextReviewAt,e.reviewStage].every(n => Number.isSafeInteger(n) && n >= 0) || e.reviewStage > 4 || e.nextReviewAt < e.lastReviewedAt || typeof e.lastSessionId !== 'string' || !e.confusions || typeof e.confusions !== 'object' || Array.isArray(e.confusions)) throw Error('Invalid entry');
      const confusions: Record<string, number> = {};
      for (const [other,count] of Object.entries(e.confusions)) { if (!Number.isSafeInteger(count) || count < 0) throw Error('Invalid confusion'); if (signsById.has(other) && other !== id) confusions[other] = count; }
      clean.signs[id] = { ...e, confusions };
    }
    return { progress: clean, warning: '' };
  } catch { return { progress: emptyProgress(), warning: 'Не вдалося прочитати прогрес. Ця сесія працюватиме без збереження; попередні дані залишено в браузері.' }; }
}
