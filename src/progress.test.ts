import { afterEach, describe, expect, it, vi } from 'vitest';
import { emptyProgress, recordAnswer, isLearned, isProblem, loadProgress, STORAGE_KEY } from './progress';
import { createQuiz } from './quiz';
import { signs } from './data/signs';
afterEach(() => vi.unstubAllGlobals());

describe('persistent learning', () => {
  it('learns across three different sessions and loses mastery on an error', () => {
    let p = emptyProgress();
    p = recordAnswer(p, 'one', '1.1', '1.1');
    expect(recordAnswer(p, 'one', '1.1', '1.2')).toBe(p);
    expect(isLearned(p.signs['1.1'])).toBe(false);
    p = recordAnswer(p, 'two', '1.1', '1.1');
    p = recordAnswer(p, 'three', '1.1', '1.1');
    expect(isLearned(p.signs['1.1'])).toBe(true);
    p = recordAnswer(p, 'four', '1.1', '1.2');
    expect(isLearned(p.signs['1.1'])).toBe(false);
    expect(isProblem(p.signs['1.1'])).toBe(true);
    expect(p.signs['1.1'].confusions['1.2']).toBe(1);
  });
  it('counts recurring directional confusions and ignores invalid signs', () => {
    let p = emptyProgress();
    expect(recordAnswer(p, '1', 'bad', '1.1')).toBe(p);
    p = recordAnswer(p, '1', '1.1', '1.2');
    p = recordAnswer(p, '2', '1.1', '1.2');
    expect(p.signs['1.1'].confusions['1.2']).toBe(2);
    expect(p.signs['1.2']).toBeUndefined();
  });
  it('loads valid data and starts new signs at zero', () => {
    const p = recordAnswer(emptyProgress(), 's', '1.1', '1.1');
    vi.stubGlobal('localStorage', { getItem: (key: string) => key === STORAGE_KEY ? JSON.stringify(p) : null });
    expect(loadProgress()).toEqual({ progress: p, warning: '' });
    expect(loadProgress().progress.signs['5.1']).toBeUndefined();
  });
  it.each(['{', '{"version":99,"signs":{}}', '{"version":1,"signs":{"1.1":{"correct":-1}}}'])('handles damaged data without throwing: %s', raw => {
    vi.stubGlobal('localStorage', { getItem: () => raw });
    expect(loadProgress().progress).toEqual(emptyProgress());
    expect(loadProgress().warning).not.toBe('');
  });
  it('handles unavailable storage', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw Error('denied'); } });
    expect(loadProgress().warning).not.toBe('');
  });
});

describe('mode selection', () => {
  it('exams always have twenty distinct signs from all categories', () => {
    const q = createQuiz({ mode: 'exam', categories: ['warning'] });
    expect(q.questions).toHaveLength(20);
    expect(new Set(q.questions.map(q => q.signId)).size).toBe(20);
    expect(q.questions.some(q => signs.find(s => s.id === q.signId)?.category !== 'warning')).toBe(true);
  });
  it('uses six signs when a single category is selected and rejects empty pools', () => {
    const q = createQuiz({ categories: ['plate'] });
    expect(q.questions).toHaveLength(6);
    expect(q.questions.every(q => q.signId.startsWith('7.'))).toBe(true);
    expect(() => createQuiz({ categories: [] })).toThrow();
    expect(() => createQuiz({ mode: 'mistakes' })).toThrow();
  });
  it('reviews only unmastered signs with errors within the selected groups', () => {
    let p = recordAnswer(emptyProgress(), 'one', '1.1', '1.2');
    p = recordAnswer(p, 'one', '2.1', '2.2');
    const q = createQuiz({ mode: 'mistakes', categories: ['warning'], progress: p });
    expect(q.questions.map(q => q.signId)).toEqual(['1.1']);
    for (const id of ['two', 'three', 'four']) p = recordAnswer(p, id, '1.1', '1.1');
    expect(() => createQuiz({ mode: 'mistakes', categories: ['warning'], progress: p })).toThrow();
  });
  it('weights problematic signs fourfold and keeps each session unique', () => {
    const progress = recordAnswer(emptyProgress(), 'one', '1.1', '1.2');
    let state = 123;
    const random = () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 4294967296; };
    let problem = 0, other = 0;
    for (let i = 0; i < 3000; i++) {
      const quiz = createQuiz({ progress }, random);
      problem += Number(quiz.questions[0].signId === '1.1');
      other += Number(quiz.questions[0].signId === '1.2');
      expect(new Set(quiz.questions.map(q => q.signId)).size).toBe(10);
    }
    expect(problem / other).toBeGreaterThan(3);
    expect(problem / other).toBeLessThan(5);
  });
});
