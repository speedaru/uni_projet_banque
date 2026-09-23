import bcrypt from 'bcrypt';
import request from 'supertest';

import { createApp } from '../../src/app';
import type { Role } from '../../src/lib/navigation';
import type { TreasuryRepository, TreasuryRow } from '../../src/services/treasuryRepository';
import type { UserRecord, UserRepository } from '../../src/services/userRepository';

// Version en mémoire du UserRepository : les tests tournent sans PostgreSQL (CI comprise)
export function createMemoryUserRepository(): UserRepository & { companies: Map<string, string> } {
  const users: UserRecord[] = [];
  const companies = new Map<string, string>([['123456789', 'Boutique Démo']]);
  let nextId = 1;

  const add = (login: string, password: string, role: Role, siren?: string) => {
    users.push({ id: nextId++, login, passwordHash: bcrypt.hashSync(password, 4), role, siren });
  };
  add('admin', 'admin123', 'admin');
  add('po', 'po123', 'po');
  add('client', 'client123', 'client', '123456789');

  return {
    companies,
    async findByLogin(login) {
      return users.find((user) => user.login === login) ?? null;
    },
    async listClients() {
      return users
        .filter((user) => user.role === 'client')
        .map((user) => ({
          id: user.id,
          login: user.login,
          siren: user.siren ?? '',
          raisonSociale: companies.get(user.siren ?? '') ?? '',
        }));
    },
    async createClient({ login, passwordHash, siren, raisonSociale }) {
      if (!companies.has(siren)) {
        companies.set(siren, raisonSociale);
      }
      users.push({ id: nextId++, login, passwordHash, role: 'client', siren });
    },
    async deleteClient(id) {
      const index = users.findIndex((user) => user.id === id && user.role === 'client');
      if (index === -1) {
        return false;
      }
      users.splice(index, 1);
      return true;
    },
  };
}

// Remises de test : SIREN, raison sociale, date de valeur, montants des transactions
export const testRemises = [
  { siren: '123456789', raisonSociale: 'Boutique Démo', date: '2026-06-02', amounts: [100, 50.5] },
  { siren: '123456789', raisonSociale: 'Boutique Démo', date: '2026-06-03', amounts: [20] },
  { siren: '552100554', raisonSociale: 'Garage Leroy', date: '2026-06-02', amounts: [30, -250] },
  { siren: '456278556', raisonSociale: 'Dupont SARL', date: '2026-06-03', amounts: [900, 45] },
];

// Version en mémoire du TreasuryRepository, même logique de cumul que la requête SQL
export function createMemoryTreasuryRepository(): TreasuryRepository {
  return {
    async findAnnouncements({ siren, raisonSociale, dateValeur }) {
      const rows = new Map<string, TreasuryRow>();
      for (const remise of testRemises) {
        if (
          (siren && remise.siren !== siren) ||
          (raisonSociale &&
            !remise.raisonSociale.toLowerCase().includes(raisonSociale.toLowerCase())) ||
          (dateValeur && remise.date !== dateValeur)
        ) {
          continue;
        }
        const row = rows.get(remise.siren) ?? {
          siren: remise.siren,
          raisonSociale: remise.raisonSociale,
          transactionCount: 0,
          devise: 'EUR',
          totalAmount: 0,
        };
        row.transactionCount += remise.amounts.length;
        row.totalAmount += remise.amounts.reduce((total, amount) => total + amount, 0);
        rows.set(remise.siren, row);
      }
      return [...rows.values()];
    },
  };
}

export function createTestApp() {
  const users = createMemoryUserRepository();
  const treasury = createMemoryTreasuryRepository();
  return { app: createApp({ users, treasury }), users };
}

const passwords: Record<Role, string> = { admin: 'admin123', po: 'po123', client: 'client123' };

// Renvoie un agent Supertest (qui garde le cookie de session) connecté avec le profil demandé
export async function loginAs(app: ReturnType<typeof createApp>, role: Role) {
  const agent = request.agent(app);
  await agent.post('/connexion').type('form').send({ login: role, password: passwords[role] });
  return agent;
}
