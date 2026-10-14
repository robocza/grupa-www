import {isDeliveryMethod, type Delivery} from './shipping';

// Client-side cart kept in localStorage. Only SKUs and quantities are stored; names and
// prices come from /sklep/katalog.json and are checked again at checkout.

export interface CartLine {
    sku: string;
    qty: number;
}

export interface CatalogItem {
    name: string;
    label?: string;
    price: number;
    available: boolean;
    image: string;
    url: string;
}

export type Catalog = Record<string, CatalogItem>;

export const MAX_QTY = 10;

const STORAGE_KEY = 'gr-cart';
const CHANGE_EVENT = 'cart:change';

export function getCart(): CartLine[] {
    try {
        const lines = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');

        return Array.isArray(lines)
            ? lines.filter(line => typeof line?.sku === 'string' && Number.isInteger(line?.qty) && line.qty > 0)
            : [];
    } catch {
        return [];
    }
}

function saveCart(lines: CartLine[]): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
        // Storage unavailable (private mode, blocked): the cart only lasts for this page.
    }
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

function clampQty(qty: number): number {
    return Math.min(MAX_QTY, Math.max(1, Math.floor(qty)));
}

export function addToCart(sku: string, qty = 1): void {
    const lines = getCart();
    const line = lines.find(line => line.sku === sku);

    if (line) {
        line.qty = clampQty(line.qty + qty);
    } else {
        lines.push({sku, qty: clampQty(qty)});
    }
    saveCart(lines);
}

export function setQty(sku: string, qty: number): void {
    saveCart(getCart().map(line => line.sku === sku ? {...line, qty: clampQty(qty)} : line));
}

export function removeFromCart(sku: string): void {
    saveCart(getCart().filter(line => line.sku !== sku));
}

export function clearCart(): void {
    saveCart([]);
}

export function cartCount(): number {
    return getCart().reduce((sum, line) => sum + line.qty, 0);
}

// Calls `callback` when the cart changes in this tab or another one.
export function onCartChange(callback: () => void): void {
    window.addEventListener(CHANGE_EVENT, callback);
    window.addEventListener('storage', event => {
        if (event.key === STORAGE_KEY) {
            callback();
        }
    });
}

export async function fetchCatalog(): Promise<Catalog> {
    const response = await fetch('/sklep/katalog.json');
    if (!response.ok) {
        throw new Error(`Catalog request failed: ${response.status}`);
    }

    return response.json();
}

const DELIVERY_KEY = 'gr-delivery';

export function getDelivery(): Delivery | null {
    try {
        const delivery = JSON.parse(localStorage.getItem(DELIVERY_KEY) ?? 'null');

        return isDeliveryMethod(delivery?.method) ? delivery : null;
    } catch {
        return null;
    }
}

export function saveDelivery(delivery: Delivery): void {
    try {
        localStorage.setItem(DELIVERY_KEY, JSON.stringify(delivery));
    } catch {
        // Storage unavailable: the choice only lasts for this page.
    }
}

// After a completed order.
export function clearDelivery(): void {
    try {
        localStorage.removeItem(DELIVERY_KEY);
    } catch {
        // Storage unavailable: nothing to clear.
    }
}
