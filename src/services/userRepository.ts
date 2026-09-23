import type { Role } from '../lib/navigation';

// Utilisateur tel qu'il est stocké (mot de passe hashé avec bcrypt)
export interface UserRecord {
  id: number;
  login: string;
  passwordHash: string;
  role: Role;
  siren?: string;
}

// Compte client affiché dans l'écran d'administration
export interface ClientAccount {
  id: number;
  login: string;
  siren: string;
  raisonSociale: string;
}

export interface NewClientAccount {
  login: string;
  passwordHash: string;
  siren: string;
  raisonSociale: string;
}

// Accès aux utilisateurs. L'implémentation Prisma est dans prismaUserRepository.ts ;
// les tests utilisent une version en mémoire (pas besoin de base de données en CI).
export interface UserRepository {
  findByLogin(login: string): Promise<UserRecord | null>;
  listClients(): Promise<ClientAccount[]>;
  // Crée l'entreprise si son SIREN n'existe pas encore, puis le compte client
  createClient(account: NewClientAccount): Promise<void>;
  // Ne supprime que des comptes de rôle client ; renvoie false si aucun compte trouvé
  deleteClient(id: number): Promise<boolean>;
}
