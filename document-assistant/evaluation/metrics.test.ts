import { describe, expect, it } from "vitest";
import { evaluationCases, fixtureChunks } from "./fixtures";
import { evaluateAnswer, evaluateRetrieval } from "./metrics";

describe("RAG evaluation metrics", () => {
  it("measures retrieval hit, recall and rank", () => {
    const metrics = evaluateRetrieval(
      evaluationCases[0].expectedChunkIds,
      [fixtureChunks[1], fixtureChunks[0]],
      2,
    );

    expect(metrics).toEqual({
      hitAtK: 1,
      recallAtK: 1,
      reciprocalRank: 0.5,
      emptyResult: false,
      falsePositive: false,
    });
  });

  it("detects empty and false-positive retrieval", () => {
    expect(evaluateRetrieval([], [], 4).emptyResult).toBe(true);
    expect(evaluateRetrieval([], [fixtureChunks[0]], 4).falsePositive).toBe(true);
  });

  it("scores answers against evidence facts", () => {
    expect(
      evaluateAnswer(
        "The records are kept for 30 days.",
        ["30 days"],
        fixtureChunks[0].content,
        false,
      ),
    ).toEqual({ groundedness: 1, factCorrectness: 1, refusal: 0 });
  });

  it("recognizes refusal for an unanswerable question", () => {
    expect(
      evaluateAnswer(
        "That information is not available in the document.",
        [],
        "",
        true,
      ),
    ).toEqual({ groundedness: 1, factCorrectness: 1, refusal: 1 });
  });
});