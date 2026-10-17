import Stripe from 'stripe';

// Server only. Returns null when STRIPE_SECRET_KEY is not set.
export function getStripe(): Stripe | null {
    // process.env on Netlify at runtime; import.meta.env reads .env in dev. Astro replaces
    // import.meta.env values at build time, so outside dev that branch must be dropped or the
    // key would be baked into the function bundle.
    const key = process.env.STRIPE_SECRET_KEY ?? (import.meta.env.DEV ? import.meta.env.STRIPE_SECRET_KEY : undefined);

    return key ? new Stripe(key) : null;
}

export const SESSION_ID = /^cs_(test|live)_[A-Za-z0-9]+$/;
