import { Resend } from "resend";

type SwapRequestEmail = {
  to: string;
  ownerFirstName: string | null;
  requesterFirstName: string | null;
  requestedTitle: string;
  offeredTitle: string;
  appUrl: string;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  return new Resend(key);
}

export async function sendSwapRequestEmail(params: SwapRequestEmail) {
  const from = process.env.EMAIL_FROM ?? "Shelfswap <onboarding@resend.dev>";
  const resend = getResend();

  const requester = params.requesterFirstName ?? "Someone";
  const ownerHello = params.ownerFirstName
    ? `Hi ${params.ownerFirstName},`
    : "Hi,";

  const subject = `${requester} wants to swap for your book`;

  const text = `${ownerHello}

${requester} on Shelfswap wants to swap their "${params.offeredTitle}" for your "${params.requestedTitle}".

Open Shelfswap to review:
${params.appUrl}
`;

  const html = `<p>${escapeHtml(ownerHello)}</p>
<p><strong>${escapeHtml(requester)}</strong> on Shelfswap wants to swap their &ldquo;${escapeHtml(params.offeredTitle)}&rdquo; for your &ldquo;${escapeHtml(params.requestedTitle)}&rdquo;.</p>
<p><a href="${params.appUrl}">Review the request →</a></p>
<p style="color:#888;font-size:12px;margin-top:24px">Shelfswap</p>`;

  const result = await resend.emails.send({
    from,
    to: params.to,
    subject,
    text,
    html,
  });

  if (result.error) {
    throw new Error(result.error.message ?? "Resend send failed");
  }

  return result.data;
}

// ---------------------------------------------------------------------------
// Status-change emails: accept / decline / cancel
// ---------------------------------------------------------------------------

export type SwapStatusEmailKind = "accepted" | "declined" | "cancelled";

type SwapStatusEmail = {
  to: string;
  status: SwapStatusEmailKind;
  // Only read for "cancelled" — distinguishes "cancelled their request"
  // (fromStatus: "pending") from "cancelled the accepted swap"
  // (fromStatus: "accepted"). Optional for back-compat of accepted/declined.
  fromStatus?: "pending" | "accepted";
  recipientFirstName: string | null;
  actorFirstName: string | null;
  requestedTitle: string;
  offeredTitle: string;
  swapUrl: string;
};

function buildCopy(params: SwapStatusEmail): { subject: string; text: string; html: string } {
  const actor = params.actorFirstName ?? "Someone";
  const hello = params.recipientFirstName
    ? `Hi ${params.recipientFirstName},`
    : "Hi,";

  switch (params.status) {
    case "accepted": {
      const subject = `${actor} accepted your swap`;
      const text = `${hello}

${actor} accepted your request to swap your "${params.offeredTitle}" for their "${params.requestedTitle}". It's a match — open Shelfswap to see how to reach them:
${params.swapUrl}
`;
      const html = `<p>${escapeHtml(hello)}</p>
<p><strong>${escapeHtml(actor)}</strong> accepted your request to swap your &ldquo;${escapeHtml(params.offeredTitle)}&rdquo; for their &ldquo;${escapeHtml(params.requestedTitle)}&rdquo;.</p>
<p>It&rsquo;s a match. <a href="${params.swapUrl}">Open Shelfswap</a> to see how to reach them.</p>
<p style="color:#888;font-size:12px;margin-top:24px">Shelfswap</p>`;
      return { subject, text, html };
    }
    case "declined": {
      const subject = `${actor} declined your swap`;
      const text = `${hello}

${actor} declined your request to swap for "${params.requestedTitle}". No hard feelings — there are other books on Shelfswap:
${params.swapUrl}
`;
      const html = `<p>${escapeHtml(hello)}</p>
<p><strong>${escapeHtml(actor)}</strong> declined your request to swap for &ldquo;${escapeHtml(params.requestedTitle)}&rdquo;.</p>
<p>No hard feelings — there are other books on <a href="${params.swapUrl}">Shelfswap</a>.</p>
<p style="color:#888;font-size:12px;margin-top:24px">Shelfswap</p>`;
      return { subject, text, html };
    }
    case "cancelled": {
      if (params.fromStatus === "accepted") {
        const subject = `${actor} cancelled the swap`;
        const text = `${hello}

${actor} cancelled the accepted swap — your "${params.offeredTitle}" for their "${params.requestedTitle}". Both books are back as they were.
${params.swapUrl}
`;
        const html = `<p>${escapeHtml(hello)}</p>
<p><strong>${escapeHtml(actor)}</strong> cancelled the accepted swap — your &ldquo;${escapeHtml(params.offeredTitle)}&rdquo; for their &ldquo;${escapeHtml(params.requestedTitle)}&rdquo;.</p>
<p>Both books are back as they were. <a href="${params.swapUrl}">View on Shelfswap</a>.</p>
<p style="color:#888;font-size:12px;margin-top:24px">Shelfswap</p>`;
        return { subject, text, html };
      }
      const subject = `${actor} cancelled their swap request`;
      const text = `${hello}

${actor} cancelled their request for your "${params.requestedTitle}". No action needed.
${params.swapUrl}
`;
      const html = `<p>${escapeHtml(hello)}</p>
<p><strong>${escapeHtml(actor)}</strong> cancelled their request for your &ldquo;${escapeHtml(params.requestedTitle)}&rdquo;. No action needed.</p>
<p><a href="${params.swapUrl}">View on Shelfswap</a></p>
<p style="color:#888;font-size:12px;margin-top:24px">Shelfswap</p>`;
      return { subject, text, html };
    }
  }
}

export async function sendSwapStatusEmail(params: SwapStatusEmail) {
  const from = process.env.EMAIL_FROM ?? "Shelfswap <onboarding@resend.dev>";
  const resend = getResend();
  const { subject, text, html } = buildCopy(params);

  const result = await resend.emails.send({
    from,
    to: params.to,
    subject,
    text,
    html,
  });

  if (result.error) {
    throw new Error(result.error.message ?? "Resend send failed");
  }

  return result.data;
}
