import type { Role } from './navigation';

// Utilisateur connecté, stocké dans la session après authentification
export interface SessionUser {
  login: string;
  role: Role;
  // SIREN de l'entreprise du client (sert au filtrage des données, Epic 7)
  siren?: string;
}

// Ajout de nos champs au typage de express-session
declare module 'express-session' {
  interface SessionData {
    user?: SessionUser;
    // Nombre d'échecs de connexion consécutifs (bandeau « dernier essai », Epic 6)
    failedAttempts?: number;
  }
}
