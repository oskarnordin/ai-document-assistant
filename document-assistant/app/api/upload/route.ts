import { NextResponse } from "next/server";
import { embedMany } from "ai";
import { openai } from "@ai-sdk/openai";

import pdfParse from "pdf-parse/lib/pdf-parse.js";
import { chunkText } from "../../../lib/chunking";
import { ragConfig } from "../../../lib/rag-config";
import { createServerSupabaseClient } from "../../../lib/supabase";

export const runtime = "nodejs";
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(req: Request) {
  let documentId: string | null = null;
  let supabase: ReturnType<typeof createServerSupabaseClient> | null = null;

  try {
    supabase = createServerSupabaseClient();
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Ingen fil skickades" },
        { status: 400 },
      );
    }

    if (
      file.type !== "application/pdf" ||
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      return NextResponse.json(
        { error: "Filen måste vara en PDF" },
        { status: 400 },
      );
    }

    if (file.size === 0) {
      return NextResponse.json({ error: "PDF-filen är tom" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "PDF-filen får vara högst 10 MB" },
        { status: 413 },
      );
    }

    const { data: document, error: documentError } = await supabase
      .from("documents")
      .insert({
        filename: file.name,
        mime_type: file.type,
        file_size: file.size,
        status: "processing",
        rag_config_version: ragConfig.version,
        chunk_max_size: ragConfig.chunking.maxChunkSize,
        chunk_overlap: ragConfig.chunking.overlap,
        embedding_model: ragConfig.embeddingModel,
      })
      .select("id")
      .single();

    if (documentError || !document?.id) {
      throw documentError ?? new Error("Kunde inte skapa dokumentet");
    }

    documentId = document.id;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Byt ut new pdfParse(...) mot direkt anrop
    const pdfData = await pdfParse(buffer);
    const fullText = pdfData.text;

    if (!fullText || fullText.trim().length === 0) {
      await supabase
        .from("documents")
        .update({
          status: "failed",
          error_message: "PDF:en innehåller ingen maskinläsbar text",
        })
        .eq("id", documentId);

      return NextResponse.json(
        { error: "PDF:en innehåller ingen maskinläsbar text" },
        { status: 422 },
      );
    }

    const chunks = chunkText(fullText, ragConfig.chunking);

    const { embeddings } = await embedMany({
      model: openai.embedding(ragConfig.embeddingModel),
      values: chunks,
    });

    if (embeddings.length !== chunks.length) {
      throw new Error("Antalet embeddings matchar inte antalet textsegment");
    }

    const rowsToInsert = chunks.map((content, index) => ({
      document_id: documentId,
      chunk_index: index,
      content,
      embedding: embeddings[index],
    }));

    const { error: dbError } = await supabase
      .from("document_chunks")
      .insert(rowsToInsert);

    if (dbError) throw dbError;

    const { error: statusError } = await supabase
      .from("documents")
      .update({ status: "ready", error_message: null })
      .eq("id", documentId);

    if (statusError) throw statusError;

    return NextResponse.json({
      success: true,
      documentId,
      message: `PDF indexerad framgångsrikt. ${chunks.length} textsegment skapades.`,
    });
  } catch (err) {
    console.error(err);

    if (documentId && supabase) {
      await supabase
        .from("document_chunks")
        .delete()
        .eq("document_id", documentId);
      await supabase
        .from("documents")
        .update({
          status: "failed",
          error_message: "Indexeringen misslyckades",
        })
        .eq("id", documentId);
    }

    return NextResponse.json(
      { error: "Något gick fel vid bearbetningen av filen" },
      { status: 500 },
    );
  }
}
