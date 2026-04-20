"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { BookCover } from "@/components/book-cover";
import { ConditionChips } from "@/components/condition-chips";
import { RadioDot } from "@/components/radio-dot";
import { addBook, type AddBookInput } from "./actions";

type SearchResult = {
  title: string;
  author: string | null;
  cover_url: string | null;
};

type Status = "idle" | "searching" | "error";

export function AddBookForm() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [searchError, setSearchError] = useState<string | null>(null);

  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [isManual, setIsManual] = useState(false);
  const [manualTitle, setManualTitle] = useState("");
  const [manualAuthor, setManualAuthor] = useState("");

  const [condition, setCondition] = useState<"good" | "worn">("good");

  const [isSaving, startSaving] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);

  // Debounced search; frozen while in manual mode.
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    if (isManual) return;
    if (query.trim().length < 2) {
      setResults([]);
      setSelected(null);
      setStatus("idle");
      return;
    }

    setStatus("searching");
    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(
          `/api/book-lookup?q=${encodeURIComponent(query.trim())}`,
          { signal: controller.signal },
        );
        if (!res.ok) throw new Error("Search failed.");
        const data = (await res.json()) as SearchResult[];
        setResults(data);
        // Clear selection if the newly-selected item isn't in the fresh list.
        setSelected((sel) =>
          sel &&
          data.some(
            (r) => r.title === sel.title && r.author === sel.author,
          )
            ? sel
            : null,
        );
        setStatus("idle");
        setSearchError(null);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setStatus("error");
        setSearchError((err as Error).message);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, isManual]);

  function switchToManual() {
    setManualTitle(query.trim());
    setManualAuthor("");
    setIsManual(true);
    setSelected(null);
    setSaveError(null);
  }

  function switchToSearch() {
    setIsManual(false);
    setSaveError(null);
  }

  function save(payload: AddBookInput) {
    setSaveError(null);
    startSaving(async () => {
      try {
        await addBook(payload);
      } catch (err) {
        setSaveError((err as Error).message);
      }
    });
  }

  function handleSubmitSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    save({
      title: selected.title,
      author: selected.author,
      cover_url: selected.cover_url,
      condition,
    });
  }

  function handleSubmitManual(e: React.FormEvent) {
    e.preventDefault();
    const title = manualTitle.trim();
    if (!title) return;
    save({
      title,
      author: manualAuthor.trim() || null,
      cover_url: null,
      condition,
    });
  }

  // ------------------------------------------------------------------
  // Manual entry view
  // ------------------------------------------------------------------
  if (isManual) {
    return (
      <form onSubmit={handleSubmitManual} className="mt-6 space-y-6">
        <button
          type="button"
          onClick={switchToSearch}
          className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted hover:text-ink"
        >
          ← Back to search
        </button>

        <div className="space-y-4">
          <Field
            label="Title"
            value={manualTitle}
            onChange={setManualTitle}
            placeholder="Кобзар"
            required
            autoFocus
          />
          <Field
            label="Author"
            value={manualAuthor}
            onChange={setManualAuthor}
            placeholder="Тарас Шевченко"
          />
        </div>

        <ConditionChips value={condition} onChange={setCondition} />

        <div className="space-y-3 pt-2">
          <button
            type="submit"
            disabled={isSaving || !manualTitle.trim()}
            className="w-full rounded-md bg-ink px-4 py-3 text-sm font-medium text-paper disabled:opacity-50"
          >
            {isSaving ? "Adding…" : "Add to my library"}
          </button>
          {saveError && (
            <p className="text-center text-sm text-red-600">{saveError}</p>
          )}
          <div className="text-center">
            <Link
              href="/app"
              className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted hover:text-ink"
            >
              Cancel
            </Link>
          </div>
        </div>
      </form>
    );
  }

  // ------------------------------------------------------------------
  // Search view
  // ------------------------------------------------------------------
  const trimmed = query.trim();
  const noMatches =
    status === "idle" && trimmed.length >= 2 && results.length === 0;

  return (
    <form onSubmit={handleSubmitSearch} className="mt-6 space-y-4">
      <SearchField value={query} onChange={setQuery} autoFocus />

      {status === "searching" && (
        <p className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted">
          Searching…
        </p>
      )}
      {status === "error" && searchError && (
        <p className="text-sm text-red-600">{searchError}</p>
      )}

      {results.length > 0 && (
        <>
          <p className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted">
            {results.length}{" "}
            {results.length === 1 ? "match" : "matches"}
          </p>
          <ul className="overflow-hidden rounded-md bg-paper">
            {results.map((r, i) => {
              const isSelected =
                selected?.title === r.title &&
                selected?.author === r.author;
              return (
                <li key={`${r.title}-${i}`}>
                  <button
                    type="button"
                    onClick={() => setSelected(r)}
                    aria-pressed={isSelected}
                    className={`flex w-full items-start gap-3 px-3 py-3 text-left transition ${
                      isSelected
                        ? "bg-cream-dim"
                        : "border-b border-divider last:border-b-0 hover:bg-cream-dim/50"
                    }`}
                  >
                    <BookCover
                      cover_url={r.cover_url}
                      alt={r.title}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="line-clamp-2 font-serif text-sm font-medium leading-tight">
                        {r.title}
                      </p>
                      {r.author && (
                        <p className="line-clamp-1 text-xs text-muted">
                          {r.author}
                        </p>
                      )}
                    </div>
                    <span className="mt-1">
                      <RadioDot checked={isSelected} />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {noMatches && (
        <p className="text-sm text-muted">
          No matches for &ldquo;{trimmed}&rdquo;.
        </p>
      )}

      <div className="pt-2">
        <ConditionChips value={condition} onChange={setCondition} />
      </div>

      <div className="space-y-3 pt-2">
        <button
          type="submit"
          disabled={!selected || isSaving}
          className="w-full rounded-md bg-ink px-4 py-3 text-sm font-medium text-paper disabled:opacity-50"
        >
          {isSaving ? "Adding…" : "Add to my library"}
        </button>

        {saveError && (
          <p className="text-center text-sm text-red-600">{saveError}</p>
        )}

        <div className="text-center">
          <button
            type="button"
            onClick={switchToManual}
            className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted hover:text-ink"
          >
            Or enter manually
          </button>
        </div>
      </div>
    </form>
  );
}

// ------------------------------------------------------------------
// Pieces
// ------------------------------------------------------------------

function SearchField({
  value,
  onChange,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
}) {
  return (
    <div className="relative">
      <span
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-muted"
      >
        ⌕
      </span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search by title or author…"
        autoFocus={autoFocus}
        className="w-full rounded-md border border-subtle bg-paper py-2 pl-9 pr-3 text-sm outline-none focus:border-ink"
      />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  autoFocus?: boolean;
}) {
  return (
    <label className="block space-y-1">
      <span className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        autoFocus={autoFocus}
        className="w-full rounded-md border border-subtle bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
      />
    </label>
  );
}
