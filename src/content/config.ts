// 1. Import utilities from `astro:content`
import {z, defineCollection} from 'astro:content';

// 2. Define your collection(s)
const blogCollection = defineCollection({
    schema: ({image}) => z.object({
        title: z.string(),
        description: z.string(),
        author: z.array(z.string()).optional(),
        createdAt: z.date(),
        publish: z.boolean().optional().default(true),
        cover: z.preprocess(function (val) {
            let value = String(val);

            if (value.startsWith('[[') && value.endsWith(']]')) {
                return value.substring(2, value.length - 2);
            }

            return value;
        }, image()).nullable().optional(),
        coverAlt: z.string().nullable().optional(),
    }),
});

const teamCollection = defineCollection({
    schema: z.object({
        name: z.string(),
        title: z.string(),
        email: z.string(),
        picture: z.string(),
        www: z.string().optional(),
    }),
});

// Shop products, edited through the CMS at cms.robocza.org and stored in the
// grupa-robocza/grupa-content repository; the "Sync content" workflow copies them here.
// Don't edit them here: the next sync overwrites them. Keep the fields in sync with the CMS
// config (grupa-robocza/grupa-cms, public/config.yml). Entry slug comes from the file name.
// Description is the Markdown body. Images live in `products/images/`.
// Prices are in PLN grosze (4900 = 49,00 zł); the checkout function reads them from here,
// never from the browser.
const productsCollection = defineCollection({
    type: 'content',
    schema: ({image}) => z.object({
        name: z.string().min(1),
        summary: z.string().optional(),
        images: z.array(z.object({
            src: image(),
            alt: z.string().default(''),
        })).min(1),
        active: z.boolean().default(true),
        order: z.number().int().default(0),
        variants: z.array(z.object({
            // Shown to the customer, e.g. "M / czarny". Ignored when a product has a single variant.
            label: z.string().min(1),
            // Unique across the whole shop; identifies the cart item at checkout.
            sku: z.string().regex(/^[A-Za-z0-9_-]+$/, 'SKU may only contain letters, digits, "-" and "_"'),
            price: z.number().int().positive(),
            // Shown instead of the main image when this variant is selected.
            image: image().optional(),
            available: z.boolean().default(true),
        })).min(1),
    }).superRefine((product, context) => {
        const skus = new Set<string>();

        product.variants.forEach((variant, index) => {
            if (skus.has(variant.sku)) {
                context.addIssue({code: z.ZodIssueCode.custom, path: ['variants', index, 'sku'], message: `Duplicate SKU "${variant.sku}"`});
            }
            skus.add(variant.sku);
        });
    }),
});

// 3. Export a single `collections` object to register your collection(s)
//    This key should match your collection directory name in "src/content"
export const collections = {
    'blog': blogCollection,
    'team': teamCollection,
    'products': productsCollection,
};
