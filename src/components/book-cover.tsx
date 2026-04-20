import Image from "next/image";

export type BookCoverSize = "sm" | "md" | "lg";

const DIMS: Record<BookCoverSize, { w: number; h: number }> = {
  sm: { w: 40, h: 60 },
  md: { w: 56, h: 84 },
  lg: { w: 80, h: 120 },
};

export function BookCover({
  cover_url,
  alt,
  size = "md",
}: {
  cover_url: string | null;
  alt: string;
  size?: BookCoverSize;
}) {
  const { w, h } = DIMS[size];

  if (!cover_url) {
    return (
      <div
        style={{ width: w, height: h }}
        className="flex shrink-0 items-center justify-center rounded border border-subtle bg-cream-dim text-xs text-muted dark:border-neutral-800 dark:bg-ink"
      >
        No cover
      </div>
    );
  }

  return (
    <Image
      src={cover_url}
      alt={alt}
      width={w}
      height={h}
      className="h-auto shrink-0 rounded border border-subtle object-cover dark:border-neutral-800"
      unoptimized
    />
  );
}
