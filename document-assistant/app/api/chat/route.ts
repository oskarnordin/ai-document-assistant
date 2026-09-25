import { streamText, embed, convertToCoreMessages, tool } from "ai";
import { openai } from "@ai-sdk/openai";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ragConfig } from "../../../lib/rag-config";
import { buildRagSystemPrompt } from "../../../lib/rag-prompt";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function isValidDocumentId(documentId: unknown): documentId is string {
  return (
    typeof documentId === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      documentId,
    )
  );
}

export async function POST(req: Request) {
  try {
    const { messages, documentId } = await req.json();

    if (!messages?.length) {
      return NextResponse.json(
        { error: "Inga meddelanden skickades" },
        { status: 400 },
      );
    }

    if (!isValidDocumentId(documentId)) {
      return NextResponse.json(
        { error: "Välj ett giltigt dokument innan du ställer en fråga" },
        { status: 400 },
      );
    }

    const { data: document, error: documentError } = await supabase
      .from("documents")
      .select("status")
      .eq("id", documentId)
      .single();

    if (documentError) throw documentError;
    if (!document) {
      return NextResponse.json(
        { error: "Dokumentet kunde inte hittas" },
        { status: 404 },
      );
    }
    if (document.status !== "ready") {
      return NextResponse.json(
        { error: "Dokumentet är inte redo för frågor ännu" },
        { status: 409 },
      );
    }

    const lastMessage = messages[messages.length - 1];

    const lastUserMessage =
      typeof lastMessage.content === "string"
        ? lastMessage.content
        : lastMessage.parts
            ?.filter((part: { type: string }) => part.type === "text")
            .map((part: { text: string }) => part.text)
            .join("") || "";

    const { embedding } = await embed({
      model: openai.embedding(ragConfig.embeddingModel),
      value: lastUserMessage,
    });

    const { data: matchedChunks, error: rpcError } = await supabase.rpc(
      "match_chunks",
      {
        query_embedding: embedding,
        match_threshold: ragConfig.retrieval.matchThreshold,
        match_count: ragConfig.retrieval.matchCount,
        filter_document_id: documentId,
      },
    );

    if (rpcError) throw rpcError;

    const context = matchedChunks
      ? matchedChunks.map((c: { content: string }) => c.content).join("\n---\n")
      : "";

    const result = streamText({
      model: openai(ragConfig.chatModel),
      system: buildRagSystemPrompt(context, ragConfig.promptVariant),
      messages: await convertToCoreMessages(messages),
      tools: {
        getSummaryCard: tool({
          description:
            "Används när användaren ber om en sammanfattning eller nyckeltal för dokumentet.",
          parameters: z.object({
            title: z.string().describe("Titel för sammanfattningen"),
            bulletPoints: z
              .array(z.string())
              .describe("3 korta huvudsakliga punkter"),
          }),
          execute: async ({ title, bulletPoints }) => {
            return { title, bulletPoints, status: "generated" };
          },
        }),
      },
    });

    return result.toDataStreamResponse();
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Något gick fel vid bearbetningen av frågan" },
      { status: 500 },
    );
  }
}
