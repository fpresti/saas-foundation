export type InvitationEmailResult =
  | { sent: true }
  | { sent: false; note: string };

function parseResendError(detail: string): string {
  try {
    const json = JSON.parse(detail) as { message?: string };
    if (typeof json.message === 'string' && json.message.trim()) {
      return json.message.trim();
    }
  } catch {
    // plain text from Resend
  }
  return detail.trim() || 'Failed to send invitation email';
}

export async function sendInvitationEmail(params: {
  to: string;
  tenantName: string;
  acceptUrl: string;
  expiresAt: string;
}): Promise<InvitationEmailResult> {
  const resendKey = Deno.env.get('RESEND_API_KEY')?.trim();
  const fromEmail = (Deno.env.get('INVITE_FROM_EMAIL') ?? 'onboarding@resend.dev').trim();

  if (!resendKey) {
    const defined = Deno.env.get('RESEND_API_KEY') !== undefined;
    console.warn(
      `[invitation-email] RESEND_API_KEY ${defined ? 'is empty' : 'not set'}. URL for ${params.to}: ${params.acceptUrl}`
    );
    return {
      sent: false,
      note: defined
        ? 'RESEND_API_KEY is set but empty. Re-enter the key in Supabase → Edge Functions → Secrets.'
        : 'RESEND_API_KEY is not configured on the Edge Function. Set it in Supabase → Edge Functions → Secrets, then redeploy invite-member.',
    };
  }

  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: params.to,
      subject: `Invitation to join ${params.tenantName}`,
      html: `
        <p>You have been invited to join <strong>${params.tenantName}</strong>.</p>
        <p><a href="${params.acceptUrl}">Accept invitation</a></p>
        <p>This link expires on ${new Date(params.expiresAt).toUTCString()}.</p>
      `,
    }),
  });

  if (!emailRes.ok) {
    const detail = await emailRes.text();
    console.error('Resend error:', detail);
    return { sent: false, note: parseResendError(detail) };
  }

  if (fromEmail.endsWith('@resend.dev')) {
    console.log(
      `[invitation-email] sent via Resend sandbox from ${fromEmail} to ${params.to}`
    );
  }

  return { sent: true };
}
