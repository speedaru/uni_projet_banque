// Déplier / replier le détail des transactions d'une remise (Epic 2, US2) :
// clic sur le bouton « + » ou n'importe où sur la ligne principale.
document.querySelectorAll('.ligne-remise').forEach((ligne) => {
  const bouton = ligne.querySelector('.bouton-deplier');
  const detail = document.getElementById(ligne.dataset.detail);

  const basculer = () => {
    const ouvert = bouton.getAttribute('aria-expanded') === 'true';
    bouton.setAttribute('aria-expanded', String(!ouvert));
    ligne.classList.toggle('ligne-ouverte', !ouvert);
    detail.hidden = ouvert;
  };

  ligne.addEventListener('click', (event) => {
    // Le bouton gère lui-même son clic (évite un double basculement)
    if (!event.target.closest('.bouton-deplier')) {
      basculer();
    }
  });
  bouton.addEventListener('click', basculer);
});
