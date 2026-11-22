import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

// Link preview images (Open Graph), shown when someone shares a page on Facebook, Messenger,
// WhatsApp, Signal, X, etc. Generated at build time by the endpoints in src/pages/og/.
// 1200 × 630 is the size the platforms recommend. JPEG keeps them small: WhatsApp drops
// preview images over about 300 KB.
export const PREVIEW_WIDTH = 1200;
export const PREVIEW_HEIGHT = 630;
const JPEG_QUALITY = 85;

// Paths from the project root, where the build runs. Pango (sharp's text renderer) can't read
// the site's .woff2, so the font is also kept as a .ttf, converted from the same file.
const FONT_PATH = path.resolve('src/assets/fonts/GT-America-Standard-Regular.ttf');
const SITE_LOGO_PATH = path.resolve('public/assets/logo.svg');
const SHOP_LOGO_PATH = path.resolve('public/assets/shop/logo.svg');

// Keep in sync with tailwind.config.cjs.
const SHOP_COLOUR = '#8bfc7a';
const WHITE = '#ffffff';
const BLACK = '#000000';

// Product layout: square photo on the left, divider, then a shop-colour panel with the shop
// logo, the product name and the price.
const PHOTO_SIZE = PREVIEW_HEIGHT;
const DIVIDER_WIDTH = 4;
const PANEL_LEFT = PHOTO_SIZE + DIVIDER_WIDTH;
const PADDING = 56;
const TEXT_WIDTH = PREVIEW_WIDTH - PANEL_LEFT - 2 * PADDING;
const PANEL_LOGO_WIDTH = 220;
const NAME_FONT_SIZE = 52;
const PRICE_FONT_SIZE = 44;
const GAP = 40;

interface RenderedText {
    data: Buffer;
    height: number;
}

// The text is Pango markup, so characters like "&" and "<" in product names must be escaped.
function escapeMarkup(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Black text on a transparent background, wrapped to `width`. If it would be taller than
// `maxHeight` at `fontSize`, it is shrunk to fit instead.
async function renderText(text: string, fontSize: number, width: number, maxHeight: number): Promise<RenderedText> {
    const render = async (sizing: {dpi: number} | {height: number}) => {
        const {data, info} = await sharp({
            text: {
                text: escapeMarkup(text),
                font: `GT America ${fontSize}`,
                fontfile: FONT_PATH,
                width,
                wrap: 'word',
                rgba: true,
                ...sizing,
            },
        }).png().toBuffer({resolveWithObject: true});

        return {data, height: info.height};
    };

    // At 72 dpi, the font size is in pixels.
    const rendered = await render({dpi: 72});

    return rendered.height <= maxHeight ? rendered : render({height: maxHeight});
}

async function renderLogo(logoPath: string, width: number): Promise<RenderedText> {
    const {data, info} = await sharp(await fs.readFile(logoPath), {density: 300})
        .resize({width})
        .png()
        .toBuffer({resolveWithObject: true});

    return {data, height: info.height};
}

export async function productPreview({photoPath, name, price}: {photoPath: string, name: string, price: string}): Promise<Buffer> {
    // Cropped to a square from the centre, the way the product page shows the cover.
    const photo = await sharp(photoPath)
        .rotate()
        .resize(PHOTO_SIZE, PHOTO_SIZE, {fit: 'cover'})
        .toBuffer();
    const logo = await renderLogo(SHOP_LOGO_PATH, PANEL_LOGO_WIDTH);
    const priceText = await renderText(price, PRICE_FONT_SIZE, TEXT_WIDTH, PRICE_FONT_SIZE * 2);
    const nameTop = PADDING + logo.height + GAP;
    const priceTop = PREVIEW_HEIGHT - PADDING - priceText.height;
    const nameText = await renderText(name, NAME_FONT_SIZE, TEXT_WIDTH, priceTop - GAP - nameTop);

    return sharp({create: {width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT, channels: 3, background: SHOP_COLOUR}})
        .composite([
            {input: photo, left: 0, top: 0},
            {input: {create: {width: DIVIDER_WIDTH, height: PREVIEW_HEIGHT, channels: 3, background: BLACK}}, left: PHOTO_SIZE, top: 0},
            {input: logo.data, left: PANEL_LEFT + PADDING, top: PADDING},
            {input: nameText.data, left: PANEL_LEFT + PADDING, top: nameTop},
            {input: priceText.data, left: PANEL_LEFT + PADDING, top: priceTop},
        ])
        .jpeg({quality: JPEG_QUALITY})
        .toBuffer();
}

// The blog cover, cropped from the centre to fill the frame. Nearest-neighbour scaling keeps
// the dithered artwork's pixels sharp (see src/lib/image-service.ts). PNG with a reduced palette
// is both crisper and smaller than JPEG for dithered images: about 50 KB against 300–450 KB.
export async function blogPreview(coverPath: string): Promise<Buffer> {
    return sharp(coverPath)
        .rotate()
        .resize(PREVIEW_WIDTH, PREVIEW_HEIGHT, {fit: 'cover', kernel: 'nearest'})
        .flatten({background: WHITE})
        .png({palette: true, compressionLevel: 9})
        .toBuffer();
}

// A logo centred on a plain background, for pages without an image of their own.
async function logoPreview(logoPath: string, logoWidth: number, background: string): Promise<Buffer> {
    const logo = await renderLogo(logoPath, logoWidth);

    return sharp({create: {width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT, channels: 3, background}})
        .composite([{input: logo.data, gravity: 'centre'}])
        .jpeg({quality: JPEG_QUALITY})
        .toBuffer();
}

export function sitePreview(): Promise<Buffer> {
    return logoPreview(SITE_LOGO_PATH, 640, WHITE);
}

export function shopPreview(): Promise<Buffer> {
    return logoPreview(SHOP_LOGO_PATH, 720, SHOP_COLOUR);
}

export function jpegResponse(data: Buffer): Response {
    return new Response(data, {headers: {'Content-Type': 'image/jpeg'}});
}

export function pngResponse(data: Buffer): Response {
    return new Response(data, {headers: {'Content-Type': 'image/png'}});
}
