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
