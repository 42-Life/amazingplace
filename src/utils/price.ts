// ENTRY FEE AMOUNTS
// Turning what someone types into an amount, and an amount back into something readable.
// No imports here, so the tests can load this file directly (see tests/price.test.cjs).
//
// Everything is in whole cents, matching challenges.price_cents and Stripe's `amount`.
// Money is never kept as dollars in a float: 0.1 + 0.2 is 0.30000000000000004, and a
// price that drifts by a hundredth of a cent is a price Stripe will reject.

// Mirrors the challenges_price_cents_check constraint in the database.
export const MIN_PRICE_CENTS = 50;      // Stripe rejects USD charges under 0.50
export const MAX_PRICE_CENTS = 100000;  // 1,000.00, a sanity limit of ours rather than a Stripe one


// FORMAT PRICE
// 500 becomes "$5.00". Used on buttons, in the create form, and in error messages.
export function formatPrice(cents: number, currency = 'usd'): string {
    return (cents / 100).toLocaleString(undefined, {
        style: 'currency',
        currency: currency.toUpperCase(),
    });
}


// PARSE PRICE
// Turns what someone typed ("5", "5.50", "$5.50") into cents, or null if it isn't a price.
// Math.round at the end, because 5.1 * 100 is 510.0000000000001 in floating point.
export function parsePrice(text: string): number | null {
    const cleaned = text.trim().replace(/[$,\s]/g, '');
    if (!cleaned) return null;
    if (!/^\d*\.?\d{0,2}$/.test(cleaned)) return null;   // digits, with at most two decimal places
    if (!/\d/.test(cleaned)) return null;                // a lone "." is not an amount
    const amount = Number(cleaned);
    if (!Number.isFinite(amount) || amount < 0) return null;
    return Math.round(amount * 100);
}


// IS THIS A PRICE A CHALLENGE CAN HAVE?
// Free (0) is fine. Anything else has to be a whole number of cents inside the limits above.
export function isValidPriceCents(cents: number): boolean {
    if (!Number.isInteger(cents) || cents < 0) return false;
    if (cents === 0) return true;
    return cents >= MIN_PRICE_CENTS && cents <= MAX_PRICE_CENTS;
}
