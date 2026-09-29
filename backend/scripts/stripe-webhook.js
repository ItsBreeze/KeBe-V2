#!/usr/bin/env node
/**
 * Registers the Stripe webhook Medusa's Stripe provider listens on, and stores
 * its signing secret as STRIPE_WEBHOOK_SECRET on medusa-backend without
 * printing it. Run from backend/, which is linked to the kebe-v2 project, so
 * the key comes from Railway rather than a terminal:
 *
 *   railway run --service medusa-backend node scripts/stripe-webhook.js
 *
 * The endpoint is <backend URL>/hooks/payment/stripe_stripe -- MEDUSA_BACKEND_URL
 * on medusa-backend, else the https domain Railway gives the service -- which is
 * where Medusa routes events for the provider registered with id "stripe"
 * (medusa-config.ts). Safe to re-run: an existing endpoint keeps its secret
 * when Railway already has it and is replaced when it doesn't, because Stripe
 * reveals a secret only when the endpoint is created.
 *
 * The Stripe account is shared with Offhand, whose own endpoint receives these
 * same payment events and ignores them; this one likewise ignores Offhand's.
 */

const { spawnSync } = require('child_process');

// The events @medusajs/payment-stripe acts on.
const EVENTS = [
  'payment_intent.amount_capturable_updated',
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'payment_intent.partially_funded',
];

const key = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_API_KEY || '';
const base = (
  process.env.MEDUSA_BACKEND_URL ||
  (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : '')
).replace(/\/+$/, '');

function formEncode(obj, prefix, out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const name = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === 'object') formEncode(v, name, out);
    else out.append(name, String(v));
  }
  return out;
}

async function stripe(method, path, params) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      ...(params ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body: params ? formEncode(params).toString() : undefined,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Stripe ${path}: ${body.error?.message || res.status}`);
  return body;
}

function setRailwayVariable(name, value) {
  const res = spawnSync('railway', ['variables', '--service', 'medusa-backend', '--set-from-stdin', name], {
    input: value,
    stdio: ['pipe', 'inherit', 'inherit'],
    shell: process.platform === 'win32',
  });
  if (res.status !== 0) throw new Error(`railway could not set ${name} (exit ${res.status})`);
}

(async () => {
  if (!key) {
    console.error('STRIPE_SECRET_KEY is not set on medusa-backend. Add it there first, then run this through `railway run`.');
    process.exit(1);
  }
  if (!/^https:\/\//.test(base)) {
    console.error('No public https address for medusa-backend: set MEDUSA_BACKEND_URL on it (or give it a Railway public domain); the webhook needs it.');
    process.exit(1);
  }
  const url = `${base}/hooks/payment/stripe_stripe`;
  console.log(`Stripe ${key.includes('_live_') ? 'LIVE' : 'test'} mode, for ${url}`);

  try {
    const { data } = await stripe('GET', '/webhook_endpoints?limit=100');
    const existing = data.find((e) => e.url === url);
    if (existing && process.env.STRIPE_WEBHOOK_SECRET) {
      await stripe('POST', `/webhook_endpoints/${existing.id}`, { enabled_events: EVENTS, disabled: 'false' });
      console.log(`Webhook ${existing.id} already registered; its events are up to date.`);
      return;
    }
    if (existing) {
      await stripe('DELETE', `/webhook_endpoints/${existing.id}`);
      console.log(`Replaced webhook ${existing.id}: its secret was not on Railway.`);
    }
    const created = await stripe('POST', '/webhook_endpoints', {
      url,
      enabled_events: EVENTS,
      description: 'KeBe store (Medusa payment-stripe)',
    });
    setRailwayVariable('STRIPE_WEBHOOK_SECRET', created.secret);
    console.log(`Webhook ${created.id} registered; STRIPE_WEBHOOK_SECRET set on medusa-backend.`);
  } catch (err) {
    console.error(`Stopped: ${err.message}`);
    process.exit(1);
  }
})();
