export type SwapStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "completed"
  | "cancelled";

const STYLES: Record<SwapStatus, string> = {
  pending:
    "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  accepted:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  completed:
    "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  declined:
    "bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
  cancelled:
    "bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
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
      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}
