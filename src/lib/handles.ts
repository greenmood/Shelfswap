// Deep-link builders for user contact handles.
// Storage formats are normalized at write time (see /api/me PATCH):
//   whatsapp → E.164 phone, e.g. "+380671234567"
//   telegram → username without "@"
//   instagram → username without "@"
// Returning null for empty/invalid input keeps call sites tidy — they can
// filter the nulls out of the display list.

export function whatsappUrl(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : null;
}

export function telegramUrl(username: string | null | undefined): string | null {
  if (!username) return null;
  const clean = username.replace(/^@/, "").trim();
  return clean ? `https://t.me/${clean}` : null;
}

export function instagramUrl(username: string | null | undefined): string | null {
  if (!username) return null;
  const clean = username.replace(/^@/, "").trim();
  return clean ? `https://instagram.com/${clean}` : null;
}
