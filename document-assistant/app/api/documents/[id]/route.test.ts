import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, PATCH } from "./route";

const documentId = "11111111-1111-4111-8111-111111111111";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  eq: vi.fn(),
  select: vi.fn(),
  single: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ from: mocks.from }),
}));

function params() {
  return { params: Promise.resolve({ id: documentId }) };
}

describe("/api/documents/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.single.mockResolvedValue({
      data: { id: documentId, filename: "renamed.pdf", status: "ready" },
      error: null,
    });
    mocks.select.mockReturnValue({ single: mocks.single });
    mocks.eq.mockReturnValue({ select: mocks.select });
    mocks.update.mockReturnValue({ eq: mocks.eq });
    mocks.delete.mockReturnValue({ eq: mocks.eq });
    mocks.from.mockReturnValue({
      update: mocks.update,
      delete: mocks.delete,
    });
  });

  it("renames a document without re-indexing", async () => {
    const req = new Request("http://localhost/api/documents/" + documentId, {
      method: "PATCH",
      body: JSON.stringify({ filename: "renamed.pdf" }),
    });

    const res = await PATCH(req, params());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.document.filename).toBe("renamed.pdf");
    expect(mocks.update).toHaveBeenCalledWith({ filename: "renamed.pdf" });
  });

  it("rejects an invalid document ID", async () => {
    const req = new Request("http://localhost/api/documents/not-an-id", {
      method: "PATCH",
      body: JSON.stringify({ filename: "renamed.pdf" }),
    });

    const res = await PATCH(req, {
      params: Promise.resolve({ id: "not-an-id" }),
    });

    expect(res.status).toBe(400);
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("deletes a document and relies on database cascade for chunks", async () => {
    const res = await DELETE(
      new Request("http://localhost/api/documents/" + documentId),
      params(),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ success: true, documentId });
    expect(mocks.delete).toHaveBeenCalledTimes(1);
  });
});
