import type { RetrievedChunk } from "./metrics";

export interface EvaluationCase {
  id: string;
  question: string;
  expectedChunkIds: string[];
  expectedFacts: string[];
  unanswerable: boolean;
}

export const fixtureChunks: RetrievedChunk[] = [
  {
    id: "policy-1",
    content: "The retention policy keeps customer records for 30 days.",
    similarity: 0.91,
  },
  {
    id: "policy-2",
    content: "Customers can export their records from the account settings page.",
    similarity: 0.84,
  },
  {
    id: "policy-3",
    content: "The support team reviews deletion requests within two business days.",
    similarity: 0.72,
  },
];

export const evaluationCases: EvaluationCase[] = [
  {
    id: "retention-period",
    question: "How long are customer records kept?",
    expectedChunkIds: ["policy-1"],
    expectedFacts: ["30 days"],
    unanswerable: false,
  },
  {
    id: "unknown-region",
    question: "Which countries are supported?",
    expectedChunkIds: [],
    expectedFacts: [],
    unanswerable: true,
  },
];