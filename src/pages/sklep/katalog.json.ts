import type {APIRoute} from 'astro';
import {getImage} from 'astro:assets';
import {getCatalog, isVariantAvailable} from '@lib/shop';
import type {CatalogItem} from '@lib/cart';

// SKU -> display data for the cart. Built with the site, so the cart always shows current
// names, prices and availability. Inactive products are left out and show as unavailable.
export const GET: APIRoute = async () => {
    const catalog: Record<string, CatalogItem> = {};

    for (const [sku, {product, variant}] of await getCatalog()) {
        const image = await getImage({src: variant.image ?? product.data.images[0].src, width: 200, optimize: true});

        catalog[sku] = {
            name: product.data.name,
            label: product.data.variants.length > 1 ? variant.label : undefined,
            price: variant.price,
            available: isVariantAvailable(product, variant),
            image: image.src,
            url: `/sklep/${product.slug}`,
        };
    }

    return new Response(JSON.stringify(catalog), {headers: {'Content-Type': 'application/json'}});
};
