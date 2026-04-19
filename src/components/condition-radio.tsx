export type BookCondition = "good" | "worn";

export function ConditionRadio({
  value,
  onChange,
}: {
  value: BookCondition;
  onChange: (v: BookCondition) => void;
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
