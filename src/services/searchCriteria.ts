// Lecture et vérification des critères de recherche communs aux écrans métier
// (trésorerie, remises, impayés). Chaque fonction ajoute ses erreurs à la liste reçue.

export type Query = Record<string, unknown>;

export const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

// N° de SIREN : 9 chiffres, saisie avec espaces acceptée (ex. « 456 278 556 »)
export function readSiren(value: unknown, errors: string[]): string | undefined {
  const siren = text(value).replace(/\s/g, '');
  if (!siren) {
    return undefined;
  }
  if (!/^\d{9}$/.test(siren)) {
    errors.push('Le N° de SIREN doit contenir exactement 9 chiffres.');
    return undefined;
  }
  return siren;
}

// Date au format AAAA-MM-JJ (valeur envoyée par un champ <input type="date">)
export function readIsoDate(value: unknown, label: string, errors: string[]): string | undefined {
  const date = text(value);
  if (!date) {
    return undefined;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isNaN(Date.parse(date))) {
    errors.push(`${label} est invalide.`);
    return undefined;
  }
  return date;
}
