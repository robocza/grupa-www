// Delivery methods and prices (grosze). Used by the delivery page and, at checkout, by the
// server, which takes the price from here, not from the browser.

export type DeliveryMethod = 'pickup' | 'paczkomat' | 'courier';

export interface ShippingOption {
    label: string;
    price: number;
}

export const SHIPPING: Record<DeliveryMethod, ShippingOption> = {
    pickup: {label: 'Odbiór osobisty w Aptece Designu', price: 0},
    paczkomat: {label: 'Paczkomat InPost', price: 1800},
    courier: {label: 'Kurier', price: 2000},
};

export const PICKUP_CONTACT = {
    email: 'grupa@robocza.org',
    instagram: 'grupa.robocza',
};

export function isDeliveryMethod(value: unknown): value is DeliveryMethod {
    return typeof value === 'string' && Object.hasOwn(SHIPPING, value);
}

// The delivery chosen on /sklep/dostawa. `point` is set only for Paczkomat.
export interface Delivery {
    method: DeliveryMethod;
    point?: {
        id: string;
        address: string;
    };
}
