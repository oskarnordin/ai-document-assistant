import { describe, it, expect } from "vitest";
import { chunkText } from "./lib/chunking";
import { ragConfig } from "./lib/rag-config";

describe("chunkText utility", () => {
  it("ska returnera en tom array om texten är tom", () => {
    expect(chunkText("")).toEqual([]);
    expect(chunkText("   ")).toEqual([]);
  });

  it("ska inte kapa ord på mitten", () => {
    const text = "JavaScript är ett kraftfullt språk";
    // maxChunkSize 14 gör att "JavaScript är" (14 tecken) får plats, men inte "ett"
    const result = chunkText(text, { maxChunkSize: 14, overlap: 0 });

    expect(result).toEqual(["JavaScript är", "ett kraftfullt", "språk"]);
  });

  it("ska skapa överlappning mellan chunks", () => {
    const text = "En två tre fyra fem sex sju";
    // maxChunkSize 10 täcker "En två tre" (10 tecken)
    // overlap 3 täcker ordet "tre" (3 tecken)
    const result = chunkText(text, { maxChunkSize: 10, overlap: 3 });

    expect(result[0]).toBe("En två tre");
    expect(result[1]).toContain("tre");
  });

  it("ska normalisera whitespace före chunking", () => {
    expect(
      chunkText("  ett\n\n två\t tre  ", { maxChunkSize: 20, overlap: 0 }),
    ).toEqual(["ett två tre"]);
  });

  it("ska skapa flera chunks utan att tappa ord", () => {
    expect(
      chunkText("ett två tre fyra fem sex", { maxChunkSize: 7, overlap: 0 }),
    ).toEqual(["ett två", "tre", "fyra", "fem sex"]);
  });

  it("ska behålla ett enskilt ord som är längre än maxstorleken", () => {
    expect(chunkText("långtord här", { maxChunkSize: 4, overlap: 0 })).toEqual([
      "långtord",
      "här",
    ]);
  });

  it("ska returnera tom array för ogiltig maxstorlek", () => {
    expect(chunkText("text", { maxChunkSize: 0 })).toEqual([]);
    expect(chunkText("text", { maxChunkSize: -1 })).toEqual([]);
  });

  it("ska avvisa overlap som inte lämnar någon framdrift", () => {
    expect(() => chunkText("text", { maxChunkSize: 10, overlap: 10 })).toThrow(
      "Overlap måste vara mindre än maxChunkSize",
    );
    expect(() => chunkText("text", { maxChunkSize: 10, overlap: 11 })).toThrow(
      "Overlap måste vara mindre än maxChunkSize",
    );
  });

  it("ska exponera baseline-parametrarna för reproducerbara experiment", () => {
    expect(ragConfig).toMatchObject({
      version: "baseline-v1",
      chunking: { maxChunkSize: 500, overlap: 50 },
      embeddingModel: "text-embedding-3-small",
      retrieval: { matchThreshold: 0.3, matchCount: 4 },
      chatModel: "gpt-4o",
    });
  });
});
