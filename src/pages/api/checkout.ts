import type {APIRoute} from 'astro';
import {getStripe} from '@lib/stripe';
import {getCatalog, itemName, isVariantAvailable} from '@lib/shop';
import {parseOrder, type Order} from '@lib/checkout';
import {SHIPPING, PICKUP_CONTACT} from '@lib/shipping';

// Runs on demand (Netlify Function): validates the cart against the catalog and creates
// a Stripe Checkout Session. Prices always come from the catalog, never from the request.
export const prerender = false;

function json(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {status, headers: {'Content-Type': 'application/json'}});
}

// Shown below the pay button. The terms and privacy policy links come from the Stripe account's
// public details, shown with the consent checkbox.
const PRIVACY_NOTICE = 'Administratorem danych osobowych podanych w formularzu jest Fundacja Grupa Robocza. '
    + 'Zasady przetwarzania danych oraz Twoje uprawnienia z tym związane opisane są w polityce prywatności.';

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

        return entry && {name: itemName(entry), price: entry.variant.price, available: isVariantAvailable(entry.product, entry.variant)};
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
            // Przelewy24 is paused until the website meets its requirements (PRZELEWY24_PLAN.md).
            payment_method_types: ['card', 'blik'],
            // The admin panel maps order lines by SKU and product slug, never by name. It names
            // products from product_name and variants from the line's description, which is
            // product_data.name: "Name — Label", or just the name for a single-variant product.
            line_items: order.lines.map(line => {
                const {product} = catalog.get(line.sku)!;

                return {
                    quantity: line.quantity,
                    metadata: {
                        sku: line.sku,
                        product: product.slug,
                        product_name: product.data.name,
                    },
                    price_data: {
                        currency: 'pln',
                        unit_amount: line.price,
                        product_data: {name: line.name, metadata: {sku: line.sku}},
                    },
                };
            }),
            shipping_options: [{
                shipping_rate_data: {
                    type: 'fixed_amount',
                    display_name: shipping.label,
                    fixed_amount: {amount: shipping.price, currency: 'pln'},
                    metadata: {code: method},
                },
            }],
            // Only the courier needs a shipping address, and we ship to Poland only.
            shipping_address_collection: method === 'courier' ? {allowed_countries: ['PL']} : undefined,
            billing_address_collection: 'required',
            // The customer's full name is always required, whatever the payment method.
            name_collection: {individual: {enabled: true, optional: false}},
            // InPost needs a phone number for lockers.
            phone_number_collection: {enabled: true},
            // "Purchasing as a business" checkbox with business name and tax ID (NIP).
            tax_id_collection: {enabled: true},
            // Codes are created in the Stripe Dashboard (coupons and promotion codes).
            allow_promotion_codes: true,
            custom_text: {
                submit: message ? {message} : undefined,
                after_submit: {message: PRIVACY_NOTICE},
            },
            // Customers must tick the checkbox accepting the terms (and privacy policy) to pay.
            consent_collection: {terms_of_service: 'required'},
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
