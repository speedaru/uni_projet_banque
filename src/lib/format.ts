// Formats d'affichage communs aux vues

const amountFormatter = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// 1234.5 → « 1 234,50 »
export function formatAmount(amount: number): string {
  return amountFormatter.format(amount);
}

// « 2026-06-02 » → « 02/06/2026 » (format jj/mm/aaaa de la spécification)
export function formatIsoDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}
