import { describe, expect, it } from "vitest";
import { evaluationConfigurations, summarizeEvaluation } from "./experiments";

describe("RAG evaluation experiments", () => {
  it("defines comparable chunking, retrieval, and prompt configurations", () => {
    expect(evaluationConfigurations).toHaveLength(3);
    expect(
      new Set(evaluationConfigurations.map((configuration) => configuration.id))
        .size,
    ).toBe(3);
    expect(evaluationConfigurations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ promptVariant: "baseline" }),
        expect.objectContaining({ promptVariant: "strict-grounding" }),
      ]),
    );
  });

  it("aggregates results so configurations can be compared", () => {
    const summaries = summarizeEvaluation([
      {
        configurationId: "baseline-v1",
        retrieval: {
          hitAtK: 1,
          recallAtK: 1,
          reciprocalRank: 1,
          emptyResult: false,
          falsePositive: false,
        },
        answer: {
          groundedness: 1,
          factCorrectness: 0.5,
          refusal: 0,
        },
      },
      {
        configurationId: "baseline-v1",
        retrieval: {
          hitAtK: 0,
          recallAtK: 0,
          reciprocalRank: 0,
          emptyResult: true,
          falsePositive: false,
        },
        answer: {
          groundedness: 0,
          factCorrectness: 1,
          refusal: 1,
        },
      },
    ]);

    expect(summaries).toEqual([
      expect.objectContaining({
        configurationId: "baseline-v1",
        averageHitAtK: 0.5,
        averageRecallAtK: 0.5,
        averageGroundedness: 0.5,
        averageFactCorrectness: 0.75,
        refusalRate: 0.5,
        emptyResultRate: 0.5,
      }),
    ]);
  });
});
