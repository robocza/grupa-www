import type {APIRoute} from 'astro';
import type Stripe from 'stripe';
import {getStripe} from '@lib/stripe';
import {sendEmail} from '@lib/mailersend';
import {shopNotification, customerConfirmation} from '@lib/order-email';

// Stripe calls this when an order is paid; it emails the shop and the customer.
// Register it in the Stripe Dashboard (Developers → Webhooks) with the events below; the
// signing secret it shows goes into STRIPE_WEBHOOK_SECRET.
export const prerender = false;

function webhookSecret(): string | undefined {
    // As in stripe.ts: import.meta.env is replaced at build time, so it may only be used in dev.
    return process.env.STRIPE_WEBHOOK_SECRET ?? (import.meta.env.DEV ? import.meta.env.STRIPE_WEBHOOK_SECRET : undefined);
}

// Card and most BLIK payments are paid when the session completes; Przelewy24 can complete
// unpaid and confirm later with async_payment_succeeded.
function paidSessionId(event: Stripe.Event): string | null {
    switch (event.type) {
        case 'checkout.session.completed':
            return event.data.object.payment_status === 'paid' ? event.data.object.id : null;
        case 'checkout.session.async_payment_succeeded':
            return event.data.object.id;
        default:
            return null;
    }
}

export const POST: APIRoute = async ({request}) => {
    const stripe = getStripe();
    const secret = webhookSecret();
    if (!stripe || !secret) {
        console.error('STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET is not set');
        return new Response(null, {status: 500});
    }

    // The signature covers the raw body, so read it as text before parsing.
    let event: Stripe.Event;
    try {
        event = await stripe.webhooks.constructEventAsync(await request.text(), request.headers.get('stripe-signature') ?? '', secret);
    } catch (error) {
        console.warn('Rejected webhook with an invalid signature:', error instanceof Error ? error.message.split('\n')[0] : error);
        return new Response(null, {status: 400});
    }

    const sessionId = paidSessionId(event);
    if (!sessionId) {
        return new Response(null, {status: 200});
    }

    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId, {expand: ['line_items']});
        await sendEmail(shopNotification(session));
        const confirmation = customerConfirmation(session);
        if (confirmation) {
            await sendEmail(confirmation);
        }
    } catch (error) {
        // A non-2xx response makes Stripe retry the event later.
        console.error(`Order emails for ${sessionId} failed`, error);
        return new Response(null, {status: 500});
    }

    return new Response(null, {status: 200});
};
