import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "../../../lib/supabase";

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("documents")
      .select(
        "id, filename, mime_type, file_size, status, error_message, created_at, updated_at, document_chunks(count)",
      )
      .order("created_at", { ascending: false });

    if (error) throw error;

    const documents = (data ?? []).map((document) => ({
      ...document,
      chunk_count: document.document_chunks?.[0]?.count ?? 0,
      document_chunks: undefined,
    }));

    return NextResponse.json({ documents });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Kunde inte hämta dokumenten" },
      { status: 500 },
    );
  }
}
