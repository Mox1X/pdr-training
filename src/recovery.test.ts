import { describe, it, expect } from "vitest";
import {
  createQuiz,
  quizReducer,
  answersOf,
  answeredCount,
  skippedCount,
  getScore,
  requiredImages,
} from "./quiz";
import { recordAnswer, emptyProgress } from "./progress";
import { execFileSync } from "node:child_process";

describe("image skips", () => {
  it("replaces without penalties and finishes on the target number of answers", () => {
    let q = createQuiz({ mode: "exam" });
    const failed = q.questions[0];
    q = quizReducer(q, {
      type: "skip",
      failedImages: [failed.image],
      random: () => 0.2,
    });
    expect(skippedCount(q)).toBe(1);
    expect(getScore(q)).toBe(0);
    expect(q.index).toBe(1);
    let guard = 0;
    while (!q.finished && guard++ < 50) {
      const current = q.questions[q.index];
      q = quizReducer(q, { type: "answer", optionId: current.signId });
      q = quizReducer(q, { type: "next" });
    }
    expect(q.finished).toBe(true);
    expect(answeredCount(q)).toBe(20);
    expect(getScore(q)).toBe(20);
    expect(q.questions.filter((x) => x.signId === failed.signId)).toHaveLength(
      1,
    );
    expect(
      q.questions
        .slice(1)
        .every((x) => !requiredImages(x).includes(failed.image)),
    ).toBe(true);
    let p = emptyProgress();
    q.questions.forEach((x, i) => {
      const a = answersOf(q)[i];
      if (a) p = recordAnswer(p, q.sessionId, x.signId, a);
    });
    expect(p.signs[failed.signId]).toBeUndefined();
  });
  it("rejects skips after answering and unrelated failures", () => {
    const q = createQuiz();
    expect(quizReducer(q, { type: "skip", failedImages: ["bad"] })).toBe(q);
    const a = quizReducer(q, {
      type: "answer",
      optionId: q.questions[0].signId,
    });
    expect(
      quizReducer(a, { type: "skip", failedImages: [q.questions[0].image] }),
    ).toBe(a);
  });
  it("ends an exhausted selection with zero evaluated answers", () => {
    let q = createQuiz({ categories: ["priority"] });
    q = { ...q, eligibleIds: q.questions.map((x) => x.signId) };
    let guard = 0;
    while (!q.finished && guard++ < 10)
      q = quizReducer(q, {
        type: "skip",
        failedImages: requiredImages(q.questions[q.index]),
      });
    expect(q.finished).toBe(true);
    expect(answeredCount(q)).toBe(0);
    expect(getScore(q)).toBe(0);
  });
  it("accepts a failed distractor in reverse questions without changing the target on retry", () => {
    const q = createQuiz({ format: "image" }),
      image =
        q.questions[0].optionImages[
          q.questions[0].optionIds.find((id) => id !== q.questions[0].signId)!
        ];
    const next = quizReducer(q, { type: "skip", failedImages: [image] });
    expect(next.blockedImages).toContain(image);
    expect(skippedCount(next)).toBeGreaterThanOrEqual(1);
  });
});
it("validates all 369 source bindings and reviewed text hashes against the official snapshot", () => {
  const report = JSON.parse(
    execFileSync("python", ["scripts/check-content.py"], { encoding: "utf8" }),
  );
  expect(report.positions).toBe(369);
  expect(report.errors).toEqual([]);
});
it('invalidates a reviewed explanation after an edit without granting approval',()=>{
 const output=execFileSync('python',['-c',`import importlib.util
spec=importlib.util.spec_from_file_location('c','scripts/check-content.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
original=m.payload
def edited(sign):
 result=original(sign)
 if sign['id']=='1.1':result['sign']={**sign,'explanation':'changed'}
 return result
m.payload=edited
assert not m.check()
`],{encoding:'utf8'});
 expect(output).toContain('1.1: content review stale');
});
