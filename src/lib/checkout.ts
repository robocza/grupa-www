import {MAX_QTY} from './cart';
import {isDeliveryMethod, type Delivery} from './shipping';

// Validation of the order the browser sends to /api/checkout. Only SKUs, quantities and
// the delivery choice are taken from the request; names and prices come from the catalog.

export interface CatalogLookupItem {
    name: string;
    price: number;
    available: boolean;
}

export interface OrderLine {
    sku: string;
    name: string;
    price: number;
    qty: number;
}

export interface Order {
    lines: OrderLine[];
    delivery: Delivery;
}

export type ParseResult = {order: Order} | {error: string};

const MAX_LINES = 50;
// InPost point names, e.g. KRA01M or POP-KRA123.
const POINT_ID = /^[A-Z0-9-]{3,20}$/i;
const MAX_ADDRESS_LENGTH = 200;

export function parseOrder(body: unknown, lookup: (sku: string) => CatalogLookupItem | undefined): ParseResult {
    if (typeof body !== 'object' || body === null) {
        return {error: 'Nieprawidłowe zamówienie.'};
    }
    const {items, delivery} = body as {items?: unknown, delivery?: unknown};

    if (!Array.isArray(items) || items.length === 0) {
        return {error: 'Koszyk jest pusty.'};
    }
    if (items.length > MAX_LINES) {
        return {error: 'Za dużo pozycji w koszyku.'};
    }

    const quantities = new Map<string, number>();
    for (const item of items) {
        const {sku, qty} = (item ?? {}) as {sku?: unknown, qty?: unknown};
        if (typeof sku !== 'string' || !Number.isInteger(qty) || (qty as number) < 1) {
            return {error: 'Nieprawidłowe zamówienie.'};
        }
        quantities.set(sku, (quantities.get(sku) ?? 0) + (qty as number));
    }

    const lines: OrderLine[] = [];
    for (const [sku, qty] of quantities) {
        const item = lookup(sku);
        if (!item || !item.available) {
            return {error: 'Niektóre produkty w koszyku są niedostępne. Wróć do koszyka.'};
        }
        if (qty > MAX_QTY) {
            return {error: `Możesz zamówić maksymalnie ${MAX_QTY} szt. jednego produktu.`};
        }
        lines.push({sku, name: item.name, price: item.price, qty});
    }

    const {method, point} = (delivery ?? {}) as {method?: unknown, point?: {id?: unknown, address?: unknown}};
    if (!isDeliveryMethod(method)) {
        return {error: 'Wybierz sposób dostawy.'};
    }
    if (method !== 'paczkomat') {
        return {order: {lines, delivery: {method}}};
    }

    if (typeof point?.id !== 'string' || !POINT_ID.test(point.id)) {
        return {error: 'Wybierz paczkomat.'};
    }
    const address = typeof point.address === 'string' ? point.address.slice(0, MAX_ADDRESS_LENGTH) : '';

    return {order: {lines, delivery: {method, point: {id: point.id.toUpperCase(), address}}}};
}
