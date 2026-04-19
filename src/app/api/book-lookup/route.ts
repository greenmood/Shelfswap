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

type GoogleBooksItem = {
  volumeInfo?: {
    title?: string;
    authors?: string[];
    imageLinks?: {
      smallThumbnail?: string;
      thumbnail?: string;
    };
  };
};

const CACHE_SECONDS = 60 * 60 * 24; // 24h
const MAX_QUERY_LEN = 200;
const PER_SOURCE_LIMIT = 8;
const FINAL_LIMIT = 10;

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

  // Fire both in parallel. Each helper catches its own errors and returns [],
  // so one source failing never kills the whole response.
  const [openLibrary, googleBooks] = await Promise.all([
    searchOpenLibrary(q),
    searchGoogleBooks(q),
  ]);

  const merged = dedupe([...openLibrary, ...googleBooks]).slice(0, FINAL_LIMIT);
  return NextResponse.json(merged);
}

async function searchOpenLibrary(q: string): Promise<SearchResult[]> {
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=${PER_SOURCE_LIMIT}`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "shelfswap/0.1 (https://shelfswap-tau.vercel.app; greenmood)",
      },
      next: { revalidate: CACHE_SECONDS },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { docs?: OpenLibraryDoc[] };
    const docs = Array.isArray(json.docs) ? json.docs : [];
    return docs.slice(0, PER_SOURCE_LIMIT).map((d) => ({
      title: d.title ?? "Untitled",
      author: d.author_name?.[0] ?? null,
      cover_url: d.cover_i
        ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg`
        : null,
    }));
  } catch {
    return [];
  }
}

async function searchGoogleBooks(q: string): Promise<SearchResult[]> {
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=${PER_SOURCE_LIMIT}`;
  try {
    const res = await fetch(url, { next: { revalidate: CACHE_SECONDS } });
    if (!res.ok) return [];
    const json = (await res.json()) as { items?: GoogleBooksItem[] };
    const items = Array.isArray(json.items) ? json.items : [];
    return items.slice(0, PER_SOURCE_LIMIT).map((item) => {
      const vi = item.volumeInfo ?? {};
      const raw = vi.imageLinks?.thumbnail ?? vi.imageLinks?.smallThumbnail;
      // Google Books sometimes returns http:// URLs for cover images; rewriting
      // to https:// avoids mixed-content blocking in the browser and matches
      // next/image's remotePatterns whitelist.
      const cover_url = raw ? raw.replace(/^http:\/\//, "https://") : null;
      return {
        title: vi.title ?? "Untitled",
        author: vi.authors?.[0] ?? null,
        cover_url,
      };
    });
  } catch {
    return [];
  }
}

function dedupe(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>();
  const out: SearchResult[] = [];
  for (const r of results) {
    const key = `${normalize(r.title)}|${normalize(r.author ?? "")}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, " ");
}
