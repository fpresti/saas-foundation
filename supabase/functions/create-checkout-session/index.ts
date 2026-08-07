import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'https://esm.sh/stripe@14?target=denonext';
import { adminClient, corsHeaders, jsonResponse, userClient } from '../_shared/billing.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-11-20',
  httpClient: Stripe.createFetchHttpClient(),
});

type Body = {
  tenantId?: string;
  planId?: string;
  successUrl?: string;
  cancelUrl?: string;
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
  const planId = body.planId?.trim();
  const successUrl = body.successUrl?.trim();
  const cancelUrl = body.cancelUrl?.trim();
  if (!tenantId || !planId || !successUrl || !cancelUrl) {
    return jsonResponse(
      { error: 'tenantId, planId, successUrl, and cancelUrl are required' },
      400
    );
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
  const { data: plan, error: planErr } = await admin
    .from('plans')
    .select('id, name, provider_price_id')
    .eq('id', planId)
    .maybeSingle();
  if (planErr) return jsonResponse({ error: planErr.message }, 400);
  if (!plan) return jsonResponse({ error: 'Plan not found' }, 404);
  if (!plan.provider_price_id) {
    return jsonResponse(
      {
        error: 'Plan has no provider_price_id; use change_tenant_plan for free/manual plans',
        code: 'NO_PROVIDER_PRICE',
      },
      400
    );
  }

  const { data: sub, error: subErr } = await admin
    .from('subscriptions')
    .select('billing_customer_id, provider')
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (subErr) return jsonResponse({ error: subErr.message }, 400);
  if (!sub) return jsonResponse({ error: 'Subscription not found' }, 404);

  let customerId = sub.billing_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { tenant_id: tenantId, supabase_user_id: user.id },
    });
    customerId = customer.id;
    const { error: linkErr } = await admin
      .from('subscriptions')
      .update({ provider: 'stripe', billing_customer_id: customerId })
      .eq('tenant_id', tenantId);
    if (linkErr) return jsonResponse({ error: linkErr.message }, 500);
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: plan.provider_price_id, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: tenantId,
    metadata: { tenant_id: tenantId, plan_id: planId },
    subscription_data: {
      metadata: { tenant_id: tenantId, plan_id: planId },
    },
  });

  return jsonResponse({ url: session.url, sessionId: session.id });
});
