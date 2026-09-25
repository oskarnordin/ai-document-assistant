import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const mocks = vi.hoisted(() => ({
  embed: vi.fn(),
  streamText: vi.fn(),
  convertToCoreMessages: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  single: vi.fn(),
  rpc: vi.fn(),
  toDataStreamResponse: vi.fn(),
}));

vi.mock("ai", () => ({
  embed: mocks.embed,
  streamText: mocks.streamText,
  convertToCoreMessages: mocks.convertToCoreMessages,
  tool: vi.fn((config) => config),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: mocks.from,
    rpc: mocks.rpc,
  }),
}));

function createRequest(messages: unknown[]) {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      messages,
      documentId: "11111111-1111-4111-8111-111111111111",
    }),
  });
}

describe("POST /api/chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.embed.mockResolvedValue({ embedding: [0.1, 0.2] });
    mocks.rpc.mockResolvedValue({
      data: [{ content: "Dokumentets innehåll." }],
      error: null,
    });
    mocks.single.mockResolvedValue({ data: { status: "ready" }, error: null });
    mocks.eq.mockReturnValue({ single: mocks.single });
    mocks.select.mockReturnValue({ eq: mocks.eq });
    mocks.from.mockReturnValue({ select: mocks.select });
    mocks.convertToCoreMessages.mockResolvedValue([
      { role: "user", content: "Fråga" },
    ]);
    mocks.toDataStreamResponse.mockReturnValue(
      new Response("stream", { status: 200 }),
    );
    mocks.streamText.mockReturnValue({
      toDataStreamResponse: mocks.toDataStreamResponse,
    });
  });

  it("returns 400 when no messages are sent", async () => {
    const res = await POST(createRequest([]));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Inga meddelanden skickades");
    expect(mocks.embed).not.toHaveBeenCalled();
  });

  it("returns 400 when no document is selected", async () => {
    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: "Fråga" }] }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe(
      "Välj ett giltigt dokument innan du ställer en fråga",
    );
    expect(mocks.embed).not.toHaveBeenCalled();
  });

  it("embeds the last string message and streams with retrieved context", async () => {
    const messages = [{ role: "user", content: "Vad står i dokumentet?" }];

    const res = await POST(createRequest(messages));

    expect(res.status).toBe(200);
    expect(await res.text()).toBe("stream");
    expect(mocks.embed).toHaveBeenCalledWith(
      expect.objectContaining({ value: "Vad står i dokumentet?" }),
    );
    expect(mocks.rpc).toHaveBeenCalledWith("match_chunks", {
      query_embedding: [0.1, 0.2],
      match_threshold: 0.3,
      match_count: 4,
      filter_document_id: "11111111-1111-4111-8111-111111111111",
    });
    expect(mocks.from).toHaveBeenCalledWith("documents");
    expect(mocks.convertToCoreMessages).toHaveBeenCalledWith(messages);
    expect(mocks.streamText).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [{ role: "user", content: "Fråga" }],
        system: expect.stringContaining("Dokumentets innehåll."),
      }),
    );
    expect(mocks.toDataStreamResponse).toHaveBeenCalledTimes(1);
  });

  it("returns 409 when the selected document is not ready", async () => {
    mocks.single.mockResolvedValue({
      data: { status: "processing" },
      error: null,
    });

    const res = await POST(createRequest([{ role: "user", content: "Fråga" }]));
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.error).toBe("Dokumentet är inte redo för frågor ännu");
    expect(mocks.embed).not.toHaveBeenCalled();
  });

  it("extracts text from parts in the last message", async () => {
    const messages = [
      {
        role: "user",
        parts: [
          { type: "text", text: "Första delen" },
          { type: "image", image: "ignored" },
          { type: "text", text: " andra delen" },
        ],
      },
    ];

    await POST(createRequest(messages));

    expect(mocks.embed).toHaveBeenCalledWith(
      expect.objectContaining({ value: "Första delen andra delen" }),
    );
  });

  it("uses an empty context when retrieval returns no chunks", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: null });

    const res = await POST(createRequest([{ role: "user", content: "Fråga" }]));

    expect(res.status).toBe(200);
    expect(mocks.streamText).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.not.stringContaining("Dokumentets innehåll."),
      }),
    );
  });

  it.each([
    [
      "embedding",
      () => mocks.embed.mockRejectedValue(new Error("embed failed")),
    ],
    [
      "retrieval",
      () =>
        mocks.rpc.mockResolvedValue({
          data: null,
          error: new Error("rpc failed"),
        }),
    ],
    [
      "streaming",
      () =>
        mocks.streamText.mockImplementation(() => {
          throw new Error("stream failed");
        }),
    ],
  ])("returns 500 when %s fails", async (_name, configureFailure) => {
    configureFailure();

    const res = await POST(createRequest([{ role: "user", content: "Fråga" }]));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("Något gick fel vid bearbetningen av frågan");
  });
});
