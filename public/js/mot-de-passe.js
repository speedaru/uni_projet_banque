// Bouton « l'œil » : bascule le champ mot de passe entre masqué et en clair
document.querySelectorAll('.bouton-oeil').forEach((bouton) => {
  const champ = document.getElementById(bouton.dataset.cible);

  bouton.addEventListener('click', () => {
    const visible = champ.type === 'text';
    champ.type = visible ? 'password' : 'text';
    bouton.setAttribute('aria-pressed', String(!visible));
    bouton.setAttribute(
      'aria-label',
      visible ? 'Afficher le mot de passe' : 'Masquer le mot de passe',
    );
  });
});
