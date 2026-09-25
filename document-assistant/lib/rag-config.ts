export const ragConfig = {
  version: "baseline-v1",
  chunking: {
    maxChunkSize: 500,
    overlap: 50,
  },
  embeddingModel: "text-embedding-3-small",
  retrieval: {
    matchThreshold: 0.3,
    matchCount: 4,
  },
  promptVariant: "baseline" as const,
  chatModel: "gpt-4o",
} as const;

export type RagConfig = typeof ragConfig;
