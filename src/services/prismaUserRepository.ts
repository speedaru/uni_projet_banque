import { prisma } from '../lib/prisma';
import type { UserRepository } from './userRepository';

export const prismaUserRepository: UserRepository = {
  async findByLogin(login) {
    const user = await prisma.utilisateur.findUnique({ where: { login } });
    if (!user) {
      return null;
    }
    return {
      id: user.id,
      login: user.login,
      passwordHash: user.passwordHash,
      role: user.role,
      siren: user.siren ?? undefined,
    };
  },

  async listClients() {
    const clients = await prisma.utilisateur.findMany({
      where: { role: 'client' },
      include: { entreprise: true },
      orderBy: { login: 'asc' },
    });
    return clients.map((client) => ({
      id: client.id,
      login: client.login,
      siren: client.siren ?? '',
      raisonSociale: client.entreprise?.raisonSociale ?? '',
    }));
  },

  async createClient({ login, passwordHash, siren, raisonSociale }) {
    await prisma.utilisateur.create({
      data: {
        login,
        passwordHash,
        role: 'client',
        entreprise: {
          connectOrCreate: { where: { siren }, create: { siren, raisonSociale } },
        },
      },
    });
  },

  async deleteClient(id) {
    const result = await prisma.utilisateur.deleteMany({ where: { id, role: 'client' } });
    return result.count > 0;
  },
};
