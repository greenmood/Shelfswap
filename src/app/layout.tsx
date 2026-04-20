import type { Metadata } from "next";
import { Fraunces, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["opsz"],
  style: ["normal", "italic"],
});

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument-sans",
  weight: ["400", "500", "600"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  weight: ["400", "500"],
});

// metadataBase lets Next.js resolve relative URLs in OG/Twitter fields
// (including the opengraph-image file convention) against the production
// origin. Without it, relative image paths become /opengraph-image which
// scrapers can't follow.
export const metadata: Metadata = {
  metadataBase: new URL("https://shelfswap.dev"),
  title: {
    default: "Shelfswap",
    template: "%s · Shelfswap",
  },
  description: "Swap books with your friends and neighbors.",
  openGraph: {
    title: "Shelfswap",
    description: "Swap books with your friends and neighbors.",
    url: "/",
    siteName: "Shelfswap",
    type: "website",
    // Note: `images` intentionally omitted here — Next.js auto-adds the
    // opengraph-image.tsx output with correct dimensions.
  },
  twitter: {
    card: "summary_large_image",
    title: "Shelfswap",
    description: "Swap books with your friends and neighbors.",
    // Same: twitter-image.tsx would be auto-added; we reuse the OG image.
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${instrumentSans.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
