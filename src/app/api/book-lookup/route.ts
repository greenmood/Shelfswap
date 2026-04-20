import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";

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
  const user = await getCurrentUser();
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

  // Cyrillic in the query is our signal that the user is looking for a
  // Ukrainian/Russian book. Without a language hint, Google Books and Open
  // Library both dilute results with transliterated English matches.
  const cyrillic = /\p{Script=Cyrillic}/u.test(q);

  // Fire both in parallel. Each helper catches its own errors and returns [],
  // so one source failing never kills the whole response.
  const [openLibrary, googleBooks] = await Promise.all([
    searchOpenLibrary(q, cyrillic),
    searchGoogleBooks(q, cyrillic),
  ]);

  const merged = dedupe(
    [...openLibrary, ...googleBooks],
    cyrillic,
  ).slice(0, FINAL_LIMIT);
  return NextResponse.json(merged);
}

async function searchOpenLibrary(
  q: string,
  cyrillic: boolean,
): Promise<SearchResult[]> {
  const langParam = cyrillic ? "&language=ukr" : "";
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}${langParam}&limit=${PER_SOURCE_LIMIT}`;
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

async function searchGoogleBooks(
  q: string,
  cyrillic: boolean,
): Promise<SearchResult[]> {
  const langParam = cyrillic ? "&langRestrict=uk" : "";
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}${langParam}&maxResults=${PER_SOURCE_LIMIT}`;
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

function dedupe(
  results: SearchResult[],
  cyrillicQuery: boolean,
): SearchResult[] {
  // Keep first-insertion order but allow later entries to upgrade the stored
  // record (swap in a Cyrillic title when the query is Cyrillic; fill in a
  // missing cover).
  const bucket = new Map<string, SearchResult>();
  for (const r of results) {
    const key = dedupeKey(r);
    const existing = bucket.get(key);
    if (!existing) {
      bucket.set(key, r);
      continue;
    }
    const existingIsCyrillic = isCyrillic(existing.title);
    const candidateIsCyrillic = isCyrillic(r.title);
    if (cyrillicQuery && candidateIsCyrillic && !existingIsCyrillic) {
      bucket.set(key, { ...r, cover_url: r.cover_url ?? existing.cover_url });
    } else if (!existing.cover_url && r.cover_url) {
      bucket.set(key, { ...existing, cover_url: r.cover_url });
    }
  }
  return Array.from(bucket.values());
}

function dedupeKey(r: SearchResult): string {
  return `${normalize(transliterate(r.title))}|${normalize(transliterate(r.author ?? ""))}`;
}

function isCyrillic(s: string): boolean {
  return /\p{Script=Cyrillic}/u.test(s);
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .trim()
    .replace(/\s+/g, " ");
}

// Minimal Ukrainian/Russian transliteration (BGN/PCGN-ish). Used only to
// build a dedup key so "Кобзар / Taras Shevchenko" collapses with "Kobzar /
// Taras Shevchenko" — it never touches displayed text.
const CYRILLIC_MAP: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "h", ґ: "g", д: "d", е: "e", є: "ie",
  ж: "zh", з: "z", и: "y", і: "i", ї: "i", й: "i", к: "k", л: "l",
  м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u",
  ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch", ю: "iu",
  я: "ia", ь: "", ъ: "", ы: "y", э: "e", ё: "e",
};

function transliterate(s: string): string {
  let out = "";
  for (const ch of s.toLowerCase()) {
    out += CYRILLIC_MAP[ch] ?? ch;
  }
  return out;
}
