"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Profile = {
  first_name: string;
  whatsapp: string;
  telegram: string;
  instagram: string;
};

export function ProfileForm({ initial }: { initial: Profile }) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile>(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function update<K extends keyof Profile>(key: K, value: Profile[K]) {
    setProfile((p) => ({ ...p, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setErrorMsg(null);

    const res = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as {
        message?: string;
        error?: string;
      };
      setErrorMsg(body.message ?? body.error ?? "Save failed.");
      setStatus("error");
      return;
    }

    setStatus("saved");
    // Refresh server components so any reads of the profile pick up new values.
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-5">
      <Field
        label="First name"
        value={profile.first_name}
        onChange={(v) => update("first_name", v)}
        required
      />

      <div className="space-y-3 rounded-md border border-subtle bg-paper p-4 dark:border-neutral-800">
        <p className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted">
          Handles
        </p>
        <p className="text-xs text-muted">
          Shared with the other person only after a swap is accepted. At least
          one required.
        </p>

        <Field
          label="Telegram"
          value={profile.telegram}
          onChange={(v) => update("telegram", v)}
          placeholder="username"
          hint="Without the @."
        />

        <Field
          label="Instagram"
          value={profile.instagram}
          onChange={(v) => update("instagram", v)}
          placeholder="username"
          hint="Without the @."
        />

        <Field
          label="WhatsApp"
          value={profile.whatsapp}
          onChange={(v) => update("whatsapp", v)}
          placeholder="+14155551234"
          hint="E.164 format (country code + number)."
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={status === "saving"}
          className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper disabled:opacity-50 dark:bg-paper dark:text-ink"
        >
          {status === "saving" ? "Saving…" : "Save"}
        </button>
        {status === "saved" && (
          <span className="text-sm text-emerald-600">Saved.</span>
        )}
        {status === "error" && errorMsg && (
          <span className="text-sm text-red-600">{errorMsg}</span>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  hint,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
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
        placeholder={placeholder}
        required={required}
        className="w-full rounded-md border border-subtle px-3 py-2 text-sm outline-none focus:border-ink dark:border-neutral-700 dark:bg-ink"
      />
      {hint && <span className="block text-xs text-muted">{hint}</span>}
    </label>
  );
}
