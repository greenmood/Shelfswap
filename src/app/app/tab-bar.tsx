"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/app", label: "Library", Icon: LibraryIcon },
  { href: "/app/discover", label: "Discover", Icon: DiscoverIcon },
  { href: "/app/swaps", label: "Swaps", Icon: SwapsIcon },
] as const;

const TAB_PATHS = new Set<string>(TABS.map((t) => t.href));

export function TabBar() {
  const pathname = usePathname();
  // Only render on the three main tab pages. Detail/flow screens use their
  // own "← back" nav instead.
  if (!TAB_PATHS.has(pathname)) return null;

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-subtle bg-paper md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-3">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={`flex flex-col items-center gap-1 py-3 font-mono text-[9px] font-medium uppercase tracking-widest ${
                  active ? "text-ink" : "text-muted"
                }`}
              >
                <tab.Icon
                  className={`h-4 w-4 ${active ? "opacity-100" : "opacity-60"}`}
                />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// Icons mirror the wireframe glyphs — stroke-only SVGs with 1.5 stroke-width.
function LibraryIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      {...props}
    >
      <path d="M4 4h6v16H4zM14 4h6v16h-6z" />
    </svg>
  );
}

function DiscoverIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M15 9l-3 7-3-7 6 0z" />
    </svg>
  );
}

function SwapsIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M4 7h13l-3-3M20 17H7l3 3" />
    </svg>
  );
}
