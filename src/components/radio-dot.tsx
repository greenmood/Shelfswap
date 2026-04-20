// Presentational radio circle used alongside a visually-hidden native input
// (or a button with role=radio). Just the dot — not a full form control.
// Keeps the visible style in one place across Add Book + Propose Swap.

export function RadioDot({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
        checked ? "border-ink" : "border-subtle"
      }`}
    >
      {checked && <span className="h-2 w-2 rounded-full bg-ink" />}
    </span>
  );
}
