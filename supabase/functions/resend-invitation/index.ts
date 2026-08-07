import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { sendInvitationEmail } from '../_shared/invitation-email.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ResendBody = {
  invitationId?: string;
  tenantId?: string;
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: ResendBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const invitationId = body.invitationId?.trim();
  const tenantId = body.tenantId?.trim();
  if (!invitationId || !tenantId) {
    return new Response(JSON.stringify({ error: 'invitationId and tenantId are required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: tenantRow, error: tenantError } = await supabase
    .from('tenants')
    .select('name')
    .eq('id', tenantId)
    .maybeSingle();

  if (tenantError || !tenantRow) {
    return new Response(JSON.stringify({ error: 'Tenant not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: invRows, error: invError } = await supabase.rpc('resend_invitation', {
    p_invitation_id: invitationId,
  });

  if (invError) {
    return new Response(JSON.stringify({ error: invError.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const row = invRows?.[0];
  const token = row?.token as string | undefined;
  if (!row?.invitation_id || !token || row.tenant_id !== tenantId) {
    return new Response(JSON.stringify({ error: 'Invitation not resent' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const appUrl = (Deno.env.get('APP_URL') ?? 'http://localhost:4200').replace(/\/$/, '');
  const acceptUrl = `${appUrl}/accept-invitation?token=${encodeURIComponent(token)}`;

  const delivery = await sendInvitationEmail({
    to: row.email as string,
    tenantName: tenantRow.name as string,
    acceptUrl,
    expiresAt: row.expires_at as string,
  });

  if (!delivery.sent) {
    return new Response(JSON.stringify({ error: delivery.note, email_sent: false }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(
    JSON.stringify({
      invitation_id: row.invitation_id,
      email: row.email,
      expires_at: row.expires_at,
      tenant_id: row.tenant_id,
      email_sent: true,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
});
