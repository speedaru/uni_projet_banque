// Page « Statistiques » : charge les données en JSON puis dessine les graphiques.
// Changer le type de graphique (histogramme / courbe) redessine sans recharger la page.
(async function () {
  const page = document.querySelector('[data-donnees]');
  if (!page) {
    return;
  }

  // Impression des graphiques (Epic 4, US4) : la feuille de style d'impression masque le reste
  document.getElementById('bouton-imprimer').addEventListener('click', () => window.print());

  const zoneEtat = document.getElementById('etat-graphiques');
  let donnees;
  try {
    const reponse = await fetch(page.dataset.donnees, { headers: { Accept: 'application/json' } });
    if (!reponse.ok) {
      throw new Error(`HTTP ${reponse.status}`);
    }
    donnees = await reponse.json();
  } catch {
    zoneEtat.textContent = 'Impossible de charger les données des graphiques.';
    return;
  }
  zoneEtat.hidden = true;

  const euros = (valeur) => valeur.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

  // Indicateurs
  document.getElementById('total-impayes').textContent = euros(donnees.totals.unpaid);
  document.getElementById('nombre-impayes').textContent = donnees.totals.unpaidCount;
  document.getElementById('total-ca').textContent = euros(donnees.totals.revenue);
  document.getElementById('taux-impayes').textContent =
    `${donnees.totals.rate.toLocaleString('fr-FR')} %`;

  // Graphique d'évolution
  let evolution;
  const dessiner = (type) => {
    evolution?.destroy();
    evolution = window.Graphiques.dessinerEvolution(
      document.getElementById('graphique-evolution'),
      donnees,
      type,
    );
  };
  const choixType = document.querySelectorAll('input[name="type"]');
  dessiner([...choixType].find((choix) => choix.checked)?.value ?? 'histogramme');
  choixType.forEach((choix) => choix.addEventListener('change', () => dessiner(choix.value)));

  // Camembert et tableau des motifs (triés par montant décroissant)
  const tableau = document.getElementById('tableau-motifs');
  if (donnees.motifs.length === 0) {
    document.getElementById('bloc-motifs').innerHTML =
      '<p class="texte-secondaire">Aucun impayé sur la période.</p>';
    return;
  }
  // Liste des impayés d'un motif sur la même période (Epic 4, US5)
  const listeMotif = (motif) => {
    const url = new URL(page.dataset.listeImpayes, window.location.href);
    url.searchParams.set('motifCode', motif.code);
    return url.pathname + url.search;
  };

  window.Graphiques.dessinerMotifs(document.getElementById('graphique-motifs'), donnees, {
    surClic: (motif) => window.location.assign(listeMotif(motif)),
  });

  const total = donnees.motifs.reduce((somme, motif) => somme + motif.amount, 0);
  donnees.motifs.forEach((motif, index) => {
    const ligne = tableau.insertRow();
    const couleur = window.Graphiques.COULEURS_MOTIFS[index % 8];
    ligne.innerHTML =
      `<td><span class="pastille-tranche" style="background:${couleur}"></span></td>` +
      `<td><span class="motif-code">${motif.code}</span></td>` +
      '<td class="libelle"><a></a></td>' +
      `<td class="nombre">${motif.count}</td>` +
      `<td class="nombre negatif">${euros(-motif.amount)}</td>` +
      `<td class="nombre">${Math.round((motif.amount / total) * 100)} %</td>`;
    // Libellé inséré en texte pour éviter toute injection HTML
    const lien = ligne.querySelector('.libelle a');
    lien.textContent = motif.libelle;
    lien.href = listeMotif(motif);
    lien.title = 'Voir la liste des impayés de ce motif';
  });
})();
