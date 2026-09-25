import type { AnswerMetrics, RetrievalMetrics } from "./metrics";

export interface EvaluationConfiguration {
  id: string;
  chunkSize: number;
  overlap: number;
  matchThreshold: number;
  matchCount: number;
  promptVariant: "baseline" | "strict-grounding";
}

export interface EvaluationResult {
  configurationId: string;
  retrieval: RetrievalMetrics;
  answer: AnswerMetrics;
}

export interface EvaluationSummary {
  configurationId: string;
  averageHitAtK: number;
  averageRecallAtK: number;
  averageReciprocalRank: number;
  averageGroundedness: number;
  averageFactCorrectness: number;
  refusalRate: number;
  emptyResultRate: number;
  falsePositiveRate: number;
}

export const evaluationConfigurations: EvaluationConfiguration[] = [
  {
    id: "baseline-v1",
    chunkSize: 500,
    overlap: 50,
    matchThreshold: 0.3,
    matchCount: 4,
    promptVariant: "baseline",
  },
  {
    id: "strict-grounding-v1",
    chunkSize: 500,
    overlap: 50,
    matchThreshold: 0.3,
    matchCount: 4,
    promptVariant: "strict-grounding",
  },
  {
    id: "focused-retrieval-v1",
    chunkSize: 400,
    overlap: 80,
    matchThreshold: 0.5,
    matchCount: 3,
    promptVariant: "strict-grounding",
  },
];

function average(values: number[]): number {
  return values.length === 0
    ? 0
    : values.reduce((total, value) => total + value, 0) / values.length;
}

export function summarizeEvaluation(
  results: EvaluationResult[],
): EvaluationSummary[] {
  const grouped = new Map<string, EvaluationResult[]>();

  for (const result of results) {
    const current = grouped.get(result.configurationId) ?? [];
    current.push(result);
    grouped.set(result.configurationId, current);
  }

  return [...grouped.entries()].map(
    ([configurationId, configurationResults]) => ({
      configurationId,
      averageHitAtK: average(
        configurationResults.map(({ retrieval }) => retrieval.hitAtK),
      ),
      averageRecallAtK: average(
        configurationResults.map(({ retrieval }) => retrieval.recallAtK),
      ),
      averageReciprocalRank: average(
        configurationResults.map(({ retrieval }) => retrieval.reciprocalRank),
      ),
      averageGroundedness: average(
        configurationResults.map(({ answer }) => answer.groundedness),
      ),
      averageFactCorrectness: average(
        configurationResults.map(({ answer }) => answer.factCorrectness),
      ),
      refusalRate: average(
        configurationResults.map(({ answer }) => answer.refusal),
      ),
      emptyResultRate: average(
        configurationResults.map(({ retrieval }) =>
          retrieval.emptyResult ? 1 : 0,
        ),
      ),
      falsePositiveRate: average(
        configurationResults.map(({ retrieval }) =>
          retrieval.falsePositive ? 1 : 0,
        ),
      ),
    }),
  );
}
