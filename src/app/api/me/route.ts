import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

type ProfilePayload = {
  first_name?: string;
  zip_code?: string;
  whatsapp?: string | null;
  telegram?: string | null;
  instagram?: string | null;
};

function normalizeZip(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 5 ? digits.slice(0, 5) : null;
}

function normalizeWhatsapp(raw: string): string | null {
  // Strip spaces, dashes, parens; keep leading + if present.
  const cleaned = raw.replace(/[^\d+]/g, "");
  // E.164: + followed by 8–15 digits, first digit non-zero.
  return /^\+[1-9]\d{7,14}$/.test(cleaned) ? cleaned : null;
}

function normalizeUsername(raw: string): string {
  return raw.trim().replace(/^@/, "");
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: ProfilePayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const firstName = body.first_name?.trim();
  if (!firstName) {
    return NextResponse.json(
      { error: "first_name_required" },
      { status: 400 },
    );
  }

  const zip = body.zip_code ? normalizeZip(body.zip_code) : null;
  if (!zip) {
    return NextResponse.json(
      { error: "invalid_zip", message: "Zip must be at least 5 digits." },
      { status: 400 },
    );
  }

  const whatsapp = body.whatsapp?.trim()
    ? normalizeWhatsapp(body.whatsapp)
    : null;
  if (body.whatsapp?.trim() && !whatsapp) {
    return NextResponse.json(
      {
        error: "invalid_whatsapp",
        message: "WhatsApp must be in E.164 format, e.g. +14155551234.",
      },
      { status: 400 },
    );
  }

  const telegram = body.telegram?.trim()
    ? normalizeUsername(body.telegram)
    : null;
  const instagram = body.instagram?.trim()
    ? normalizeUsername(body.instagram)
    : null;

  if (!whatsapp && !telegram && !instagram) {
    return NextResponse.json(
      {
        error: "handle_required",
        message: "Add at least one of WhatsApp, Telegram, or Instagram.",
      },
      { status: 400 },
    );
  }

  const { error: updateError } = await supabase
    .from("users")
    .update({
      first_name: firstName,
      zip_code: zip,
      whatsapp,
      telegram,
      instagram,
    })
    .eq("id", user.id);

  if (updateError) {
    return NextResponse.json(
      { error: "update_failed", message: updateError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
