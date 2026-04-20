// A book's *displayed* status, derived from is_available + active-swap
// membership. Distinct from SwapStatus (pending/accepted/etc.) which
// describes a swap, not a book.
export type BookStatus = "available" | "in_swap" | "not_listed";

const STYLES: Record<BookStatus, string> = {
  available: "bg-accent-soft text-accent",
  in_swap: "bg-pending-bg text-pending-fg",
  not_listed: "bg-cream-dim text-muted",
};

const LABELS: Record<BookStatus, string> = {
  available: "Available",
  in_swap: "In swap",
  not_listed: "Not listed",
};

export function BookStatusPill({ status }: { status: BookStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 font-mono text-[9px] font-medium uppercase tracking-widest ${STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}
