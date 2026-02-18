// Paise to Rupee formatter — always use this, never divide by 100 in JSX

/**
 * Converts paise (integer) to a formatted Indian Rupee string.
 * Example: formatCurrency(9950) → "₹99.50"
 * Example: formatCurrency(100000) → "₹1,000.00"
 * Example: formatCurrency(10000000) → "₹1,00,000.00"
 */
export function formatCurrency(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(paise / 100);
}

/** Converts a rupee string input to paise integer for API calls */
export function toPaise(rupees: string): number {
  return Math.round(parseFloat(rupees) * 100);
}

/** Formats large paise amounts as short form: 1L, 2.5Cr etc */
export function formatCompact(paise: number): string {
  const rupees = paise / 100;
  if (rupees >= 10_000_000) return `₹${(rupees / 10_000_000).toFixed(1)}Cr`;
  if (rupees >= 100_000) return `₹${(rupees / 100_000).toFixed(1)}L`;
  if (rupees >= 1_000) return `₹${(rupees / 1_000).toFixed(1)}K`;
  return formatCurrency(paise);
}
