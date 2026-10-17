import type Stripe from 'stripe';
import type {Email, EmailAddress} from './mailersend';
import {formatPrice} from './price';
import {SHIPPING, PICKUP_CONTACT, isDeliveryMethod} from './shipping';

// Emails sent when an order is paid: a notification to the shop and a confirmation to the
// customer. Both are built from the Stripe Checkout Session (with `line_items` expanded).

export const SHOP_EMAIL: EmailAddress = {email: 'sklep@robocza.org', name: 'Grupa Robocza — sklep'};

// Emails are in Polish, like the shop.
const LOCALE = 'pl';

interface Row {
    label: string;
    detail?: string;
    amount: string;
}

function escapeHtml(value: string): string {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
}

function formatAddress(address: Stripe.Address | null | undefined): string | undefined {
    if (!address) {
        return undefined;
    }
    const city = [address.postal_code, address.city].filter(Boolean).join(' ');
    const country = address.country && address.country !== 'PL' ? address.country : undefined;

    return [address.line1, address.line2, city, country].filter(Boolean).join(', ') || undefined;
}

// What the customer is told about receiving the order.
function deliveryDetail(session: Stripe.Checkout.Session): string | undefined {
    const metadata = session.metadata ?? {};
    switch (metadata.delivery_method) {
        case 'paczkomat':
            return [metadata.paczkomat_id, metadata.paczkomat_address].filter(Boolean).join(', ');
        case 'courier': {
            const shipping = session.collected_information?.shipping_details;

            return [shipping?.name, formatAddress(shipping?.address)].filter(Boolean).join(', ') || undefined;
        }
        case 'pickup':
            return `Termin odbioru umów mailowo: ${PICKUP_CONTACT.email} lub na Instagramie: @${PICKUP_CONTACT.instagram}.`;
        default:
            return undefined;
    }
}

// Items, delivery, discount and total, as shown on the confirmation page.
function orderRows(session: Stripe.Checkout.Session): {rows: Row[], total: string} {
    const rows: Row[] = (session.line_items?.data ?? []).map(line => ({
        label: `${line.description} × ${line.quantity}`,
        amount: formatPrice(line.amount_subtotal, LOCALE),
    }));

    const method = session.metadata?.delivery_method;
    if (isDeliveryMethod(method)) {
        rows.push({
            label: SHIPPING[method].label,
            detail: deliveryDetail(session),
            amount: formatPrice(session.shipping_cost?.amount_subtotal ?? 0, LOCALE),
        });
    }

    const discount = session.total_details?.amount_discount ?? 0;
    if (discount > 0) {
        rows.push({label: 'Rabat', amount: `−${formatPrice(discount, LOCALE)}`});
    }

    return {rows, total: formatPrice(session.amount_total ?? 0, LOCALE)};
}

function rowsHtml(rows: Row[], total: string): string {
    const cell = 'padding:6px 0;border-bottom:1px solid #000;vertical-align:top';
    const body = rows.map(row => `
        <tr>
            <td style="${cell}">${escapeHtml(row.label)}${row.detail ? `<br><small>${escapeHtml(row.detail)}</small>` : ''}</td>
            <td style="${cell};text-align:right;white-space:nowrap">${escapeHtml(row.amount)}</td>
        </tr>`).join('');

    return `<table style="border-collapse:collapse;width:100%;max-width:600px">${body}
        <tr>
            <td style="padding:6px 0"><strong>Razem</strong></td>
            <td style="padding:6px 0;text-align:right;white-space:nowrap"><strong>${escapeHtml(total)}</strong></td>
        </tr>
    </table>`;
}

function rowsText(rows: Row[], total: string): string {
    return [
        ...rows.map(row => `- ${row.label}: ${row.amount}${row.detail ? `\n  ${row.detail}` : ''}`),
        `Razem: ${total}`,
    ].join('\n');
}

function page(content: string): string {
    return `<!DOCTYPE html><html lang="pl"><body style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#000">${content}</body></html>`;
}

function dashboardUrl(session: Stripe.Checkout.Session): string {
    const paymentIntent = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;

    return `https://dashboard.stripe.com/${session.livemode ? '' : 'test/'}payments/${paymentIntent ?? ''}`;
}

export function shopNotification(session: Stripe.Checkout.Session): Email {
    const {rows, total} = orderRows(session);
    const customer = session.customer_details;
    const taxIds = (customer?.tax_ids ?? []).map(taxId => taxId.value).join(', ');
    const customerFields: [string, string | null | undefined][] = [
        ['Imię i nazwisko', customer?.individual_name ?? customer?.name],
        ['Firma', customer?.business_name],
        ['NIP', taxIds],
        ['E-mail', customer?.email],
        ['Telefon', customer?.phone],
        ['Adres rozliczeniowy', formatAddress(customer?.address)],
    ];
    const filledFields = customerFields.filter((field): field is [string, string] => Boolean(field[1]));
    const delivery = isDeliveryMethod(session.metadata?.delivery_method) ? SHIPPING[session.metadata.delivery_method].label : 'nieznana dostawa';
    const testPrefix = session.livemode ? '' : '[TEST] ';

    return {
        from: SHOP_EMAIL,
        to: [SHOP_EMAIL],
        replyTo: customer?.email ? {email: customer.email, name: customer.name ?? undefined} : undefined,
        subject: `${testPrefix}Nowe zamówienie: ${total}, ${delivery}`,
        html: page(`
            <h1 style="font-size:20px">${escapeHtml(testPrefix)}Nowe zamówienie</h1>
            ${rowsHtml(rows, total)}
            <h2 style="font-size:17px;margin-top:24px">Klient</h2>
            <p>${filledFields.map(([label, value]) => `${escapeHtml(label)}: ${escapeHtml(value)}`).join('<br>')}</p>
            <p><a href="${escapeHtml(dashboardUrl(session))}">Płatność w Stripe</a></p>`),
        text: [
            `${testPrefix}Nowe zamówienie`,
            '',
            rowsText(rows, total),
            '',
            'Klient:',
            ...filledFields.map(([label, value]) => `${label}: ${value}`),
            '',
            `Płatność w Stripe: ${dashboardUrl(session)}`,
        ].join('\n'),
    };
}

// Null when Stripe has no customer email (it is always collected, so this shouldn't happen).
export function customerConfirmation(session: Stripe.Checkout.Session): Email | null {
    const customer = session.customer_details;
    if (!customer?.email) {
        return null;
    }

    const {rows, total} = orderRows(session);
    // Only sent for paid orders (see /api/stripe-webhook).
    const intro = 'Dziękujemy za zamówienie! Płatność została przyjęta. Przygotowujemy Twoje zamówienie i wyślemy je najszybciej jak potrafimy.';
    const name = customer.individual_name ?? customer.name ?? undefined;

    return {
        from: SHOP_EMAIL,
        to: [{email: customer.email, name}],
        replyTo: SHOP_EMAIL,
        subject: 'Potwierdzenie zamówienia — Grupa Robocza',
        html: page(`
            <p>${escapeHtml(intro)}</p>
            ${rowsHtml(rows, total)}
            <p style="margin-top:24px">Masz pytania? Odpowiedz na tę wiadomość.</p>
            <p>Grupa Robocza</p>`),
        text: [intro, '', rowsText(rows, total), '', 'Masz pytania? Odpowiedz na tę wiadomość.', '', 'Grupa Robocza'].join('\n'),
    };
}
