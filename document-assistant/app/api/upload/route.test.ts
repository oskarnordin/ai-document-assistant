import { describe, it, expect, vi } from "vitest";
import { POST } from "./route";

vi.mock("pdf-parse/lib/pdf-parse.js", () => ({
  default: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: () => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
    }),
  }),
}));

vi.mock("ai", () => ({
  embedMany: vi.fn().mockResolvedValue({
    embeddings: [
      [0.1, 0.2, 0.3],
      [0.4, 0.5, 0.6],
    ],
  }),
}));

describe("POST /api/upload", () => {
  it("returns success when PDF is valid", async () => {
    const pdfParse = (await import("pdf-parse/lib/pdf-parse.js"))
      .default as unknown as {
      mockResolvedValue: (value: { text: string }) => unknown;
    };
    pdfParse.mockResolvedValue({
      text: "Detta är ett exempel på text i ett dokument. Den här texten är tillräckligt lång för chunking.",
    });

    const formData = new FormData();
    const file = new File(["fake pdf"], "test.pdf", {
      type: "application/pdf",
    });
    formData.append("file", file);

    const req = new Request("http://localhost/api/upload", {
      method: "POST",
      body: formData,
    });

    const res = await POST(req as Parameters<typeof POST>[0]);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
  });

  it("returns 400 when no file is sent", async () => {
    const formData = new FormData();

    const req = new Request("http://localhost/api/upload", {
      method: "POST",
      body: formData,
    });

    const res = await POST(req as Parameters<typeof POST>[0]);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBeDefined();
  });

  it("returns 400 when extracted text is empty", async () => {
    const pdfParse = (await import("pdf-parse/lib/pdf-parse.js"))
      .default as unknown as {
      mockResolvedValue: (value: { text: string }) => unknown;
    };
    pdfParse.mockResolvedValue({ text: "" });

    const formData = new FormData();
    const file = new File(["fake pdf"], "empty.pdf", {
      type: "application/pdf",
    });
    formData.append("file", file);

    const req = new Request("http://localhost/api/upload", {
      method: "POST",
      body: formData,
    });

    const res = await POST(req as Parameters<typeof POST>[0]);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBeDefined();
  });
});
