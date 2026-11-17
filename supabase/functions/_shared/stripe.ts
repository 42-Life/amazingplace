// SHARED EDGE FUNCTION SETUP
// These run on Supabase's Deno runtime, not in the app. Nothing here ships to phones,
// which is why the Stripe secret key may be read here and nowhere else.

import Stripe from 'npm:stripe@^23.0.0';
import { createClient } from 'npm:@supabase/supabase-js@^2.118.0';

// The Stripe secret key is set with `supabase secrets set`, never committed.
// Failing loudly on boot beats a confusing 500 on someone's first payment.
const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
if (!stripeSecretKey) {
    throw new Error('Missing STRIPE_SECRET_KEY. Run: supabase secrets set STRIPE_SECRET_KEY=rk_test_...');
}

// createFetchHttpClient: Deno has fetch but not Node's http module, which the SDK uses by default.
// apiVersion is pinned so a new Stripe release can't change what these functions receive
// behind our backs. It has to match the version this SDK release was built against.
export const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2026-10-28.endive',
    httpClient: Stripe.createFetchHttpClient(),
});

// Webhook signature checking needs the browser-style SubtleCrypto API for the same reason:
// Deno has no Node crypto module. Only the webhook function uses this.
export const cryptoProvider = Stripe.createSubtleCryptoProvider();

// The service role key bypasses row level security, which is how these functions can write
// challenge_entries rows that no user is allowed to write. Supabase injects both of these.
export function serviceClient() {
    return createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        {auth: {persistSession: false, autoRefreshToken: false}},
    );
}

// The Expo web build calls these functions from a browser, so preflight requests need an answer.
export const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: {...corsHeaders, 'Content-Type': 'application/json'},
    });
}
