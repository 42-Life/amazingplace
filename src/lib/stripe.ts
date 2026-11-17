// STRIPE CONFIG
// The publishable key is the only Stripe key the app is allowed to hold. It can start
// payments and nothing else, so shipping it inside the app is fine and expected.
// The secret key lives in the edge functions; if you ever find an sk_ or rk_ key in src/,
// it is in the wrong place and needs rolling in the Stripe dashboard.

// Read from .env.local, the same way the Supabase keys are. EXPO_PUBLIC_ is what makes
// the value visible to the app at build time.
export const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

// Contributors who haven't set a key still get a working app: free challenges behave
// exactly as before, and only the paid path stops with the message below. A missing
// key is not worth bricking the whole app over the way a missing Supabase URL is.
export const isStripeConfigured = STRIPE_PUBLISHABLE_KEY.startsWith('pk_');

export const STRIPE_SETUP_MESSAGE =
    'Payments are not set up on this build. Add EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY to .env.local and restart the dev server.';

// Sends the user back to the app after a payment method that leaves it, such as a bank
// redirect or a 3D Secure check. Must match "scheme" in app.json.
export const STRIPE_URL_SCHEME = 'amazingplace';

// Shown at the top of the payment sheet, so people recognise the charge on their statement.
export const MERCHANT_DISPLAY_NAME = 'Amazing Place';
