import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'https://esm.sh/stripe@14?target=denonext';
import { adminClient, corsHeaders, jsonResponse, userClient } from '../_shared/billing.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-11-20',
  httpClient: Stripe.createFetchHttpClient(),
});

type Body = {
  tenantId?: string;
  returnUrl?: string;
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return jsonResponse({ error: 'Unauthorized' }, 401);

  if (!Deno.env.get('STRIPE_SECRET_KEY')) {
    return jsonResponse({ error: 'Stripe is not configured' }, 503);
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const tenantId = body.tenantId?.trim();
  const returnUrl = body.returnUrl?.trim();
  if (!tenantId || !returnUrl) {
    return jsonResponse({ error: 'tenantId and returnUrl are required' }, 400);
  }

  const supabase = userClient(authHeader);
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) return jsonResponse({ error: 'Unauthorized' }, 401);

  const { data: isOwner, error: ownerErr } = await supabase.rpc('is_tenant_owner', {
    p_tenant_id: tenantId,
  });
  const { data: isSa } = await supabase.rpc('is_super_admin');
  if (ownerErr) return jsonResponse({ error: ownerErr.message }, 400);
  if (!isOwner && !isSa) return jsonResponse({ error: 'Not allowed' }, 403);

  const admin = adminClient();
  const { data: sub, error: subErr } = await admin
    .from('subscriptions')
    .select('billing_customer_id')
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (subErr) return jsonResponse({ error: subErr.message }, 400);
  if (!sub?.billing_customer_id) {
    return jsonResponse(
      { error: 'No billing customer yet; complete checkout first', code: 'NO_CUSTOMER' },
      400
    );
  }

  const portal = await stripe.billingPortal.sessions.create({
    customer: sub.billing_customer_id,
    return_url: returnUrl,
  });

  return jsonResponse({ url: portal.url });
});
