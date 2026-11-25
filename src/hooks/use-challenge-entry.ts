// CHALLENGE ENTRY
// Answers one question for the challenge screen: may this person submit to this challenge,
// and if not, what happens when they tap the button?
//
// Free challenges never touch Stripe at all. Paid ones open Stripe's payment sheet, and
// access is granted only after Stripe's webhook has confirmed the money arrived.

import {useCallback, useEffect, useState} from 'react';
import {useStripe} from '@stripe/stripe-react-native';
import type {ChallengeLocation} from '@/constants/types';
import {getEntryAccess, isPaidChallenge, startEntryPayment, type EntryAccess} from '@/lib/payments';
import {MERCHANT_DISPLAY_NAME, STRIPE_SETUP_MESSAGE, isStripeConfigured} from '@/lib/stripe';

// How long to keep asking the database whether the webhook has landed.
// The sheet closes the moment the card is approved, but Stripe's call to our webhook is a
// separate trip over the internet and usually lands a beat later.
const ACCESS_POLL_ATTEMPTS = 8;
const ACCESS_POLL_DELAY_MS = 750;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type ChallengeEntryState = {
    hasAccess: boolean                  // may they submit right now?
    accessReason: EntryAccess | null    // why: 'free', 'creator' (their own challenge) or 'paid'. null = no access yet
    isChecking: boolean                 // still loading the answer
    isPaying: boolean                   // the payment sheet is open or settling
    errorMessage: string | null
    pay: () => Promise<boolean>         // runs the payment; resolves true once they're in
};

export function useChallengeEntry(challenge: ChallengeLocation | null): ChallengeEntryState {
    const {initPaymentSheet, presentPaymentSheet} = useStripe();

    // Why this person may enter a paid challenge ('creator' or 'paid'), or null if they may not.
    //   (Free challenges don't use this: they never need a lookup.)
    const [grantedAccess, setGrantedAccess] = useState<EntryAccess | null>(null);
    const [isPaying, setIsPaying] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Which challenge grantedAccess is the answer for. Comparing it to the challenge on screen
    // is what "still checking" means, so opening a different challenge shows the spinner
    // again without anyone having to set a flag back to true.
    const [checkedChallengeId, setCheckedChallengeId] = useState<string | null>(null);

    // A free challenge needs no lookup at all, so it never waits and never shows a spinner:
    // the button behaves exactly as it did before fees existed.
    const isFree = challenge ? !isPaidChallenge(challenge) : false;
    const isChecking = !challenge || (!isFree && checkedChallengeId !== challenge.id);
    const hasAccess = isFree || grantedAccess !== null;
    const accessReason: EntryAccess | null = isFree ? 'free' : grantedAccess;

    // ON LOAD: find out whether they already have access (and why)
    useEffect(() => {
        // No challenge yet means the screen is still loading one
        if (!challenge || !isPaidChallenge(challenge)) return;

        let isMounted = true;

        (async () => {
            try {
                const access = await getEntryAccess(challenge);
                if (isMounted) setGrantedAccess(access);
            } catch (err) {
                // If we can't tell, assume they haven't paid. Showing the pay button to
                // someone who already paid is recoverable (the edge function says so and
                // lets them in); letting a non-payer through is not.
                console.error('Could not check challenge access:', err);
                if (isMounted) setGrantedAccess(null);
            } finally {
                if (isMounted) setCheckedChallengeId(challenge.id);
            }
        })();

        return () => { isMounted = false; };
    }, [challenge]);

    // PAY TO ENTER
    // Returns true if the user may now submit, false if they cancelled or it failed.
    const pay = useCallback(async (): Promise<boolean> => {
        if (!challenge || isPaying) return false;
        if (!isStripeConfigured) {
            setErrorMessage(STRIPE_SETUP_MESSAGE);
            return false;
        }

        setIsPaying(true);
        setErrorMessage(null);
        try {
            // STEP 1: Ask our edge function to set the payment up.
            //   null means it had already been paid for, so there is nothing to show.
            const params = await startEntryPayment(challenge.id);
            if (!params) {
                setGrantedAccess('paid');
                return true;
            }

            // STEP 2: Build the sheet. allowsDelayedPaymentMethods stays false because
            //   access is immediate: we can't hand someone a challenge now and find out
            //   days later that their bank transfer failed.
            const {error: initError} = await initPaymentSheet({
                merchantDisplayName: MERCHANT_DISPLAY_NAME,
                customerId: params.customerId,
                customerSessionClientSecret: params.customerSessionClientSecret,
                paymentIntentClientSecret: params.paymentIntentClientSecret,
                allowsDelayedPaymentMethods: false,
                returnURL: 'amazingplace://challenge',
            });
            if (initError) throw new Error(initError.message);

            // STEP 3: Show it. This resolves when the sheet closes, either way.
            const {error: sheetError} = await presentPaymentSheet();
            if (sheetError) {
                // Backing out is a normal thing to do, not an error worth shouting about
                if (sheetError.code !== 'Canceled') setErrorMessage(sheetError.message);
                return false;
            }

            // STEP 4: The card went through. Wait for the webhook to write the entry row,
            //   because that row, not the sheet, is what the database checks on submit.
            const access = await waitForAccess(challenge);
            setGrantedAccess(access);
            if (!access) {
                setErrorMessage('Your payment went through. It is taking a moment to confirm — please reopen this challenge shortly.');
            }
            return access !== null;
        } catch (err: any) {
            console.error('Could not pay for challenge entry:', err);
            setErrorMessage(err?.message ?? 'Could not take the payment. Please try again.');
            return false;
        } finally {
            setIsPaying(false);
        }
    }, [challenge, initPaymentSheet, isPaying, presentPaymentSheet]);

    return {hasAccess, accessReason, isChecking, isPaying, errorMessage, pay};
}


// Keep checking for the webhook's entry row for a few seconds before giving up.
// Giving up isn't losing the money: the row still appears, just after this screen stopped looking.
async function waitForAccess(challenge: ChallengeLocation): Promise<EntryAccess | null> {
    for (let attempt = 0; attempt < ACCESS_POLL_ATTEMPTS; attempt++) {
        try {
            const access = await getEntryAccess(challenge);
            if (access) return access;
        } catch (err) {
            console.error('Could not confirm challenge access:', err);
        }
        await wait(ACCESS_POLL_DELAY_MS);
    }
    return null;
}
