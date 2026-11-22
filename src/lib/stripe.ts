import Stripe from 'stripe';

// The Stripe API version of every request, which decides the shape of every response. It is pinned so that an SDK
// update does not change it unnoticed. The admin panel (administracja) uses the same version; change both together,
// after checking Stripe's changelog for the fields we read and send. The type only accepts the SDK's own version, so
// updating the SDK to one with a newer version fails the type check until this is updated too.
export const STRIPE_API_VERSION = '2026-11-18.endive';

// Server only. Returns null when STRIPE_SECRET_KEY is not set.
export function getStripe(): Stripe | null {
    // process.env on Netlify at runtime; import.meta.env reads .env in dev. Astro replaces
    // import.meta.env values at build time, so outside dev that branch must be dropped or the
    // key would be baked into the function bundle.
    const key = process.env.STRIPE_SECRET_KEY ?? (import.meta.env.DEV ? import.meta.env.STRIPE_SECRET_KEY : undefined);

    return key ? new Stripe(key, {apiVersion: STRIPE_API_VERSION}) : null;
}

export const SESSION_ID = /^cs_(test|live)_[A-Za-z0-9]+$/;
