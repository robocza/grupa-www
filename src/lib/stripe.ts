import Stripe from 'stripe';

// Server only. Returns null when STRIPE_SECRET_KEY is not set.
export function getStripe(): Stripe | null {
    // process.env on Netlify at runtime; import.meta.env reads .env in dev.
    const key = process.env.STRIPE_SECRET_KEY ?? import.meta.env.STRIPE_SECRET_KEY;

    return key ? new Stripe(key) : null;
}

export const SESSION_ID = /^cs_(test|live)_[A-Za-z0-9]+$/;
