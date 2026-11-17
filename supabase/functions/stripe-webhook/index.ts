// STRIPE WEBHOOK
// Stripe calls this when a payment finishes. This is the only place an entry becomes 'paid'.
//
// Why not just trust the app? Because the phone can lose signal the moment after the card
// is charged, and the "payment worked" screen would never load. Stripe keeps retrying this
// endpoint until it succeeds, so access is granted even when the app never hears back.
// It also means a user can't fake the success and enter without paying.
//
// This function runs with verify_jwt = false (see supabase/config.toml): Stripe has no
// Supabase login. The signature check below is what proves the request really came from Stripe.

import { corsHeaders, cryptoProvider, jsonResponse, serviceClient, stripe } from '../_shared/stripe.ts';

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
if (!webhookSecret) {
    throw new Error('Missing STRIPE_WEBHOOK_SECRET. Run: supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...');
}

// Revoking access is the same database write whichever way the money went back.
async function revokeEntry(admin: ReturnType<typeof serviceClient>, paymentIntentId: string) {
    const {error} = await admin
        .from('challenge_entries')
        .update({status: 'refunded', paid_at: null})
        .eq('stripe_payment_intent_id', paymentIntentId);
    if (error) throw error;
}

// Stripe sends `payment_intent` as an id string, or as the whole object when expanded.
function paymentIntentIdOf(value: unknown): string | null {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object' && 'id' in value) return String((value as {id: string}).id);
    return null;
}

Deno.serve(async (request: Request) => {
    if (request.method === 'OPTIONS') return new Response('ok', {headers: corsHeaders});
    if (request.method !== 'POST') return jsonResponse({error: 'Use POST.'}, 405);

    // STEP 1: Prove this came from Stripe before believing a word of it.
    //   The signature covers the raw body, so read it as text and don't parse it first.
    const signature = request.headers.get('stripe-signature');
    const body = await request.text();
    if (!signature) return jsonResponse({error: 'Missing signature.'}, 400);

    let event;
    try {
        event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret, undefined, cryptoProvider);
    } catch (error) {
        console.error('Rejected a webhook with a bad signature:', error);
        return jsonResponse({error: 'Invalid signature.'}, 400);
    }

    const admin = serviceClient();

    try {
        switch (event.type) {
            // STEP 2: The money arrived. Let them into the challenge.
            case 'payment_intent.succeeded': {
                const intent = event.data.object;
                const {account_id, challenge_id} = intent.metadata ?? {};

                // upsert, not update: Stripe can deliver this before the app's own response
                // lands, and a retry must not depend on the pending row already existing.
                const {error} = await admin
                    .from('challenge_entries')
                    .upsert({
                        account_id,
                        challenge_id,
                        stripe_payment_intent_id: intent.id,
                        amount_cents: intent.amount,
                        currency: intent.currency,
                        status: 'paid',
                        paid_at: new Date().toISOString(),
                    }, {onConflict: 'account_id,challenge_id'});
                if (error) throw error;
                break;
            }

            // STEP 3: The card was declined. Leave the row so the next attempt reuses it.
            case 'payment_intent.payment_failed': {
                const intent = event.data.object;
                const {error} = await admin
                    .from('challenge_entries')
                    .update({status: 'failed', paid_at: null})
                    .eq('stripe_payment_intent_id', intent.id)
                    .neq('status', 'paid');
                if (error) throw error;
                break;
            }

            // STEP 4: Refunded from the Stripe dashboard. Take access back, otherwise
            //   asking for a refund would be a free way into a paid challenge.
            //   A partial refund still bought entry, so only a full one revokes it.
            case 'charge.refunded': {
                const charge = event.data.object;
                const intentId = paymentIntentIdOf(charge.payment_intent);
                if (intentId && charge.amount_refunded >= charge.amount) await revokeEntry(admin, intentId);
                break;
            }

            // STEP 5: Lost a chargeback, so the money is gone the same way. Access goes too.
            case 'charge.dispute.closed': {
                const dispute = event.data.object;
                const intentId = paymentIntentIdOf(dispute.payment_intent);
                if (intentId && dispute.status === 'lost') await revokeEntry(admin, intentId);
                break;
            }

            default:
                // Everything else is noise we haven't opted into. Say OK so Stripe stops retrying.
                break;
        }
    } catch (error) {
        // A 500 tells Stripe to try again later, which is what we want when the database
        // is briefly unreachable: the payment is real and the entry still needs recording.
        console.error(`Failed to handle ${event.type}:`, error);
        return jsonResponse({error: 'Could not record this event.'}, 500);
    }

    return jsonResponse({received: true});
});
