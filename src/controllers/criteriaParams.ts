// Critères de recherche à recopier dans un lien (tri, pagination) ou un formulaire (export).
// Pour le client, le SIREN est imposé par la session : inutile de le mettre dans l'URL.
export function criteriaParams(filters: object, isClient: boolean): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [name, value] of Object.entries(filters)) {
    if (typeof value === 'string' && value && !(isClient && name === 'siren')) {
      params[name] = value;
    }
  }
  return params;
}
