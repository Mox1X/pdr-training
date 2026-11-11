import { signs, signsById } from "./data/signs";
import { generateOptions } from "./options";
import { emptyProgress, isProblem, isDue } from "./progress";
import type { Progress } from "./progress";
import type { RoadSign, SignCategory } from "./data/signs";

export const QUESTION_COUNT = 10;
export interface Question {
  signId: string;
  image: string;
  optionIds: string[];
  optionImages: Record<string, string>;
  format: QuestionFormat;
  revealed: boolean;
}
export type QuestionFormat = "name" | "image" | "recall";
export type QuizMode = "learning" | "exam" | "mistakes" | "review";
export type QuestionOutcome =
  | { status: "pending" }
  | { status: "answered"; optionId: string; answeredAt: number }
  | { status: "skipped"; reason: "image-error" };
export interface QuizOptions {
  mode: QuizMode;
  categories: SignCategory[];
  progress: Progress;
  format: QuestionFormat;
  eligibleIds?: string[];
  count?: number;
  blockedImages?: string[];
}
export interface QuizState {
  sessionId: string;
  mode: QuizMode;
  selectedCategories: SignCategory[];
  questions: Question[];
  outcomes: QuestionOutcome[];
  targetCount: number;
  eligibleIds: string[];
  blockedImages: string[];
  progressSnapshot: Progress;
  createdAt: number;
  index: number;
  finished: boolean;
}
export type QuizAction =
  | { type: "answer"; optionId: string; now?: number }
  | { type: "next" }
  | { type: "reveal" }
  | { type: "skip"; failedImages: string[]; random?: () => number };

export function shuffle<T>(
  items: readonly T[],
  random: () => number = Math.random,
): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function createQuiz(
  optionsOrRandom: Partial<QuizOptions> | (() => number) = {},
  random: () => number = Math.random,
  now = Date.now(),
): QuizState {
  const options = typeof optionsOrRandom === "function" ? {} : optionsOrRandom;
  if (typeof optionsOrRandom === "function") random = optionsOrRandom;
  const mode = options.mode ?? "learning";
  const progress = options.progress ?? emptyProgress();
  let pool = signs.filter(
    (sign) =>
      mode === "exam" ||
      !options.categories ||
      options.categories.includes(sign.category),
  );
  if (mode === "mistakes")
    pool = pool.filter((sign) => isProblem(progress.signs[sign.id]));
  if (mode === "review")
    pool = pool.filter((s) => isDue(progress.signs[s.id], now));
  if (options.eligibleIds)
    pool = pool.filter((s) => options.eligibleIds!.includes(s.id));
  pool = pool.filter((s) =>
    (s.images ?? [s.image]).some(
      (img) => !options.blockedImages?.includes(img),
    ),
  );
  const eligibleIds = pool.map((s) => s.id);
  const count =
    options.count ??
    (mode === "exam" ? 20 : Math.min(QUESTION_COUNT, pool.length));
  if (pool.length < count || count === 0) throw new Error("No eligible signs");
  const selected: RoadSign[] = [];
  if (mode === "exam") selected.push(...shuffle(pool, random).slice(0, count));
  else {
    const due = pool
      .filter((s) => isDue(progress.signs[s.id], now))
      .sort(
        (a, b) =>
          progress.signs[a.id].nextReviewAt - progress.signs[b.id].nextReviewAt,
      );
    if (mode === "learning" || mode === "review")
      selected.push(...due.slice(0, count));
    pool = pool.filter((s) => !selected.includes(s));
    while (selected.length < count) {
      const weight = (sign: RoadSign) =>
        isProblem(progress.signs[sign.id]) ? 4 : 1;
      let cursor =
        random() * pool.reduce((total, sign) => total + weight(sign), 0);
      let index = pool.length - 1;
      for (let i = 0; i < pool.length; i++) {
        cursor -= weight(pool[i]);
        if (cursor < 0) {
          index = i;
          break;
        }
      }
      selected.push(pool.splice(index, 1)[0]);
    }
  }
  const questions = selected.map((sign) =>
    makeQuestion(
      sign,
      mode === "exam" ? "name" : (options.format ?? "name"),
      progress,
      random,
      options.blockedImages ?? [],
    ),
  );
  return {
    sessionId:
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : Array.from(crypto.getRandomValues(new Uint32Array(4)), (n) =>
            n.toString(16).padStart(8, "0"),
          ).join(""),
    mode,
    selectedCategories: options.categories ?? [
      ...new Set(signs.map((s) => s.category)),
    ],
    questions,
    outcomes: questions.map(() => ({ status: "pending" })),
    targetCount: count,
    eligibleIds,
    blockedImages: options.blockedImages ?? [],
    progressSnapshot: progress,
    createdAt: now,
    index: 0,
    finished: false,
  };
}

export function requiredImages(q: Question): string[] {
  return q.format === "image" ? Object.values(q.optionImages) : [q.image];
}
class QuestionUnavailable extends Error {
  constructor(public signId: string) {
    super("No usable question");
  }
}
export function makeQuestion(
  sign: RoadSign,
  format: QuestionFormat,
  progress: Progress,
  random: () => number,
  blocked: string[],
): Question {
  try {
    const optionIds = generateOptions(sign, progress, random, new Set(blocked));
    const pick = (s: RoadSign) => {
      const images = (s.images ?? [s.image]).filter(
        (img) => !blocked.includes(img),
      );
      if (!images.length) throw Error("No usable image");
      return images[Math.floor(random() * images.length)];
    };
    const image = pick(sign);
    return {
      signId: sign.id,
      image,
      optionIds,
      optionImages: Object.fromEntries(
        optionIds.map((id) => [id, id === sign.id ? image : pick(getSign(id))]),
      ),
      format,
      revealed: false,
    };
  } catch {
    throw new QuestionUnavailable(sign.id);
  }
}
export const answersOf = (s: QuizState) =>
  s.outcomes.map((o) => (o.status === "answered" ? o.optionId : null));
export const timesOf = (s: QuizState) =>
  s.outcomes.map((o) => (o.status === "answered" ? o.answeredAt : null));
export const answeredCount = (s: QuizState) =>
  s.outcomes.filter((o) => o.status === "answered").length;
export const skippedCount = (s: QuizState) =>
  s.outcomes.filter((o) => o.status === "skipped").length;
function advance(state: QuizState, random: () => number): QuizState {
  let s = {
    ...state,
    questions: [...state.questions],
    outcomes: [...state.outcomes],
    eligibleIds: [...state.eligibleIds],
  };
  let index = s.index + 1;
  while (true) {
    if (index < s.questions.length) {
      const q = s.questions[index];
      if (requiredImages(q).some((img) => s.blockedImages.includes(img))) {
        try {
          s.questions[index] = makeQuestion(
            getSign(q.signId),
            q.format,
            s.progressSnapshot,
            random,
            s.blockedImages,
          );
        } catch {
          s.outcomes[index] = { status: "skipped", reason: "image-error" };
          index++;
          continue;
        }
      }
      return { ...s, index };
    }
    const used = new Set(s.questions.map((q) => q.signId));
    const remaining = s.eligibleIds.filter((id) => !used.has(id));
    if (!remaining.length) return { ...s, finished: true };
    try {
      const replacement = createQuiz(
        {
          mode: s.mode,
          format: s.questions[0].format,
          categories: s.selectedCategories,
          progress: s.progressSnapshot,
          eligibleIds: remaining,
          count: 1,
          blockedImages: s.blockedImages,
        },
        random,
        s.createdAt,
      ).questions[0];
      s.questions.push(replacement);
      s.outcomes.push({ status: "pending" });
      return { ...s, index };
    } catch (error) {
      if (error instanceof QuestionUnavailable) {
        s.eligibleIds = s.eligibleIds.filter((id) => id !== error.signId);
        continue;
      }
      return { ...s, finished: true };
    }
  }
}
export function quizReducer(state: QuizState, action: QuizAction): QuizState {
  if (state.finished) return state;
  const q = state.questions[state.index],
    outcome = state.outcomes[state.index];
  if (action.type === "reveal")
    return {
      ...state,
      questions: state.questions.map((q, i) =>
        i === state.index ? { ...q, revealed: true } : q,
      ),
    };
  if (action.type === "skip") {
    if (outcome.status !== "pending") return state;
    const failed = action.failedImages.filter((img) =>
      requiredImages(q).includes(img),
    );
    if (!failed.length) return state;
    const next = {
      ...state,
      blockedImages: [...new Set([...state.blockedImages, ...failed])],
      outcomes: state.outcomes.map(
        (o, i): QuestionOutcome =>
          i === state.index ? { status: "skipped", reason: "image-error" } : o,
      ),
    };
    return advance(next, action.random ?? Math.random);
  }
  if (action.type === "answer") {
    if (
      outcome.status !== "pending" ||
      (q.format === "recall" && !q.revealed) ||
      !q.optionIds.includes(action.optionId)
    )
      return state;
    return {
      ...state,
      outcomes: state.outcomes.map(
        (o, i): QuestionOutcome =>
          i === state.index
            ? {
                status: "answered",
                optionId: action.optionId,
                answeredAt: Math.trunc(action.now ?? Date.now()),
              }
            : o,
      ),
    };
  }
  if (outcome.status !== "answered") return state;
  return answeredCount(state) >= state.targetCount
    ? { ...state, finished: true }
    : advance(state, Math.random);
}
export function getScore(state: QuizState): number {
  return state.outcomes.reduce(
    (score, o, i) =>
      score +
      Number(
        o.status === "answered" && o.optionId === state.questions[i].signId,
      ),
    0,
  );
}
export function getSign(id: string): RoadSign {
  const sign = signsById.get(id);
  if (!sign) throw Error(`Unknown sign: ${id}`);
  return sign;
}
