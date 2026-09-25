import { NextResponse } from "next/server";
import {
  createServerSupabaseClient,
  getAuthenticatedUser,
} from "../../../../lib/supabase";

function isValidId(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id,
  );
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!isValidId(id)) {
    return NextResponse.json(
      { error: "Ogiltigt dokument-ID" },
      { status: 400 },
    );
  }

  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: "Du måste vara inloggad" },
        { status: 401 },
      );
    }

    const supabase = createServerSupabaseClient();
    const body = await req.json();
    const filename =
      typeof body.filename === "string" ? body.filename.trim() : "";

    if (!filename || filename.length > 255) {
      return NextResponse.json(
        { error: "Filnamnet måste innehålla 1-255 tecken" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("documents")
      .update({ filename })
      .eq("id", id)
      .eq("user_id", user.id)
      .select(
        "id, filename, mime_type, file_size, status, error_message, created_at, updated_at",
      )
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Dokumentet hittades inte" },
          { status: 404 },
        );
      }
      throw error;
    }

    return NextResponse.json({ document: data });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Kunde inte uppdatera dokumentet" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!isValidId(id)) {
    return NextResponse.json(
      { error: "Ogiltigt dokument-ID" },
      { status: 400 },
    );
  }

  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: "Du måste vara inloggad" },
        { status: 401 },
      );
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("documents")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id")
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Dokumentet hittades inte" },
          { status: 404 },
        );
      }
      throw error;
    }

    return NextResponse.json({ success: true, documentId: data.id });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Kunde inte ta bort dokumentet" },
      { status: 500 },
    );
  }
}
