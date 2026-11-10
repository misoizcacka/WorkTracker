/**
 * Maps ISO 3166-1 alpha-2 country codes to their currency symbol.
 * Used across the app for displaying prices, hourly rates, etc.
 */
export function getCurrencySymbol(country: string | null): string {
  if (!country) return '€';
  
  const map: Record<string, string> = {
    // Eurozone
    DE: '€', AT: '€', FR: '€', ES: '€', IT: '€', NL: '€', BE: '€',
    PT: '€', FI: '€', IE: '€', GR: '€', LU: '€', SI: '€', SK: '€',
    EE: '€', LV: '€', LT: '€', CY: '€', MT: '€',
    
    // Other European countries
    GB: '£', CH: 'CHF', SE: 'kr', NO: 'kr', DK: 'kr', PL: 'zł', 
    CZ: 'Kč', HU: 'Ft', RO: 'lei', TR: '₺',
    
    // Americas
    US: '$', CA: 'CA$', MX: '$', BR: 'R$',
    
    // Asia-Pacific
    AU: 'A$', NZ: 'NZ$', JP: '¥', CN: '¥', KR: '₩', IN: '₹', SG: 'S$',
    
    // Middle East & Africa
    AE: 'د.إ', SA: '﷼', ZA: 'R',
  };
  
  return map[country.toUpperCase()] ?? '€';
}
