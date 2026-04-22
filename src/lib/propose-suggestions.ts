// Shared propose-suggestions classifier. Used by both the API route and the
// Propose server component so the ranking stays in one place.

export type Condition = "good" | "worn";

export type SuggestionBook = {
  id: string;
  title: string;
  author: string | null;
  cover_url: string | null;
  condition: Condition;
  locked: boolean;
  // Populated only for `likely` entries — either or both may be set.
  match_title: string | null;
  match_author: string | null;
};

export type SuggestionBuckets = {
  wanted: SuggestionBook[];
  likely: SuggestionBook[];
  other: SuggestionBook[];
};

export type MyBookRow = {
  id: string;
  title: string;
  author: string | null;
  cover_url: string | null;
  condition: Condition;
};

export type OwnerWishRow = {
  book_id: string;
  book: { title: string | null; author: string | null } | null;
};

function normalize(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

export function classifyProposeSuggestions(
  myBooks: MyBookRow[],
  ownerWishes: OwnerWishRow[],
  lockedIds: Set<string>,
): SuggestionBuckets {
  const wishedBookIds = new Set<string>();
  // Map normalized → original casing so the UI displays the canonical form
  // the owner wished for, not my local book's casing.
  const wishedTitles = new Map<string, string>();
  const wishedAuthors = new Map<string, string>();

  for (const w of ownerWishes) {
    wishedBookIds.add(w.book_id);
    const t = normalize(w.book?.title);
    if (t && w.book?.title) wishedTitles.set(t, w.book.title);
    const a = normalize(w.book?.author);
    if (a && w.book?.author) wishedAuthors.set(a, w.book.author);
  }

  const buckets: SuggestionBuckets = { wanted: [], likely: [], other: [] };

  for (const b of myBooks) {
    const locked = lockedIds.has(b.id);
    const base = {
      id: b.id,
      title: b.title,
      author: b.author,
      cover_url: b.cover_url,
      condition: b.condition,
      locked,
    };

    if (wishedBookIds.has(b.id)) {
      buckets.wanted.push({ ...base, match_title: null, match_author: null });
      continue;
    }

    const titleHit = wishedTitles.get(normalize(b.title)) ?? null;
    const authorHit = b.author
      ? (wishedAuthors.get(normalize(b.author)) ?? null)
      : null;

    if (titleHit || authorHit) {
      buckets.likely.push({
        ...base,
        match_title: titleHit,
        match_author: authorHit,
      });
    } else {
      buckets.other.push({ ...base, match_title: null, match_author: null });
    }
  }

  return buckets;
}
