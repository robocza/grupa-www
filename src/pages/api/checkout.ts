import type {APIRoute} from 'astro';
import {getStripe} from '@lib/stripe';
import {getCatalog, itemName} from '@lib/shop';
import {parseOrder, type Order} from '@lib/checkout';
import {SHIPPING, PICKUP_CONTACT} from '@lib/shipping';

// Runs on demand (Netlify Function): validates the cart against the catalog and creates
// a Stripe Checkout Session. Prices always come from the catalog, never from the request.
export const prerender = false;

function json(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {status, headers: {'Content-Type': 'application/json'}});
}

function deliveryMessage({delivery}: Order): string | undefined {
    switch (delivery.method) {
        case 'paczkomat':
            return `Dostawa do Paczkomatu InPost ${delivery.point!.id}${delivery.point!.address ? ` (${delivery.point!.address})` : ''}.`;
        case 'pickup':
            return `Odbiór osobisty w Aptece Designu. Termin umów mailowo: ${PICKUP_CONTACT.email} lub na Instagramie: @${PICKUP_CONTACT.instagram}.`;
        case 'courier':
            return undefined;
    }
}

export const POST: APIRoute = async ({request}) => {
    const stripe = getStripe();
    if (!stripe) {
        console.error('STRIPE_SECRET_KEY is not set');
        return json({error: 'Płatności są chwilowo niedostępne.'}, 503);
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return json({error: 'Nieprawidłowe zamówienie.'}, 400);
    }

    const catalog = await getCatalog();
    const result = parseOrder(body, sku => {
        const entry = catalog.get(sku);

        return entry && {name: itemName(entry), price: entry.variant.price, available: entry.variant.available};
    });
    if ('error' in result) {
        return json({error: result.error}, 400);
    }

    const {order} = result;
    const {method, point} = order.delivery;
    const shipping = SHIPPING[method];
    const metadata: Record<string, string> = {delivery_method: method};
    if (point) {
        metadata.paczkomat_id = point.id;
        metadata.paczkomat_address = point.address;
    }
    const message = deliveryMessage(order);
    const origin = new URL(request.url).origin;

    try {
        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            locale: 'pl',
            currency: 'pln',
            payment_method_types: ['card', 'blik', 'p24'],
            line_items: order.lines.map(line => ({
                quantity: line.qty,
                price_data: {
                    currency: 'pln',
                    unit_amount: line.price,
                    product_data: {name: line.name, metadata: {sku: line.sku}},
                },
            })),
            shipping_options: [{
                shipping_rate_data: {
                    type: 'fixed_amount',
                    display_name: shipping.label,
                    fixed_amount: {amount: shipping.price, currency: 'pln'},
                },
            }],
            // Only the courier needs an address; InPost needs a phone number for lockers.
            shipping_address_collection: method === 'courier' ? {allowed_countries: ['PL']} : undefined,
            phone_number_collection: {enabled: true},
            custom_text: message ? {submit: {message}} : undefined,
            metadata,
            payment_intent_data: {metadata},
            success_url: `${origin}/sklep/dziekujemy?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${origin}/sklep/dostawa/?anulowano`,
        });

        return json({url: session.url});
    } catch (error) {
        console.error('Stripe Checkout Session failed', error);
        return json({error: 'Nie udało się rozpocząć płatności. Spróbuj ponownie.'}, 502);
    }
};
