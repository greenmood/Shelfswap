"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { BookCover } from "@/components/book-cover";
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

  const [isSaving, startTransition] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);

  // Debounced search against our proxy. Frozen when user has picked a result
  // or switched to manual entry — both downstream modes have their own UI.
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    if (selected || isManual) return;
    if (query.trim().length < 2) {
      setResults([]);
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
        setStatus("idle");
        setSearchError(null);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setStatus("error");
        setSearchError((err as Error).message);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, selected, isManual]);

  function switchToManual() {
    setManualTitle(query.trim());
    setManualAuthor("");
    setIsManual(true);
    setSelected(null);
    setSaveError(null);
  }

  function switchToSearch() {
    setIsManual(false);
    setSelected(null);
    setSaveError(null);
  }

  function save(payload: AddBookInput) {
    startTransition(async () => {
      try {
        await addBook(payload);
        // addBook() calls redirect("/app") on success — control doesn't return.
      } catch (err) {
        setSaveError((err as Error).message);
      }
    });
  }

  function handleSubmitSelected(e: React.FormEvent) {
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

  if (isManual) {
    return (
      <form onSubmit={handleSubmitManual} className="mt-6 space-y-6">
        <button
          type="button"
          onClick={switchToSearch}
          className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
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

        <ConditionRadio value={condition} onChange={setCondition} />

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isSaving || !manualTitle.trim()}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
          >
            {isSaving ? "Adding…" : "Add to library"}
          </button>
          <Link
            href="/app"
            className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
          >
            Cancel
          </Link>
          {saveError && (
            <span className="text-sm text-red-600">{saveError}</span>
          )}
        </div>
      </form>
    );
  }

  if (selected) {
    return (
      <form onSubmit={handleSubmitSelected} className="mt-6 space-y-6">
        <div className="flex items-start gap-4 rounded-md border border-neutral-200 p-4 dark:border-neutral-800">
          <BookCover
            cover_url={selected.cover_url}
            alt={selected.title}
            size="lg"
          />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="font-medium">{selected.title}</p>
            {selected.author && (
              <p className="text-sm text-neutral-500">{selected.author}</p>
            )}
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-xs text-neutral-500 underline hover:text-neutral-900 dark:hover:text-neutral-100"
            >
              Pick a different result
            </button>
          </div>
        </div>

        <ConditionRadio value={condition} onChange={setCondition} />

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
          >
            {isSaving ? "Adding…" : "Add to library"}
          </button>
          <Link
            href="/app"
            className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
          >
            Cancel
          </Link>
          {saveError && (
            <span className="text-sm text-red-600">{saveError}</span>
          )}
        </div>
      </form>
    );
  }

  const noMatches =
    status === "idle" && query.trim().length >= 2 && results.length === 0;

  return (
    <div className="mt-6 space-y-4">
      <input
        type="search"
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by title or author…"
        className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900"
      />

      {status === "searching" && (
        <p className="text-sm text-neutral-500">Searching…</p>
      )}
      {status === "error" && searchError && (
        <p className="text-sm text-red-600">{searchError}</p>
      )}
      {noMatches && (
        <p className="text-sm text-neutral-500">
          No matches for “{query.trim()}”.
        </p>
      )}

      <ul className="space-y-2">
        {results.map((r, i) => (
          <li key={`${r.title}-${i}`}>
            <button
              type="button"
              onClick={() => setSelected(r)}
              className="flex w-full items-start gap-3 rounded-md border border-neutral-200 p-3 text-left hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600"
            >
              <BookCover cover_url={r.cover_url} alt={r.title} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-medium">{r.title}</p>
                {r.author && (
                  <p className="line-clamp-1 text-xs text-neutral-500">
                    {r.author}
                  </p>
                )}
              </div>
            </button>
          </li>
        ))}
      </ul>

      <div className="border-t border-neutral-200 pt-4 dark:border-neutral-800">
        <button
          type="button"
          onClick={switchToManual}
          className="text-sm text-neutral-600 underline hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        >
          {query.trim()
            ? `Can't find it? Add “${query.trim()}” manually →`
            : "Add manually →"}
        </button>
      </div>
    </div>
  );
}

function ConditionRadio({
  value,
  onChange,
}: {
  value: "good" | "worn";
  onChange: (v: "good" | "worn") => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">Condition</legend>
      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="condition"
            value="good"
            checked={value === "good"}
            onChange={() => onChange("good")}
          />
          Good
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="condition"
            value="worn"
            checked={value === "worn"}
            onChange={() => onChange("worn")}
          />
          Worn
        </label>
      </div>
    </fieldset>
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
      <span className="text-sm font-medium">
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
        className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900"
      />
    </label>
  );
}

