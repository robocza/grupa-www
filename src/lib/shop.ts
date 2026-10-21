import {getCollection, type CollectionEntry} from 'astro:content';

export {formatPrice} from './price';

export type Product = CollectionEntry<'products'>;
export type ProductVariant = Product['data']['variants'][number];

// All products, including inactive ones, so a SKU can't be reused while a product is hidden.
// Throws (failing the build) if two products share a SKU, since checkout looks items up by SKU.
const MAX_SLUG_LENGTH = 100;

export async function getAllProducts(): Promise<Product[]> {
    const products = await getCollection('products');
    const owners = new Map<string, string>();

    for (const product of products) {
        // The slug is the file name, so the schema can't limit it; the CMS caps it at 100.
        if (product.slug.length > MAX_SLUG_LENGTH) {
            throw new Error(`Product slug "${product.slug}" is longer than ${MAX_SLUG_LENGTH} characters`);
        }
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
export function lowestPrice(product: Product): number {
    const available = product.data.variants.filter(variant => variant.available);

    return Math.min(...(available.length ? available : product.data.variants).map(variant => variant.price));
}

export function hasPriceRange(product: Product): boolean {
    return new Set(product.data.variants.map(variant => variant.price)).size > 1;
}

export interface CatalogEntry {
    product: Product;
    variant: ProductVariant;
}

// SKU -> product and variant, for active products only.
export async function getCatalog(): Promise<Map<string, CatalogEntry>> {
    const catalog = new Map<string, CatalogEntry>();

    for (const product of await getActiveProducts()) {
        for (const variant of product.data.variants) {
            catalog.set(variant.sku, {product, variant});
        }
    }

    return catalog;
}

// "Bluza — M / czarny", or just the name when the product has a single variant.
export function itemName({product, variant}: CatalogEntry): string {
    return product.data.variants.length > 1 ? `${product.data.name} — ${variant.label}` : product.data.name;
}
