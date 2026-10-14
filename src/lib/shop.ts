import {getCollection, type CollectionEntry} from 'astro:content';

export type Product = CollectionEntry<'products'>;
export type ProductVariant = Product['data']['variants'][number];

// All products, including inactive ones, so a SKU can't be reused while a product is hidden.
// Throws (failing the build) if two products share a SKU, since checkout looks items up by SKU.
export async function getAllProducts(): Promise<Product[]> {
    const products = await getCollection('products');
    const owners = new Map<string, string>();

    for (const product of products) {
        for (const {sku} of product.data.variants) {
            const owner = owners.get(sku);
            if (owner !== undefined) {
                throw new Error(`SKU "${sku}" is used by both "${owner}" and "${product.slug}"`);
            }
            owners.set(sku, product.slug);
        }
    }

    return products;
}

export async function getActiveProducts(): Promise<Product[]> {
    const products = await getAllProducts();

    return products
        .filter(product => product.data.active)
        .sort((a, b) => a.data.order - b.data.order || a.data.name.localeCompare(b.data.name, 'pl'));
}

export function isAvailable(product: Product): boolean {
    return product.data.variants.some(variant => variant.available);
}

// Lowest price among available variants, or among all variants if none are available.
export function minPrice(product: Product): number {
    const available = product.data.variants.filter(variant => variant.available);

    return Math.min(...(available.length ? available : product.data.variants).map(variant => variant.price));
}

export function hasPriceRange(product: Product): boolean {
    return new Set(product.data.variants.map(variant => variant.price)).size > 1;
}

const priceFormat = new Intl.NumberFormat('pl-PL', {style: 'currency', currency: 'PLN'});

// Price in grosze -> "49,00 zł"
export function formatPrice(grosze: number): string {
    return priceFormat.format(grosze / 100);
}
