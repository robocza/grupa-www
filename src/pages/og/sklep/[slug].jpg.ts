import type {APIRoute, GetStaticPaths} from 'astro';
import {jpegResponse, productPreview} from '@lib/link-preview';
import {formatPrice, getActiveProducts, hasPriceRange, isAvailable, lowestPrice, type Product} from '@lib/shop';

// Link preview image for each product page, see src/lib/link-preview.ts.
export const getStaticPaths = (async () => {
    const products = await getActiveProducts();

    return products.map(product => ({
        params: {slug: product.id}, props: {product},
    }));
}) satisfies GetStaticPaths;

export const GET: APIRoute<{product: Product}> = async ({props}) => {
    const {product} = props;
    // Same wording as the shop listing (src/pages/sklep.astro). The shop is Polish only.
    const price = isAvailable(product)
        ? (hasPriceRange(product) ? 'od ' : '') + formatPrice(lowestPrice(product), 'pl')
        : 'Wyprzedane';
    // Astro's image metadata knows its source file but doesn't type it.
    const cover = product.data.images[0].src as ImageMetadata & {fsPath: string};

    return jpegResponse(await productPreview({photoPath: cover.fsPath, name: product.data.name, price}));
};
