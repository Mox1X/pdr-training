import {answersOf,timesOf,answeredCount,skippedCount} from './quiz';
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import inventory from '../data/catalogue/inventory.json';
import report from '../data/catalogue/report.json';
import { generateOptions } from './options';
import { emptyProgress } from './progress';
import { signs, categories } from './data/signs';
import { createQuiz, getScore, getSign, quizReducer, shuffle } from './quiz';

function seededRandom(seed: number) {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
}

describe('learning catalogue', () => {
  it('covers the independently reviewed official inventory in all seven groups', () => {
    expect(signs.map(s => s.id).sort()).toEqual(Object.keys(inventory).sort());
    expect(new Set(signs.map(s => s.id)).size).toBe(signs.length);
    for (const c of categories) expect(signs.filter(s => s.category === c.id).length).toBeGreaterThan(0);
    expect(report.missing).toEqual([]);
  });
  it('has real bundled images and three distinct, valid distractors per sign', () => {
    for (const sign of signs) {
      expect(existsSync(`public${sign.image}`)).toBe(true);
      const options=generateOptions(sign,emptyProgress());
      expect(new Set(options).size).toBe(4);
      expect(new Set(options.map(getSign).map(s => s.answerLabel)).size).toBe(4);
      for (const id of options) expect(getSign(id).name).toBeTruthy();
      expect(sign.source).toMatch(/^https:\/\/zakon\.rada\.gov\.ua\/laws\/show\/1306-2001-%D0%BF#n\d+$/);
      expect(sign.explanation.length).toBeGreaterThan(40);
    }
  });
  it('preserves the official source image bytes recorded in the manifest', () => {
    const manifest: { number: string; file: string; sha256: string }[] = JSON.parse(readFileSync('public/signs/sources.json', 'utf8'));
    expect(manifest).toHaveLength(report.images);
    for (const entry of manifest) {
      expect(getSign(entry.number).images).toContain(`/signs/${entry.file}`);
      expect(createHash('sha256').update(readFileSync(`public/signs/${entry.file}`)).digest('hex')).toBe(entry.sha256);
    }
  }, 20000);
});

describe('quiz sessions', () => {
  it('creates ten unique questions, with four unique options and one correct answer across varied random seeds', () => {
    for (let seed = 0; seed < 100; seed++) {
      const state = createQuiz(seededRandom(seed));
      expect(state.questions).toHaveLength(10);
      expect(new Set(state.questions.map((q) => q.signId)).size).toBe(10);
      expect(answersOf(state)).toEqual(Array(10).fill(null));
      for (const question of state.questions) {
        expect(new Set(question.optionIds).size).toBe(4);
        expect(question.optionIds.filter((id) => id === question.signId)).toHaveLength(1);
      }
    }
  });
  it('fixes one valid illustration per question without changing it after answering', () => {
    const q = createQuiz();
    for (const question of q.questions) expect(getSign(question.signId).images).toContain(question.image);
    const answered = quizReducer(q, { type: 'answer', optionId: q.questions[0].signId });
    expect(answered.questions).toBe(q.questions);
  });
  it('shuffles without mutating its input and produces different sessions', () => {
    const input = [1, 2, 3, 4];
    expect(shuffle(input, () => 0)).toEqual([2, 3, 4, 1]);
    expect(input).toEqual([1, 2, 3, 4]);
    expect(createQuiz(seededRandom(1)).questions).not.toEqual(createQuiz(seededRandom(2)).questions);
  });
  it('prevents advancing before answering and ignores answers outside the offered choices', () => {
    const state = createQuiz();
    expect(quizReducer(state, { type: 'next' })).toBe(state);
    expect(quizReducer(state, { type: 'answer', optionId: 'invalid' })).toBe(state);
  });
  it('locks the first answer and counts it once', () => {
    let state = createQuiz();
    const question = state.questions[0];
    state = quizReducer(state, { type: 'answer', optionId: question.signId });
    expect(getScore(state)).toBe(1);
    expect(quizReducer(state, { type: 'answer', optionId: question.optionIds.find((id) => id !== question.signId)! })).toBe(state);
    state = quizReducer(state, { type: 'next' });
    expect(state.index).toBe(1);
    expect(answersOf(state)[1]).toBeNull();
  });
  it.each([0, 5, 10])('finishes with the correct score when %i answers are right', (rightCount) => {
    let state = createQuiz();
    for (let i = 0; i < 10; i++) {
      const question = state.questions[i];
      const id = i < rightCount ? question.signId : question.optionIds.find((id) => id !== question.signId)!;
      state = quizReducer(state, { type: 'answer', optionId: id });
      expect(state.finished).toBe(false);
      state = quizReducer(state, { type: 'next' });
    }
    expect(state.finished).toBe(true);
    expect(getScore(state)).toBe(rightCount);
    expect(quizReducer(state, { type: 'next' })).toBe(state);
    expect(quizReducer(state, { type: 'answer', optionId: state.questions[0].signId })).toBe(state);
  });
  it('starts new sessions with no previous answers or score', () => {
    const old = createQuiz();
    const answered = quizReducer(old, { type: 'answer', optionId: old.questions[0].signId });
    const fresh = createQuiz();
    expect(getScore(answered)).toBe(1);
    expect(getScore(fresh)).toBe(0);
    expect(fresh.index).toBe(0);
    expect(fresh.finished).toBe(false);
  });
});
