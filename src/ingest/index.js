import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
import pdfParse from "pdf-parse";
import OpenAI from "openai";

const s3 = new S3Client({});
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 50;
const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_BATCH_SIZE = 100;
const INSERT_BATCH_SIZE = 500;

function chunkText(text) {
  const chunks = [];
  const step = CHUNK_SIZE - CHUNK_OVERLAP;

  for (let start = 0; start < text.length; start += step) {
    const chunk = text.slice(start, start + CHUNK_SIZE).trim();
    if (chunk) chunks.push(chunk);
  }

  return chunks;
}

async function processPdf(record) {
  const bucket = record.s3.bucket.name;
  const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));
  const filename = key.split("/").pop() || key;
  const { Body } = await s3.send(
    new GetObjectCommand({ Bucket: bucket, Key: key }),
  );

  if (!Body) {
    throw new Error(`S3 returned an empty body for s3://${bucket}/${key}`);
  }

  const pdfBuffer = Buffer.from(await Body.transformToByteArray());
  const pdf = await pdfParse(pdfBuffer);
  const chunks = chunkText(pdf.text);

  if (chunks.length === 0) {
    throw new Error(`PDF contains no extractable text: s3://${bucket}/${key}`);
  }

  const { data: document, error: documentError } = await supabase
    .from("documents")
    .insert({
      filename,
      mime_type: "application/pdf",
      file_size: pdfBuffer.length,
      status: "processing",
      chunk_max_size: CHUNK_SIZE,
      chunk_overlap: CHUNK_OVERLAP,
      embedding_model: EMBEDDING_MODEL,
    })
    .select("id")
    .single();

  if (documentError) throw documentError;

  try {
    const embeddings = [];
    for (let offset = 0; offset < chunks.length; offset += EMBEDDING_BATCH_SIZE) {
      const batch = chunks.slice(offset, offset + EMBEDDING_BATCH_SIZE);
      const embeddingData = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: batch,
      });
      if (embeddingData.data.length !== batch.length) {
        throw new Error("Embedding count does not match the number of chunks");
      }
      embeddings.push(...embeddingData.data.map(({ embedding }) => embedding));
    }

    const rows = chunks.map((content, index) => ({
      document_id: document.id,
      chunk_index: index,
      content,
      embedding: embeddings[index],
      metadata: {
        bucket,
        key,
        filename,
        chunk_index: index,
        embedding_model: EMBEDDING_MODEL,
      },
    }));
    for (let offset = 0; offset < rows.length; offset += INSERT_BATCH_SIZE) {
      const { error: insertError } = await supabase
        .from("document_chunks")
        .insert(rows.slice(offset, offset + INSERT_BATCH_SIZE));
      if (insertError) throw insertError;
    }

    const { error: statusError } = await supabase
      .from("documents")
      .update({ status: "ready", error_message: null })
      .eq("id", document.id);
    if (statusError) throw statusError;

    console.info(`Indexed ${chunks.length} chunks from s3://${bucket}/${key}`);
  } catch (error) {
    const { error: statusError } = await supabase
      .from("documents")
      .update({
        status: "failed",
        error_message: error instanceof Error ? error.message : String(error),
      })
      .eq("id", document.id);
    if (statusError) {
      console.error("Failed to mark document as failed:", statusError);
    }
    throw error;
  }
}

export async function handler(event) {
  for (const record of event.Records ?? []) {
    await processPdf(record);
  }
}
