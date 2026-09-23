import bcrypt from 'bcrypt';

import type { UserRecord } from './authService';

// TEMPORAIRE : comptes de démonstration en attendant le modèle Prisma `Utilisateur`
// (Phase 1, Technical Leader). À supprimer dès que les utilisateurs sont en base :
// il suffira de passer une fonction de recherche Prisma à `authenticate`.
const demoUsers: UserRecord[] = [
  { login: 'admin', passwordHash: bcrypt.hashSync('admin123', 10), role: 'admin' },
  { login: 'po', passwordHash: bcrypt.hashSync('po123', 10), role: 'po' },
  {
    login: 'client',
    passwordHash: bcrypt.hashSync('client123', 10),
    role: 'client',
    siren: '123456789',
  },
];

export async function findDemoUser(login: string): Promise<UserRecord | null> {
  return demoUsers.find((user) => user.login === login) ?? null;
}
