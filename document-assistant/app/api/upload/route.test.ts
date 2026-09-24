import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const mocks = vi.hoisted(() => ({
  pdfParse: vi.fn(),
  embedMany: vi.fn(),
  insert: vi.fn(),
  from: vi.fn(),
}));

vi.mock("pdf-parse/lib/pdf-parse.js", () => ({
  default: mocks.pdfParse,
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: mocks.from,
  }),
}));

vi.mock("ai", () => ({
  embedMany: mocks.embedMany,
}));

function createRequest(file?: File) {
  const formData = new FormData();
  if (file) formData.append("file", file);

  return new Request("http://localhost/api/upload", {
    method: "POST",
    body: formData,
  });
}

describe("POST /api/upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.from.mockReturnValue({ insert: mocks.insert });
    mocks.pdfParse.mockResolvedValue({ text: "" });
    mocks.embedMany.mockResolvedValue({ embeddings: [[0.1, 0.2, 0.3]] });
    mocks.insert.mockResolvedValue({ error: null });
  });

  it("returns success and persists chunks when PDF is valid", async () => {
    const pdfText = "Detta är text från PDF-filen.";
    const file = new File(["pdf-bytes"], "test.pdf", {
      type: "application/pdf",
    });
    mocks.pdfParse.mockResolvedValue({ text: pdfText });

    const res = await POST(createRequest(file));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({
      success: true,
      message: "PDF indexerad framgångsrikt. 1 textsegment skapades.",
    });
    expect(mocks.pdfParse).toHaveBeenCalledTimes(1);
    expect(Buffer.from(await file.arrayBuffer())).toEqual(
      mocks.pdfParse.mock.calls[0][0],
    );
    expect(mocks.embedMany).toHaveBeenCalledWith(
      expect.objectContaining({ values: [pdfText] }),
    );
    expect(mocks.from).toHaveBeenCalledWith("document_chunks");
    expect(mocks.insert).toHaveBeenCalledWith([
      { content: pdfText, embedding: [0.1, 0.2, 0.3] },
    ]);
  });

  it("uses the shared chunking rules for multiple chunks", async () => {
    const words = Array.from({ length: 101 }, (_, index) => `ord${index}`);
    const pdfText = words.join(" ");
    const embeddings = [[0.1], [0.2], [0.3]];
    mocks.pdfParse.mockResolvedValue({ text: pdfText });
    mocks.embedMany.mockResolvedValue({ embeddings });

    const res = await POST(
      createRequest(
        new File(["pdf"], "many-chunks.pdf", { type: "application/pdf" }),
      ),
    );

    expect(res.status).toBe(200);
    const values = mocks.embedMany.mock.calls[0][0].values as string[];
    expect(values.length).toBeGreaterThan(1);
    expect(values[0]).toContain("ord0");
    expect(mocks.insert).toHaveBeenCalledWith(
      values.map((content, index) => ({
        content,
        embedding: embeddings[index],
      })),
    );
  });

  it("returns 400 when no file is sent", async () => {
    const res = await POST(createRequest());
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Ingen fil skickades");
    expect(mocks.pdfParse).not.toHaveBeenCalled();
  });

  it("returns 400 when extracted text is empty", async () => {
    mocks.pdfParse.mockResolvedValue({ text: " \n\t" });

    const res = await POST(
      createRequest(
        new File(["pdf"], "empty.pdf", { type: "application/pdf" }),
      ),
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Kunde inte extrahera någon text från PDF:en");
    expect(mocks.embedMany).not.toHaveBeenCalled();
  });

  it.each([
    [
      "parser",
      () => mocks.pdfParse.mockRejectedValue(new Error("parse failed")),
    ],
    [
      "embedding",
      () => mocks.embedMany.mockRejectedValue(new Error("embed failed")),
    ],
    [
      "database",
      () =>
        mocks.insert.mockResolvedValue({ error: new Error("insert failed") }),
    ],
  ])(
    "returns 500 when %s processing fails",
    async (_name, configureFailure) => {
      mocks.pdfParse.mockResolvedValue({ text: "Text som ska behandlas." });
      configureFailure();

      const res = await POST(
        createRequest(
          new File(["pdf"], "failure.pdf", { type: "application/pdf" }),
        ),
      );
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error).toBe("Något gick fel vid bearbetningen av filen");
    },
  );
});
