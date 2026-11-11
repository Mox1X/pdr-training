import {answersOf,timesOf,answeredCount,skippedCount} from './quiz';
import { describe, expect, it } from 'vitest';
import { DAY, emptyProgress, recordAnswer, isLearned, isDue } from './progress';
import { createQuiz, quizReducer, getSign } from './quiz';
import { compatible, generateOptions } from './options';
import { signs } from './data/signs';

describe('elapsed-time learning schedule',()=>{
 it('requires 1,3,7-day checks, keeps early deadlines, supports weekly maintenance and error recovery',()=>{
  const t=100000;
  let p=recordAnswer(emptyProgress(),'first','1.1','1.1',t);
  expect(p.signs['1.1'].nextReviewAt).toBe(t+DAY);
  p=recordAnswer(p,'early','1.1','1.1',t+1000);
  expect(p.signs['1.1'].reviewStage).toBe(1);
  expect(p.signs['1.1'].nextReviewAt).toBe(t+DAY);
  expect(isDue(p.signs['1.1'],t+DAY-1)).toBe(false);
  p=recordAnswer(p,'day1','1.1','1.1',t+DAY);
  expect(p.signs['1.1'].nextReviewAt).toBe(t+4*DAY);
  p=recordAnswer(p,'day4','1.1','1.1',t+4*DAY);
  expect(isLearned(p.signs['1.1'])).toBe(false);
  p=recordAnswer(p,'day11','1.1','1.1',t+11*DAY);
  expect(isLearned(p.signs['1.1'])).toBe(true);
  expect(isDue(p.signs['1.1'],t+99*DAY)).toBe(true);
  expect(p.signs['1.1'].nextReviewAt).toBe(t+18*DAY);
  expect(recordAnswer(p,'day11','1.1','1.2',t+12*DAY)).toBe(p);
  p=recordAnswer(p,'mistake','1.1','1.2',t+12*DAY);
  expect(isLearned(p.signs['1.1'])).toBe(false);
  expect(p.signs['1.1'].reviewStage).toBe(0);
  expect(p.signs['1.1'].nextReviewAt).toBe(t+13*DAY);
 });
 it('does not advance when the clock moves backwards',()=>{
  const p=recordAnswer(emptyProgress(),'a','1.1','1.1',10000);
  const next=recordAnswer(p,'b','1.1','1.1',1000);
  expect(next.signs['1.1'].lastReviewedAt).toBe(10000);
  expect(next.signs['1.1'].reviewStage).toBe(1);
 });
 it('selects only due signs for review, overdue first, and prioritizes them in learning',()=>{
  let p=recordAnswer(emptyProgress(),'a','1.1','1.1',0);
  p=recordAnswer(p,'b','2.1','2.1',1000);
  const q=createQuiz({mode:'review',progress:p},Math.random,DAY+500);
  expect(q.questions.map(q=>q.signId)).toEqual(['1.1']);
  expect(createQuiz({progress:p},Math.random,DAY+2000).questions.slice(0,2).map(q=>q.signId)).toEqual(['1.1','2.1']);
  expect(()=>createQuiz({mode:'review',progress:p},Math.random,DAY-1)).toThrow();
 });
});

describe('dynamic options and formats',()=>{
 it('uses distinct compatible options across every sign and both directions',()=>{
  for(const sign of signs){
   const ids=generateOptions(sign,emptyProgress(),()=>.3);
   expect(new Set(ids.map(id=>getSign(id).answerLabel)).size).toBe(4);
   for(const id of ids.filter(id=>id!==sign.id))expect(compatible(sign,getSign(id))).toBe(true);
  }
 });
 it('prioritizes personal confusions, without allowing duplicate correct meanings',()=>{
  let p=recordAnswer(emptyProgress(),'a','1.33','1.32',1000);
  expect(generateOptions(getSign('1.33'),p,()=>0)).toContain('1.32');
  expect(generateOptions(getSign('1.33'),emptyProgress(),()=>.1).map(getSign).every(s=>s.category==='warning')).toBe(true);
  expect(compatible(getSign('1.4.1'),getSign('1.4.4'))).toBe(false);
 });
 it('freezes image choices, blocks recall guesses until revealed and keeps exams forward-only',()=>{
  let q=createQuiz({format:'recall'});
  const answer=q.questions[0].signId;
  expect(quizReducer(q,{type:'answer',optionId:answer})).toBe(q);
  q=quizReducer(q,{type:'reveal'});
  const answered=quizReducer(q,{type:'answer',optionId:answer,now:12345});
  expect(timesOf(answered)[0]).toBe(12345);
  expect(answered.questions).toBe(q.questions);
  expect(createQuiz({mode:'exam',format:'image'}).questions.every(q=>q.format==='name')).toBe(true);
  expect(createQuiz({format:'image'}).questions.every(q=>Object.keys(q.optionImages).length===4)).toBe(true);
 });
});
