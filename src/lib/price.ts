const priceFormat = new Intl.NumberFormat('pl-PL', {style: 'currency', currency: 'PLN'});

// Price in grosze -> "49,00 zł"
export function formatPrice(grosze: number): string {
    return priceFormat.format(grosze / 100);
}
