import {z, defineCollection} from 'astro:content';
import {glob} from 'astro/loaders';

// Entry ids come from the file names, slugified the same way Astro 4's `slug` was, so URLs stay
// the same (e.g. "🌞 Hello World.md" -> "-hello-world"). Only top-level .md files are entries:
// the blog's _templates/ folder and the products' images/ folder are skipped.

// The blog is the git submodule src/content/blog, written in Obsidian.
const blogCollection = defineCollection({
    loader: glob({pattern: '*.md', base: './src/content/blog'}),
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

// Shop products, edited through the CMS at cms.robocza.org and stored in the
// grupa-robocza/grupa-content repository; the "Sync content" workflow copies them here.
// Don't edit them here: the next sync overwrites them. Keep the fields in sync with the CMS
// config (grupa-robocza/grupa-cms, public/config.yml). Entry id (the URL slug) comes from the
// file name. Description is the Markdown body. Images live in `products/images/`.
// Prices are in PLN grosze (4900 = 49,00 zł); the checkout function reads them from here,
// never from the browser.
const productsCollection = defineCollection({
    loader: glob({pattern: '*.md', base: './src/content/products'}),
    schema: ({image}) => z.object({
        // Length limits match the CMS config (grupa-cms, public/config.yml). Checkout sends the
        // name, variant label, SKU and slug to Stripe as metadata, which allows 500 characters.
        name: z.string().min(1).max(150),
        summary: z.string().optional(),
        images: z.array(z.object({
            src: image(),
            alt: z.string().default(''),
        })).min(1),
        active: z.boolean().default(true),
        // Sold out: still listed (faded, marked "Wyprzedane") but can't be bought, whatever the
        // variants' own `available` says. Hidden products use `active: false` instead.
        soldOut: z.boolean().default(false),
        order: z.number().int().default(0),
        variants: z.array(z.object({
            // Shown to the customer, e.g. "M / czarny". Ignored when a product has a single variant.
            // Max 90, not 150: with several variants the order line is named "<name> — <label>"
            // (itemName in src/lib/shop.ts), which must fit the admin panel's 250-character variant
            // name (150 + 3 + 90 = 243).
            label: z.string().min(1).max(90),
            // Unique across the whole shop: identifies the cart item at checkout and the order
            // line in the admin panel. Checked within a product below and across all products
            // (including hidden ones) in getAllProducts() in src/lib/shop.ts, which fails the build.
            sku: z.string().max(50).regex(/^[A-Za-z0-9_-]+$/, 'SKU may only contain letters, digits, "-" and "_"'),
            price: z.number().int().positive(),
            // Shown instead of the main image when this variant is selected.
            image: image().optional(),
            available: z.boolean().default(true),
        })).min(1),
    }).superRefine((product, context) => {
        // image() leaves a file Astro can't process (e.g. .jfif, .heic) as its path instead of
        // failing, which would break the product page and its link preview. While the schema
        // runs, image() values are still strings (placeholders for supported formats), so check
        // the extension. Formats: VALID_INPUT_FORMATS in astro/dist/assets/consts.js.
        const supportedImage = /\.(jpe?g|png|apng|webp|avif|gif|tiff|svg)$/i;
        const unsupportedImage = (image: unknown) => typeof image === 'string' && !supportedImage.test(image)
            ? `Unsupported image format: "${image.replace(/^__ASTRO_IMAGE_/, '')}". Use .jpg, .png, .webp, .avif or .gif.`
            : undefined;

        product.images.forEach((image, index) => {
            const message = unsupportedImage(image.src);
            if (message) {
                context.addIssue({code: z.ZodIssueCode.custom, path: ['images', index, 'src'], message});
            }
        });
        product.variants.forEach((variant, index) => {
            const message = unsupportedImage(variant.image);
            if (message) {
                context.addIssue({code: z.ZodIssueCode.custom, path: ['variants', index, 'image'], message});
            }
        });

        const skus = new Set<string>();

        product.variants.forEach((variant, index) => {
            if (skus.has(variant.sku)) {
                context.addIssue({code: z.ZodIssueCode.custom, path: ['variants', index, 'sku'], message: `Duplicate SKU "${variant.sku}"`});
            }
            skus.add(variant.sku);
        });
    }),
});

// The team pages (src/content/team, src/content/en/team) aren't a collection: Team.astro
// imports them directly.
export const collections = {
    'blog': blogCollection,
    'products': productsCollection,
};
