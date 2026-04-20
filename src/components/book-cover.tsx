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
    // Wireframe-style gradient placeholder — warm paper tones with a
    // subtle diagonal highlight to hint at a book's sheen. No "No cover"
    // text; context makes it obvious.
    return (
      <div
        aria-label={alt}
        role="img"
        style={{ width: w, height: h }}
        className="relative shrink-0 overflow-hidden rounded-[2px] bg-gradient-to-br from-[#ede4cd] to-[#d9cfb5] shadow-sm"
      >
        <span
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent"
          style={{
            backgroundImage:
              "linear-gradient(100deg, transparent 55%, rgba(255,255,255,0.25) 60%, transparent 65%)",
          }}
        />
      </div>
    );
  }

  return (
    <Image
      src={cover_url}
      alt={alt}
      width={w}
      height={h}
      className="h-auto shrink-0 rounded-[2px] object-cover shadow-sm"
      unoptimized
    />
  );
}
