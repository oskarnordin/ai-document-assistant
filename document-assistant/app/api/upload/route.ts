import { NextRequest, NextResponse } from "next/server";
import { embedMany } from "ai";
import { openai } from "@ai-sdk/openai";
import { createClient } from "@supabase/supabase-js";

import pdfParse from "pdf-parse/lib/pdf-parse.js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function chunkText(text: string, chunkSize = 1000, overlap = 200): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = start + chunkSize;
    chunks.push(text.slice(start, end));
    start += chunkSize - overlap;
  }

  return chunks;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Ingen fil skickades" },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Byt ut new pdfParse(...) mot direkt anrop
    const pdfData = await pdfParse(buffer);
    const fullText = pdfData.text;

    if (!fullText || fullText.trim().length === 0) {
      return NextResponse.json(
        { error: "Kunde inte extrahera någon text från PDF:en" },
        { status: 400 },
      );
    }

    const chunks = chunkText(fullText);

    const { embeddings } = await embedMany({
      model: openai.embedding("text-embedding-3-small"),
      values: chunks,
    });

    const rowsToInsert = chunks.map((content, index) => ({
      content,
      embedding: embeddings[index],
    }));

    const { error: dbError } = await supabase
      .from("document_chunks")
      .insert(rowsToInsert);

    if (dbError) throw dbError;

    return NextResponse.json({
      success: true,
      message: `PDF indexerad framgångsrikt. ${chunks.length} textsegment skapades.`,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Något gick fel vid bearbetningen av filen" },
      { status: 500 },
    );
  }
}
