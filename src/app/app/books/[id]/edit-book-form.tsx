"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { BookCover } from "@/components/book-cover";
import {
  ConditionRadio,
  type BookCondition,
} from "@/components/condition-radio";
import { updateBook, deleteBook } from "../../actions";

export function EditBookForm({
  book,
}: {
  book: {
    id: string;
    title: string;
    author: string | null;
    cover_url: string | null;
    condition: BookCondition;
  };
}) {
  const [title, setTitle] = useState(book.title);
  const [author, setAuthor] = useState(book.author ?? "");
  const [condition, setCondition] = useState<BookCondition>(book.condition);

  const [isSaving, startSave] = useTransition();
  const [isDeleting, startDelete] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startSave(async () => {
      try {
        await updateBook({
          id: book.id,
          title,
          author: author.trim() || null,
          condition,
        });
        // updateBook() calls redirect("/app") on success.
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  function handleDelete() {
    setError(null);
    startDelete(async () => {
      try {
        await deleteBook(book.id);
        // deleteBook() calls redirect("/app") on success.
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  const busy = isSaving || isDeleting;

  return (
    <div className="mt-6 space-y-6">
      <form onSubmit={handleSave} className="space-y-5">
        <div className="flex items-start gap-4 rounded-md border border-subtle p-4 dark:border-neutral-800">
          <BookCover
            cover_url={book.cover_url}
            alt={book.title}
            size="lg"
          />
          <p className="text-xs text-muted">
            Cover is set from Open Library and not editable here. Delete and
            re-add if you need a different cover.
          </p>
        </div>

        <Field
          label="Title"
          value={title}
          onChange={setTitle}
          required
        />
        <Field label="Author" value={author} onChange={setAuthor} />

        <ConditionRadio value={condition} onChange={setCondition} />

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={busy || !title.trim()}
            className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper disabled:opacity-50 dark:bg-paper dark:text-ink"
          >
            {isSaving ? "Saving…" : "Save"}
          </button>
          <Link
            href="/app"
            className="text-sm text-muted hover:text-ink dark:hover:text-neutral-100"
          >
            Cancel
          </Link>
          {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
      </form>

      <div className="border-t border-subtle pt-6 dark:border-neutral-800">
        {confirmDelete ? (
          <div className="space-y-3">
            <p className="text-sm">
              Delete &ldquo;{book.title}&rdquo; from your library? This can&rsquo;t be
              undone.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleDelete}
                disabled={busy}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-paper disabled:opacity-50"
              >
                {isDeleting ? "Deleting…" : "Yes, delete"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                disabled={busy}
                className="text-sm text-muted hover:text-ink dark:hover:text-neutral-100"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            disabled={busy}
            className="text-sm text-red-600 hover:underline disabled:opacity-50"
          >
            Delete book
          </button>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
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
        required={required}
        className="w-full rounded-md border border-subtle px-3 py-2 text-sm outline-none focus:border-ink dark:border-neutral-700 dark:bg-ink"
      />
    </label>
  );
}
