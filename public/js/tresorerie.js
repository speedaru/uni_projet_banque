// Graphique d'évolution de la trésorerie (Epic 1, US7), sous le tableau des annonces
(async function () {
  const bloc = document.querySelector('[data-graphique-tresorerie]');
  if (!bloc) {
    return;
  }
  try {
    const reponse = await fetch(bloc.dataset.graphiqueTresorerie, {
      headers: { Accept: 'application/json' },
    });
    if (!reponse.ok) {
      throw new Error(`HTTP ${reponse.status}`);
    }
    window.Graphiques.dessinerTresorerie(
      document.getElementById('graphique-tresorerie'),
      await reponse.json(),
    );
  } catch {
    bloc.querySelector('.zone-graphique').textContent =
      'Impossible de charger le graphique d’évolution.';
  }
})();
