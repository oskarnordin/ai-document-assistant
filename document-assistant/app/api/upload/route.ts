import { NextRequest, NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import { embedMany } from "ai";
import { openai } from "@ai-sdk/openai";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function splitTextIntoChunks(
  text: string,
  chunkSize = 500,
  chunkOverlap = 50,
): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = start + chunkSize;
    const chunk = text.slice(start, end);
    chunks.push(chunk);
    start += chunkSize - chunkOverlap;
  }

  return chunks;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "Ingen fil skickades" },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parser = new PDFParse({ data: buffer });
    const pdfData = await parser.getText();
    await parser.destroy();
    const fullText = pdfData.text;

    const textChunks = splitTextIntoChunks(fullText);

    const { embeddings } = await embedMany({
      model: openai.embedding("text-embedding-3-small"),
      values: textChunks,
    });

    const rowsToInsert = textChunks.map((chunk, index) => ({
      content: chunk,
      embedding: embeddings[index],
    }));

    const { error } = await supabase
      .from("document_chunks")
      .insert(rowsToInsert);

    if (error) throw error;

    return NextResponse.json({ success: true, count: textChunks.length });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Något gick fel vid bearbetningen" },
      { status: 500 },
    );
  }
}
