import {defaultLocale} from '../i18n.mjs';

// Prices are charged in PLN (see /api/checkout); only the formatting follows the locale.
const CURRENCY = 'PLN';

const formats = new Map<string, Intl.NumberFormat>();

// Price in grosze -> "49,00 zł" for "pl". Pass the page's locale: Astro.currentLocale in page
// code, document.documentElement.lang in browser scripts.
export function formatPrice(grosze: number, locale: string | undefined): string {
    const formatLocale = locale || defaultLocale;
    let format = formats.get(formatLocale);
    if (!format) {
        format = new Intl.NumberFormat(formatLocale, {style: 'currency', currency: CURRENCY});
        formats.set(formatLocale, format);
    }

    return format.format(grosze / 100);
}
