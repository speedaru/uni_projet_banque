// Table des motifs d'impayés (backlog produit), aussi utilisée par le seed pour remplir MotifImpaye
export const MOTIFS_IMPAYES = [
  { code: '01', libelle: 'fraude à la carte' },
  { code: '02', libelle: 'compte à découvert' },
  { code: '03', libelle: 'compte clôturé' },
  { code: '04', libelle: 'compte bloqué' },
  { code: '05', libelle: 'provision insuffisante' },
  { code: '06', libelle: 'opération contestée par le débiteur' },
  { code: '07', libelle: 'titulaire décédé' },
  { code: '08', libelle: 'raison non communiquée, contactez la banque du client' },
];

export function motifLabel(code: string): string | undefined {
  return MOTIFS_IMPAYES.find((motif) => motif.code === code)?.libelle;
}
