"use client";

// Condition picker rendered as two mono-uppercase chips. Keyboard-
// accessible via native buttons with role="radio" and aria-checked.
// Replaces the older ConditionRadio component (same API, new UI).

export type BookCondition = "good" | "worn";

const OPTIONS: { value: BookCondition; label: string }[] = [
  { value: "good", label: "Good" },
  { value: "worn", label: "Worn" },
];

export function ConditionChips({
  value,
  onChange,
  labelled = true,
}: {
  value: BookCondition;
  onChange: (v: BookCondition) => void;
  labelled?: boolean;
}) {
  return (
    <div>
      {labelled && (
        <p
          aria-hidden
          className="mb-2 font-mono text-[10px] font-medium uppercase tracking-widest text-muted"
        >
          Condition
        </p>
      )}
      <div role="radiogroup" aria-label="Condition" className="flex gap-2">
        {OPTIONS.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(opt.value)}
              className={`rounded-full px-3 py-1 font-mono text-[10px] font-medium uppercase tracking-widest transition ${
                active
                  ? "bg-ink text-paper"
                  : "bg-cream-dim text-muted hover:bg-subtle"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
