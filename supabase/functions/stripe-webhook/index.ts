import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'https://esm.sh/stripe@14?target=denonext';
import {
  adminClient,
  jsonResponse,
  mapStripeInvoiceStatus,
  mapStripeSubscriptionStatus,
} from '../_shared/billing.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-11-20',
  httpClient: Stripe.createFetchHttpClient(),
});
const cryptoProvider = Stripe.createSubtleCryptoProvider();

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const signature = req.headers.get('Stripe-Signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SIGNING_SECRET');
  if (!signature || !webhookSecret) {
    return jsonResponse({ error: 'Webhook misconfigured' }, 500);
  }

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid signature';
    console.error('stripe signature failed', message);
    return new Response(message, { status: 400 });
  }

  const admin = adminClient();

  // Idempotency: skip if we already processed this event id.
  const { error: insertErr } = await admin.from('billing_webhook_events').insert({
    provider: 'stripe',
    event_id: event.id,
    event_type: event.type,
    payload: event.data.object as unknown as Record<string, unknown>,
  });
  if (insertErr) {
    if (insertErr.code === '23505') {
      return jsonResponse({ ok: true, duplicate: true });
    }
    console.error('idempotency insert failed', insertErr);
    return jsonResponse({ error: insertErr.message }, 500);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await onCheckoutCompleted(admin, event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await onSubscriptionUpsert(admin, event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await onSubscriptionDeleted(admin, event.data.object as Stripe.Subscription);
        break;
      case 'invoice.paid':
      case 'invoice.finalized':
      case 'invoice.payment_failed':
      case 'invoice.voided':
        await onInvoice(admin, event.data.object as Stripe.Invoice);
        break;
      default:
        break;
    }
  } catch (err) {
    console.error('webhook handler error', event.type, err);
    // Delete idempotency row so Stripe can retry? Prefer keep + 500 so Stripe retries
    // but then duplicate insert blocks retry. Delete on failure:
    await admin
      .from('billing_webhook_events')
      .delete()
      .eq('provider', 'stripe')
      .eq('event_id', event.id);
    const message = err instanceof Error ? err.message : 'handler failed';
    return jsonResponse({ error: message }, 500);
  }

  return jsonResponse({ ok: true });
});

type Admin = ReturnType<typeof adminClient>;

async function resolveTenantId(params: {
  metadataTenantId?: string | null;
  customerId?: string | null;
  subscriptionId?: string | null;
  admin: Admin;
}): Promise<string | null> {
  if (params.metadataTenantId) return params.metadataTenantId;

  if (params.subscriptionId) {
    const { data } = await params.admin
      .from('subscriptions')
      .select('tenant_id')
      .eq('provider', 'stripe')
      .eq('provider_subscription_id', params.subscriptionId)
      .maybeSingle();
    if (data?.tenant_id) return data.tenant_id;
  }

  if (params.customerId) {
    const { data } = await params.admin
      .from('subscriptions')
      .select('tenant_id')
      .eq('provider', 'stripe')
      .eq('billing_customer_id', params.customerId)
      .maybeSingle();
    if (data?.tenant_id) return data.tenant_id;
  }

  return null;
}

async function resolvePlanId(
  admin: Admin,
  priceId: string | null | undefined,
  metadataPlanId?: string | null
): Promise<string | null> {
  if (metadataPlanId) return metadataPlanId;
  if (!priceId) return null;
  const { data } = await admin
    .from('plans')
    .select('id')
    .eq('provider_price_id', priceId)
    .maybeSingle();
  return data?.id ?? null;
}

async function onCheckoutCompleted(admin: Admin, session: Stripe.Checkout.Session) {
  if (session.mode !== 'subscription') return;
  const tenantId = session.metadata?.tenant_id ?? null;
  const planId = session.metadata?.plan_id ?? null;
  const customerId =
    typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null;
  const subscriptionId =
    typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id ?? null;

  if (!tenantId || !customerId) {
    console.warn('checkout.session.completed missing tenant/customer', session.id);
    return;
  }

  const patch: Record<string, unknown> = {
    provider: 'stripe',
    billing_customer_id: customerId,
  };
  if (subscriptionId) patch.provider_subscription_id = subscriptionId;
  if (planId) {
    patch.plan_id = planId;
    patch.status = 'active';
  }

  const { error } = await admin.from('subscriptions').update(patch).eq('tenant_id', tenantId);
  if (error) throw error;
}

async function onSubscriptionUpsert(admin: Admin, sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  const priceId = sub.items.data[0]?.price?.id ?? null;
  const tenantId = await resolveTenantId({
    metadataTenantId: sub.metadata?.tenant_id,
    customerId,
    subscriptionId: sub.id,
    admin,
  });
  if (!tenantId) {
    console.warn('subscription event without tenant', sub.id);
    return;
  }

  const planId = await resolvePlanId(admin, priceId, sub.metadata?.plan_id);
  const status = mapStripeSubscriptionStatus(sub.status);

  const patch: Record<string, unknown> = {
    provider: 'stripe',
    billing_customer_id: customerId,
    provider_subscription_id: sub.id,
    status,
    current_period_end: sub.current_period_end
      ? new Date(sub.current_period_end * 1000).toISOString()
      : null,
    canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
  };
  if (planId) patch.plan_id = planId;

  const { error } = await admin.from('subscriptions').update(patch).eq('tenant_id', tenantId);
  if (error) throw error;
}

async function onSubscriptionDeleted(admin: Admin, sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  const tenantId = await resolveTenantId({
    metadataTenantId: sub.metadata?.tenant_id,
    customerId,
    subscriptionId: sub.id,
    admin,
  });
  if (!tenantId) return;

  const { error } = await admin
    .from('subscriptions')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
      current_period_end: sub.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString()
        : null,
    })
    .eq('tenant_id', tenantId);
  if (error) throw error;
}

async function onInvoice(admin: Admin, invoice: Stripe.Invoice) {
  const customerId =
    typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id ?? null;
  const subscriptionId =
    typeof invoice.subscription === 'string'
      ? invoice.subscription
      : invoice.subscription?.id ?? null;

  const tenantId = await resolveTenantId({
    metadataTenantId: invoice.metadata?.tenant_id,
    customerId,
    subscriptionId,
    admin,
  });
  if (!tenantId) {
    console.warn('invoice without tenant', invoice.id);
    return;
  }

  const row = {
    tenant_id: tenantId,
    provider: 'stripe',
    provider_invoice_id: invoice.id,
    amount_cents: invoice.amount_due ?? invoice.amount_paid ?? 0,
    currency: (invoice.currency ?? 'usd').toLowerCase(),
    status: mapStripeInvoiceStatus(invoice.status),
    period_start: invoice.period_start
      ? new Date(invoice.period_start * 1000).toISOString()
      : null,
    period_end: invoice.period_end
      ? new Date(invoice.period_end * 1000).toISOString()
      : null,
    hosted_invoice_url: invoice.hosted_invoice_url,
    invoice_pdf_url: invoice.invoice_pdf,
    issued_at: invoice.created ? new Date(invoice.created * 1000).toISOString() : null,
    paid_at: invoice.status_transitions?.paid_at
      ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
      : null,
  };

  const { error } = await admin.from('invoices').upsert(row, {
    onConflict: 'provider,provider_invoice_id',
  });
  // Unique index is partial — upsert onConflict may need constraint name.
  // Fallback: try update then insert.
  if (error) {
    const { data: existing } = await admin
      .from('invoices')
      .select('id')
      .eq('provider', 'stripe')
      .eq('provider_invoice_id', invoice.id)
      .maybeSingle();
    if (existing?.id) {
      const { error: updErr } = await admin.from('invoices').update(row).eq('id', existing.id);
      if (updErr) throw updErr;
    } else {
      const { error: insErr } = await admin.from('invoices').insert(row);
      if (insErr) throw insErr;
    }
  }
}
