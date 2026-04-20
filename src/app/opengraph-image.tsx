import { ImageResponse } from "next/og";

// Next.js file-convention route: served at /opengraph-image on the production
// URL (https://shelfswap.dev/opengraph-image). WhatsApp/Telegram/Slack/iMessage
// scrape this when a Shelfswap link is shared. Cached after first render.

export const alt = "Shelfswap — swap books with your friends and neighbors";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CREAM = "#faf6ee";
const INK = "#1a1814";
const MUTED = "#78726a";
const ACCENT = "#7c2d12";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: CREAM,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "0 96px",
          fontFamily: "Georgia, 'Times New Roman', serif",
        }}
      >
        <div
          style={{
            fontSize: 188,
            fontWeight: 500,
            color: INK,
            letterSpacing: "-0.04em",
            lineHeight: 1,
            display: "flex",
          }}
        >
          <span>Shelf</span>
          <span style={{ fontStyle: "italic", color: ACCENT }}>swap</span>
        </div>

        <div
          style={{
            marginTop: 36,
            fontSize: 42,
            color: MUTED,
            fontFamily:
              "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            letterSpacing: "-0.005em",
            maxWidth: 780,
            lineHeight: 1.25,
          }}
        >
          Swap books with your friends and neighbors.
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 72,
            left: 96,
            fontSize: 22,
            color: MUTED,
            fontFamily:
              "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          shelfswap.dev
        </div>
      </div>
    ),
    { ...size },
  );
}
