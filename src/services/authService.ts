import bcrypt from 'bcrypt';

import type { SessionUser } from '../lib/session';
import type { UserRepository } from './userRepository';

// Nombre d'échecs à partir duquel on affiche « ATTENTION : C'est votre dernier essai... »
export const WARNING_THRESHOLD = 2;

// Vérifie le couple login / mot de passe. Renvoie l'utilisateur à mettre en session, ou null.
export async function authenticate(
  login: string,
  password: string,
  users: Pick<UserRepository, 'findByLogin'>,
): Promise<SessionUser | null> {
  if (!login || !password) {
    return null;
  }

  const user = await users.findByLogin(login);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return null;
  }

  return { login: user.login, role: user.role, siren: user.siren };
}

export function shouldShowLastAttemptWarning(failedAttempts: number): boolean {
  return failedAttempts >= WARNING_THRESHOLD;
}
