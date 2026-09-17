import { describe, it, expect } from "vitest";
import { chunkText } from "./lib/chunking";

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
});
