import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  order: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ from: mocks.from }),
}));

describe("GET /api/documents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.order.mockResolvedValue({
      data: [
        {
          id: "document-1",
          filename: "guide.pdf",
          status: "ready",
          document_chunks: [{ count: 3 }],
        },
      ],
      error: null,
    });
    mocks.select.mockReturnValue({ order: mocks.order });
    mocks.from.mockReturnValue({ select: mocks.select });
  });

  it("returns documents with chunk counts", async () => {
    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.documents).toEqual([
      {
        id: "document-1",
        filename: "guide.pdf",
        status: "ready",
        chunk_count: 3,
      },
    ]);
    expect(mocks.from).toHaveBeenCalledWith("documents");
    expect(mocks.select).toHaveBeenCalledWith(
      expect.stringContaining("document_chunks(count)"),
    );
  });

  it("returns 500 when Supabase fails", async () => {
    mocks.order.mockResolvedValue({
      data: null,
      error: new Error("db failed"),
    });

    const res = await GET();
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("Kunde inte hämta dokumenten");
  });
});
