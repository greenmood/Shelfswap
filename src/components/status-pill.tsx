export type SwapStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "completed"
  | "cancelled";

const STYLES: Record<SwapStatus, string> = {
  pending:
    "bg-pending-bg text-pending-fg dark:bg-amber-950 dark:text-amber-300",
  accepted:
    "bg-accepted-bg text-accepted-fg dark:bg-emerald-950 dark:text-emerald-300",
  completed:
    "bg-accent-soft text-accent dark:bg-blue-950 dark:text-blue-300",
  declined:
    "bg-divider text-muted dark:bg-neutral-800 dark:text-muted",
  cancelled:
    "bg-divider text-muted dark:bg-neutral-800 dark:text-muted",
};

const LABELS: Record<SwapStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  completed: "Completed",
  declined: "Declined",
  cancelled: "Cancelled",
};

export function StatusPill({ status }: { status: SwapStatus }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[9px] font-medium uppercase tracking-widest ${STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}
