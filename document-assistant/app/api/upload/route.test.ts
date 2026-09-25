import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const mocks = vi.hoisted(() => ({
  pdfParse: vi.fn(),
  embedMany: vi.fn(),
  insert: vi.fn(),
  from: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  select: vi.fn(),
  single: vi.fn(),
  eq: vi.fn(),
  getAuthenticatedUser: vi.fn(),
}));

vi.mock("pdf-parse/lib/pdf-parse.js", () => ({
  default: mocks.pdfParse,
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: mocks.from,
  }),
}));

vi.mock("../../../lib/supabase", async () => {
  const actual = await vi.importActual<typeof import("../../../lib/supabase")>(
    "../../../lib/supabase",
  );
  return { ...actual, getAuthenticatedUser: mocks.getAuthenticatedUser };
});

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
    mocks.getAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mocks.single.mockResolvedValue({ data: { id: "document-1" }, error: null });
    mocks.select.mockReturnValue({ single: mocks.single });
    mocks.eq.mockResolvedValue({ error: null });
    mocks.update.mockReturnValue({ eq: mocks.eq });
    mocks.delete.mockReturnValue({ eq: mocks.eq });
    mocks.from.mockImplementation((table: string) => {
      if (table === "documents") {
        return {
          insert: vi.fn().mockReturnValue({ select: mocks.select }),
          update: mocks.update,
        };
      }

      return { insert: mocks.insert, delete: mocks.delete };
    });
    mocks.pdfParse.mockResolvedValue({ text: "" });
    mocks.embedMany.mockResolvedValue({ embeddings: [[0.1, 0.2, 0.3]] });
    mocks.insert.mockResolvedValue({ error: null });
  });

  it("returns 401 when the request is not authenticated", async () => {
    mocks.getAuthenticatedUser.mockResolvedValue(null);

    const res = await POST(
      createRequest(
        new File(["%PDF- unauthenticated"], "test.pdf", {
          type: "application/pdf",
        }),
      ),
    );

    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("Du måste vara inloggad");
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("returns success and persists chunks when PDF is valid", async () => {
    const pdfText = "Detta är text från PDF-filen.";
    const file = new File(["%PDF- test pdf bytes"], "test.pdf", {
      type: "application/pdf",
    });
    mocks.pdfParse.mockResolvedValue({ text: pdfText });

    const res = await POST(createRequest(file));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({
      success: true,
      documentId: "document-1",
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
      {
        document_id: "document-1",
        chunk_index: 0,
        content: pdfText,
        embedding: [0.1, 0.2, 0.3],
      },
    ]);
    expect(mocks.update).toHaveBeenCalledWith({
      status: "ready",
      error_message: null,
    });
  });

  it("uses the shared chunking rules for multiple chunks", async () => {
    const words = Array.from({ length: 101 }, (_, index) => `ord${index}`);
    const pdfText = words.join(" ");
    mocks.pdfParse.mockResolvedValue({ text: pdfText });
    mocks.embedMany.mockImplementation(
      async ({ values }: { values: string[] }) => ({
        embeddings: values.map((_, index) => [index / 10]),
      }),
    );

    const res = await POST(
      createRequest(
        new File(["%PDF- many chunks"], "many-chunks.pdf", {
          type: "application/pdf",
        }),
      ),
    );

    expect(res.status).toBe(200);
    const values = mocks.embedMany.mock.calls[0][0].values as string[];
    const embeddings = values.map((_, index) => [index / 10]);
    expect(values.length).toBeGreaterThan(1);
    expect(values[0]).toContain("ord0");
    expect(mocks.insert).toHaveBeenCalledWith(
      values.map((content, index) => ({
        document_id: "document-1",
        chunk_index: index,
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

  it.each([
    [
      "wrong MIME type",
      new File(["text"], "notes.txt", { type: "text/plain" }),
      400,
      "Filen måste vara en PDF",
    ],
    [
      "wrong extension",
      new File(["pdf"], "notes.txt", { type: "application/pdf" }),
      400,
      "Filen måste vara en PDF",
    ],
    [
      "empty file",
      new File([], "empty.pdf", { type: "application/pdf" }),
      400,
      "PDF-filen är tom",
    ],
  ])("rejects %s before indexing", async (_case, file, status, error) => {
    const res = await POST(createRequest(file));
    const json = await res.json();

    expect(res.status).toBe(status);
    expect(json.error).toBe(error);
    expect(mocks.pdfParse).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("rejects files larger than 10 MB before creating a document", async () => {
    const oversizedFile = new File(
      [new Uint8Array(10 * 1024 * 1024 + 1)],
      "large.pdf",
      { type: "application/pdf" },
    );

    const res = await POST(createRequest(oversizedFile));
    const json = await res.json();

    expect(res.status).toBe(413);
    expect(json.error).toBe("PDF-filen får vara högst 10 MB");
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("rejects a file with a PDF extension but invalid file signature", async () => {
    const res = await POST(
      createRequest(
        new File(["not really a PDF"], "fake.pdf", {
          type: "application/pdf",
        }),
      ),
    );
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Filen verkar inte vara en giltig PDF");
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.pdfParse).not.toHaveBeenCalled();
  });

  it("returns 400 when extracted text is empty", async () => {
    mocks.pdfParse.mockResolvedValue({ text: " \n\t" });

    const res = await POST(
      createRequest(
        new File(["%PDF- empty pdf"], "empty.pdf", { type: "application/pdf" }),
      ),
    );
    const json = await res.json();

    expect(res.status).toBe(422);
    expect(json.error).toBe("PDF:en innehåller ingen maskinläsbar text");
    expect(mocks.embedMany).not.toHaveBeenCalled();
    expect(mocks.update).toHaveBeenCalledWith({
      status: "failed",
      error_message: "PDF:en innehåller ingen maskinläsbar text",
    });
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
          new File(["%PDF- failure pdf"], "failure.pdf", {
            type: "application/pdf",
          }),
        ),
      );
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error).toBe("Något gick fel vid bearbetningen av filen");
    },
  );
});
