/* global Chart */
// Dessin des graphiques statistiques (Epic 4) avec Chart.js.
// Utilisé par la page /statistiques (données chargées en JSON) et par le rapport PDF (données intégrées).
(function () {
  const COULEURS_MOTIFS = [
    '#d92d20',
    '#f79009',
    '#7a5af8',
    '#2f5bea',
    '#14b8a6',
    '#ee46bc',
    '#667085',
    '#0b1b34',
  ];

  const euros = (valeur) =>
    valeur.toLocaleString('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    });

  // Évolution des impayés (histogramme ou courbe, US1) comparée au chiffre d'affaires (US2)
  function dessinerEvolution(canvas, donnees, type, options = {}) {
    const estCourbe = type === 'courbe';
    return new Chart(canvas, {
      data: {
        labels: donnees.labels,
        datasets: [
          {
            type: estCourbe ? 'line' : 'bar',
            label: 'Impayés (€)',
            data: donnees.unpaid,
            yAxisID: 'impayes',
            backgroundColor: estCourbe ? 'rgba(217, 45, 32, 0.12)' : 'rgba(217, 45, 32, 0.85)',
            borderColor: '#d92d20',
            borderWidth: 2,
            borderRadius: 6,
            fill: estCourbe,
            tension: 0.3,
            pointRadius: estCourbe ? 3 : 0,
            order: 1,
          },
          {
            type: 'line',
            label: "Chiffre d'affaires (€)",
            data: donnees.revenue,
            yAxisID: 'ca',
            borderColor: '#2f5bea',
            backgroundColor: '#2f5bea',
            borderDash: [6, 4],
            borderWidth: 2,
            tension: 0.3,
            pointRadius: 2,
            order: 0,
          },
        ],
      },
      options: {
        responsive: options.responsive ?? true,
        maintainAspectRatio: false,
        animation: options.animation ?? true,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'bottom' },
          tooltip: {
            callbacks: {
              label: (contexte) => ` ${contexte.dataset.label} : ${euros(contexte.parsed.y)}`,
            },
          },
        },
        scales: {
          x: { grid: { display: false } },
          impayes: {
            position: 'left',
            beginAtZero: true,
            title: { display: true, text: 'Impayés (€)', color: '#d92d20' },
            ticks: { callback: (valeur) => euros(valeur) },
          },
          ca: {
            position: 'right',
            beginAtZero: true,
            grid: { drawOnChartArea: false },
            title: { display: true, text: "Chiffre d'affaires (€)", color: '#2f5bea' },
            ticks: { callback: (valeur) => euros(valeur) },
          },
        },
      },
    });
  }

  // Répartition des impayés par motif (camembert, US3 / US5)
  function dessinerMotifs(canvas, donnees, options = {}) {
    return new Chart(canvas, {
      type: 'pie',
      data: {
        labels: donnees.motifs.map((motif) => `${motif.code} — ${motif.libelle}`),
        datasets: [
          {
            data: donnees.motifs.map((motif) => motif.amount),
            backgroundColor: donnees.motifs.map((_, index) => COULEURS_MOTIFS[index % 8]),
            borderColor: '#ffffff',
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: options.responsive ?? true,
        maintainAspectRatio: false,
        animation: options.animation ?? true,
        plugins: {
          // legend: false masque la légende (PDF : le tableau voisin reprend couleurs et libellés)
          legend: {
            display: options.legend !== false,
            position: options.legend || 'bottom',
            labels: { boxWidth: 12 },
          },
          tooltip: {
            callbacks: {
              label: (contexte) => {
                const total = contexte.dataset.data.reduce((somme, valeur) => somme + valeur, 0);
                const part = total ? Math.round((contexte.parsed / total) * 100) : 0;
                return ` ${euros(contexte.parsed)} (${part} %)`;
              },
            },
          },
        },
      },
    });
  }

  window.Graphiques = { dessinerEvolution, dessinerMotifs, COULEURS_MOTIFS };
})();
