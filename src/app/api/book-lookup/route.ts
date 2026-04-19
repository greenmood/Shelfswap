import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

type SearchResult = {
  title: string;
  author: string | null;
  cover_url: string | null;
};

type OpenLibraryDoc = {
  title?: string;
  author_name?: string[];
  cover_i?: number;
};

const CACHE_SECONDS = 60 * 60 * 24; // 24h
const MAX_QUERY_LEN = 200;
const RESULT_LIMIT = 5;

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json([]);
  }
  if (q.length > MAX_QUERY_LEN) {
    return NextResponse.json({ error: "query_too_long" }, { status: 400 });
  }

  const upstreamUrl = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=${RESULT_LIMIT}`;

  let upstream: Response;
  try {
    upstream = await fetch(upstreamUrl, {
      headers: {
        // Open Library asks API consumers to identify themselves so they can
        // reach out if we misbehave. Not strictly required, but polite.
        "User-Agent":
          "shelfswap/0.1 (https://shelfswap-tau.vercel.app; greenmood)",
      },
      next: { revalidate: CACHE_SECONDS },
    });
  } catch {
    return NextResponse.json(
      { error: "upstream_unreachable" },
      { status: 502 },
    );
  }

  if (!upstream.ok) {
    return NextResponse.json({ error: "upstream_failed" }, { status: 502 });
  }

  const json = (await upstream.json()) as { docs?: OpenLibraryDoc[] };
  const docs = Array.isArray(json.docs) ? json.docs : [];

  const results: SearchResult[] = docs.slice(0, RESULT_LIMIT).map((d) => ({
    title: d.title ?? "Untitled",
    author: d.author_name?.[0] ?? null,
    cover_url: d.cover_i
      ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg`
      : null,
  }));

  return NextResponse.json(results);
}
