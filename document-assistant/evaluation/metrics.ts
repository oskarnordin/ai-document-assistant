export interface RetrievedChunk {
  id: string;
  content: string;
  similarity?: number;
}

export interface RetrievalMetrics {
  hitAtK: number;
  recallAtK: number;
  reciprocalRank: number;
  emptyResult: boolean;
  falsePositive: boolean;
}

export interface AnswerMetrics {
  groundedness: number;
  factCorrectness: number;
  refusal: number;
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function evaluateRetrieval(
  expectedChunkIds: string[],
  retrievedChunks: RetrievedChunk[],
  k: number,
): RetrievalMetrics {
  const topChunks = retrievedChunks.slice(0, k);
  const expected = new Set(expectedChunkIds);
  const matches = topChunks.filter((chunk) => expected.has(chunk.id));
  const firstMatchIndex = topChunks.findIndex((chunk) => expected.has(chunk.id));

  return {
    hitAtK: matches.length > 0 ? 1 : 0,
    recallAtK: expected.size === 0 ? 0 : matches.length / expected.size,
    reciprocalRank: firstMatchIndex === -1 ? 0 : 1 / (firstMatchIndex + 1),
    emptyResult: retrievedChunks.length === 0,
    falsePositive: expected.size === 0 && retrievedChunks.length > 0,
  };
}

export function evaluateAnswer(
  answer: string,
  expectedFacts: string[],
  evidence: string,
  unanswerable: boolean,
): AnswerMetrics {
  const normalizedAnswer = normalize(answer);
  const normalizedEvidence = normalize(evidence);
  const matchedFacts = expectedFacts.filter((fact) =>
    normalizedAnswer.includes(normalize(fact)),
  );
  const groundedFacts = matchedFacts.filter((fact) =>
    normalizedEvidence.includes(normalize(fact)),
  );
  const refusalPhrases = [
    "information is not available",
    "not in the document",
    "cannot find",
    "saknas i dokumentet",
  ];

  return {
    groundedness:
      matchedFacts.length === 0
        ? unanswerable && refusalPhrases.some((phrase) => normalizedAnswer.includes(phrase))
          ? 1
          : 0
        : groundedFacts.length / matchedFacts.length,
    factCorrectness:
      expectedFacts.length === 0 ? 1 : matchedFacts.length / expectedFacts.length,
    refusal:
      unanswerable && refusalPhrases.some((phrase) => normalizedAnswer.includes(phrase))
        ? 1
        : 0,
  };
}