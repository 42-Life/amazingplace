// CHALLENGE ENTRY FEES
// Everything the app needs to charge for entry to a challenge, and to find out
// whether the signed-in user has already paid for one.
//
// The app never decides what anything costs or who has paid. It asks the
// create-entry-payment edge function to start a payment, and reads challenge_entries
// to see the answer Stripe's webhook wrote. Both of those are enforced in the database,
// so the buttons here are a convenience, not the lock.

// KEY IMPORTS
import { supabase } from '@/lib/supabase';
import { fetchMyAccount } from '@/lib/accounts';
import type { ChallengeLocation } from '@/constants/types';

// Reading and writing the amounts themselves lives in src/utils/price.ts, which has no
// imports so the tests can load it on its own.
export { MAX_PRICE_CENTS, MIN_PRICE_CENTS, formatPrice, isValidPriceCents, parsePrice } from '@/utils/price';


// IS THIS CHALLENGE PAID?
export function isPaidChallenge(challenge: Pick<ChallengeLocation, 'price_cents'>): boolean {
    return challenge.price_cents > 0;
}


// ENTRY TYPE
// One row of challenge_entries: this account's payment for this challenge.
export type ChallengeEntry = {
    status: 'pending' | 'paid' | 'failed' | 'refunded'
    amount_cents: number
    currency: string
    paid_at: string | null
}


// FETCH MY ENTRY
// The signed-in user's entry for one challenge, or null if they have never started paying.
// Row level security limits this to their own rows, so there is no account filter to forget.
export async function fetchMyEntry(challengeId: string): Promise<ChallengeEntry | null> {
    const {data, error} = await supabase
        .from('challenge_entries')
        .select('status, amount_cents, currency, paid_at')
        .eq('challenge_id', challengeId)
        .maybeSingle();

    if (error) throw error;
    return (data as ChallengeEntry | null) ?? null;
}


// CAN I ENTER THIS CHALLENGE?
// True for free challenges, for the creator's own challenge, and once the fee is paid.
// This mirrors the database's has_challenge_access function. If the two ever disagree,
// the database wins: it is what actually refuses the submission.
export async function canEnterChallenge(challenge: ChallengeLocation): Promise<boolean> {
    if (!isPaidChallenge(challenge)) return true;

    const account = await fetchMyAccount();
    if (!account) return false;

    // Creators don't pay to enter their own challenge.
    const {data: owned, error: ownedError} = await supabase
        .from('challenges')
        .select('id')
        .eq('id', challenge.id)
        .eq('creator_account_id', account.id)
        .maybeSingle();
    if (ownedError) throw ownedError;
    if (owned) return true;

    const entry = await fetchMyEntry(challenge.id);
    return entry?.status === 'paid';
}


// WHAT THE PAYMENT SHEET NEEDS
// Returned by the create-entry-payment edge function. Every value here is safe to hold
// in the app: the client secrets unlock this one payment and nothing else.
export type EntryPaymentParams = {
    paymentIntentClientSecret: string
    customerSessionClientSecret: string
    customerId: string
    amountCents: number
    currency: string
}


// START A PAYMENT
// Asks the edge function to set up a payment for this challenge.
// Returns null when the function says the fee was already paid, so the caller can
// let the user straight in instead of opening a sheet for nothing.
export async function startEntryPayment(challengeId: string): Promise<EntryPaymentParams | null> {
    const {data, error} = await supabase.functions.invoke('create-entry-payment', {
        body: {challengeId},
    });

    // STEP 1: A failed call can still carry a readable reason in its body
    //   (invoke only gives a generic "non-2xx status code" message otherwise)
    if (error) {
        const detail = await readFunctionError(error);
        throw new Error(detail ?? 'Could not start this payment. Please try again.');
    }

    // STEP 2: Nothing to pay
    if (data?.alreadyPaid) return null;

    // STEP 3: A reply missing either secret can't open the sheet, so stop here
    //   rather than letting the Stripe SDK fail with something cryptic
    if (!data?.paymentIntentClientSecret || !data?.customerSessionClientSecret) {
        throw new Error('Could not start this payment. Please try again.');
    }

    return data as EntryPaymentParams;
}


// Pull the message out of a FunctionsHttpError, whose detail sits in an unread Response.
async function readFunctionError(error: unknown): Promise<string | null> {
    const response = (error as {context?: Response})?.context;
    if (!(response instanceof Response)) return null;
    try {
        const body = await response.json();
        return typeof body?.error === 'string' ? body.error : null;
    } catch {
        return null;
    }
}
