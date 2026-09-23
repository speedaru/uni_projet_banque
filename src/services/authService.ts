import bcrypt from 'bcrypt';

import type { Role } from '../lib/navigation';
import type { SessionUser } from '../lib/session';

// Utilisateur tel qu'il est stocké (mot de passe hashé avec bcrypt)
export interface UserRecord {
  login: string;
  passwordHash: string;
  role: Role;
  siren?: string;
}

export type FindUser = (login: string) => Promise<UserRecord | null>;

// Nombre d'échecs à partir duquel on affiche « ATTENTION : C'est votre dernier essai... »
export const WARNING_THRESHOLD = 2;

// Vérifie le couple login / mot de passe. Renvoie l'utilisateur à mettre en session, ou null.
// La recherche de l'utilisateur est passée en paramètre pour pouvoir brancher Prisma plus tard.
export async function authenticate(
  login: string,
  password: string,
  findUser: FindUser,
): Promise<SessionUser | null> {
  if (!login || !password) {
    return null;
  }

  const user = await findUser(login);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return null;
  }

  return { login: user.login, role: user.role, siren: user.siren };
}

export function shouldShowLastAttemptWarning(failedAttempts: number): boolean {
  return failedAttempts >= WARNING_THRESHOLD;
}
