// CREATE ENTRY PAYMENT
// Called by the app when someone taps "Pay 5.00 to enter" on a paid challenge.
// Returns everything the Stripe payment sheet needs to open.
//
// The app may not create any of this itself: a PaymentIntent is made with the secret key,
// and if that key were in the app, anyone could decompile it and charge cards as us.
// The app also never says how much to charge — the price is read from the database here,
// so a tampered request can't buy a 20.00 challenge for 0.50.

import { corsHeaders, jsonResponse, serviceClient, stripe } from '../_shared/stripe.ts';
import { createClient } from 'npm:@supabase/supabase-js@^2.118.0';

// A PaymentIntent in one of these states is still waiting for a card, so a user who
// backed out of the sheet and came back can be handed the same one instead of a second.
const REUSABLE_INTENT_STATUSES = ['requires_payment_method', 'requires_confirmation', 'requires_action'];

Deno.serve(async (request: Request) => {
    // STEP 0: Answer the browser's preflight check (the Expo web build is a real website)
    if (request.method === 'OPTIONS') return new Response('ok', {headers: corsHeaders});
    if (request.method !== 'POST') return jsonResponse({error: 'Use POST.'}, 405);

    try {
        // STEP 1: Work out who is asking.
        //   The app sends its Supabase login token; this asks Supabase who that token belongs to.
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) return jsonResponse({error: 'Please sign in first.'}, 401);

        const userClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            {global: {headers: {Authorization: authHeader}}, auth: {persistSession: false}},
        );
        const {data: {user}, error: userError} = await userClient.auth.getUser();
        if (userError || !user) return jsonResponse({error: 'Please sign in first.'}, 401);

        // STEP 2: Read the request
        const {challengeId} = await request.json().catch(() => ({challengeId: null}));
        if (typeof challengeId !== 'string' || !challengeId) {
            return jsonResponse({error: 'Which challenge?'}, 400);
        }

        // From here on use the service role: it can read and write the tables the app can't.
        const admin = serviceClient();

        // STEP 3: Find the caller's accounts row (everything else links to accounts.id)
        const {data: account, error: accountError} = await admin
            .from('accounts')
            .select('id, username')
            .eq('auth_user_id', user.id)
            .maybeSingle();
        if (accountError) throw accountError;
        if (!account) return jsonResponse({error: 'No account found for this login.'}, 403);

        // STEP 4: Read the challenge, and take the price from here rather than from the request
        const {data: challenge, error: challengeError} = await admin
            .from('challenges')
            .select('id, title, price_cents, creator_account_id')
            .eq('id', challengeId)
            .maybeSingle();
        if (challengeError) throw challengeError;
        if (!challenge) return jsonResponse({error: 'That challenge no longer exists.'}, 404);

        // STEP 5: Reasons there is nothing to pay for
        if (challenge.price_cents === 0) return jsonResponse({error: 'This challenge is free to enter.'}, 400);
        if (challenge.creator_account_id === account.id) return jsonResponse({error: 'You created this challenge.'}, 400);

        // STEP 5b: Entries are only accepted during the entry phase, so that is the only time
        //   there is anything worth buying. Ask the database rather than working the date out
        //   here: challenge_phase is the same function the submissions policy uses, so paying
        //   and submitting can never disagree. It also settles the time zone — the database
        //   counts days in America/New_York, while a date made here would be in UTC and would
        //   roll over to tomorrow at 7pm on the challenge's last evening.
        const {data: phase, error: phaseError} = await admin.rpc('challenge_phase', {p_challenge_id: challenge.id});
        if (phaseError) throw phaseError;
        if (phase !== 'entry') {
            const reason = phase === 'upcoming' ? 'This challenge has not opened for entries yet.'
                : phase === 'voting' ? 'Entries have closed for this challenge.'
                : 'This challenge is over.';
            return jsonResponse({error: reason}, 400);
        }

        // STEP 6: Already paid? Say so instead of charging twice.
        const {data: existingEntry, error: entryError} = await admin
            .from('challenge_entries')
            .select('id, status, stripe_payment_intent_id, amount_cents')
            .eq('account_id', account.id)
            .eq('challenge_id', challenge.id)
            .maybeSingle();
        if (entryError) throw entryError;
        if (existingEntry?.status === 'paid') return jsonResponse({alreadyPaid: true});

        // STEP 7: Find or create this account's Stripe customer, so a returning payer
        //   sees the card they used last time rather than typing it in again
        const {data: savedCustomer, error: customerLookupError} = await admin
            .from('stripe_customers')
            .select('stripe_customer_id')
            .eq('account_id', account.id)
            .maybeSingle();
        if (customerLookupError) throw customerLookupError;

        let customerId = savedCustomer?.stripe_customer_id;
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email ?? undefined,
                name: account.username ?? undefined,
                metadata: {account_id: account.id},
            });
            customerId = customer.id;
            const {error: saveCustomerError} = await admin
                .from('stripe_customers')
                .insert({account_id: account.id, stripe_customer_id: customerId});
            if (saveCustomerError) throw saveCustomerError;
        }

        // STEP 8: A CustomerSession lets the payment sheet show and manage that customer's
        //   saved cards. The app can't be trusted with the customer directly, so this is
        //   a short-lived, scoped pass instead.
        const customerSession = await stripe.customerSessions.create({
            customer: customerId,
            components: {
                mobile_payment_element: {
                    enabled: true,
                    features: {
                        payment_method_save: 'enabled',
                        payment_method_redisplay: 'enabled',
                        payment_method_remove: 'enabled',
                    },
                },
            },
        });

        // STEP 9: Reuse the PaymentIntent from an abandoned attempt when it still fits,
        //   so backing out of the sheet and trying again doesn't scatter half-finished
        //   payments across the Stripe dashboard.
        let paymentIntent = null;
        if (existingEntry?.stripe_payment_intent_id) {
            const previous = await stripe.paymentIntents
                .retrieve(existingEntry.stripe_payment_intent_id)
                .catch(() => null);
            if (previous
                && REUSABLE_INTENT_STATUSES.includes(previous.status)
                && previous.amount === challenge.price_cents
                && previous.customer === customerId) {
                paymentIntent = previous;
            }
        }

        // STEP 10: Otherwise create one.
        //   No payment_method_types here on purpose: leaving it off lets Stripe pick the
        //   methods most likely to work for this buyer, set from the Stripe dashboard.
        if (!paymentIntent) {
            paymentIntent = await stripe.paymentIntents.create({
                amount: challenge.price_cents,
                currency: 'usd',
                customer: customerId,
                description: `Entry fee: ${challenge.title}`,
                // The webhook reads these to know whose entry to mark paid
                metadata: {account_id: account.id, challenge_id: challenge.id},
            });
        }

        // STEP 11: Record the attempt as pending. The webhook, not the app, turns it into 'paid'.
        //   Never write over a row that is already 'paid'. The webhook can land at any moment,
        //   including between step 6 reading this row and this write — and a 'paid' row is the
        //   record of real money, so turning it back into 'pending' would lock someone out of
        //   what they just bought. Both branches below hand that case straight back as paid.
        const attempt = {
            account_id: account.id,
            challenge_id: challenge.id,
            stripe_payment_intent_id: paymentIntent.id,
            amount_cents: challenge.price_cents,
            currency: 'usd',
            status: 'pending',
            paid_at: null,
        };

        if (existingEntry) {
            //   neq('status', 'paid'): the update matches nothing if the webhook got there first
            const {data: updated, error: updateError} = await admin
                .from('challenge_entries')
                .update(attempt)
                .eq('id', existingEntry.id)
                .neq('status', 'paid')
                .select('id')
                .maybeSingle();
            if (updateError) throw updateError;
            if (!updated) return jsonResponse({alreadyPaid: true});
        } else {
            const {error: insertError} = await admin.from('challenge_entries').insert(attempt);
            //   23505 means the webhook inserted the row in the moment since step 6 looked.
            //   Read it back rather than assuming which of the two states it is in.
            if (insertError?.code === '23505') {
                const {data: raced, error: rereadError} = await admin
                    .from('challenge_entries')
                    .select('status')
                    .eq('account_id', account.id)
                    .eq('challenge_id', challenge.id)
                    .maybeSingle();
                if (rereadError) throw rereadError;
                if (raced?.status === 'paid') return jsonResponse({alreadyPaid: true});
            } else if (insertError) {
                throw insertError;
            }
        }

        // STEP 12: Hand the app what the payment sheet needs. These are all client-safe:
        //   the client secret only unlocks this one payment, and the session expires.
        return jsonResponse({
            paymentIntentClientSecret: paymentIntent.client_secret,
            customerSessionClientSecret: customerSession.client_secret,
            customerId,
            amountCents: challenge.price_cents,
            currency: 'usd',
        });
    } catch (error) {
        // Log for us, stay vague for the caller: Stripe errors can carry details
        // about the account that a stranger holding a login token shouldn't see.
        console.error('create-entry-payment failed:', error);
        return jsonResponse({error: 'Could not start this payment. Please try again.'}, 500);
    }
});
