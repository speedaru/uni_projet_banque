import type { Request, Response } from 'express';

import { createClientAccount, MIN_PASSWORD_LENGTH } from '../services/accountService';
import type { UserRepository } from '../services/userRepository';

// Écran « Comptes clients » de l'admin (Epic 7, TS3) : liste, création et suppression,
// toujours avec l'accord du Product Owner.
export function createAccountsController(users: UserRepository) {
  async function renderAccountsPage(
    res: Response,
    options: { errors?: string[]; success?: string; form?: Record<string, string> } = {},
  ) {
    res.render('admin/comptes', {
      titre: 'Comptes clients',
      clients: await users.listClients(),
      errors: options.errors ?? [],
      success: options.success,
      form: options.form ?? {},
      minPasswordLength: MIN_PASSWORD_LENGTH,
    });
  }

  return {
    async list(req: Request, res: Response) {
      const messages: Record<string, string> = {
        cree: 'Le compte client a été créé.',
        supprime: 'Le compte client a été supprimé.',
      };
      await renderAccountsPage(res, { success: messages[String(req.query.ok)] });
    },

    async create(req: Request, res: Response) {
      const form = {
        login: String(req.body.login ?? '').trim(),
        password: String(req.body.password ?? ''),
        siren: String(req.body.siren ?? '').trim(),
        raisonSociale: String(req.body.raisonSociale ?? '').trim(),
        poAgreement: req.body.poAgreement === 'on',
      };

      const errors = await createClientAccount(form, users);
      if (errors.length > 0) {
        res.status(400);
        // On ne renvoie jamais le mot de passe dans le formulaire
        return renderAccountsPage(res, {
          errors,
          form: { login: form.login, siren: form.siren, raisonSociale: form.raisonSociale },
        });
      }
      res.redirect('/admin/comptes?ok=cree');
    },

    async remove(req: Request, res: Response) {
      if (req.body.poAgreement !== 'on') {
        res.status(400);
        return renderAccountsPage(res, {
          errors: ["L'accord du Product Owner est obligatoire pour supprimer un compte."],
        });
      }

      const deleted = await users.deleteClient(Number(req.params.id));
      if (!deleted) {
        res.status(404);
        return renderAccountsPage(res, { errors: ['Compte client introuvable.'] });
      }
      res.redirect('/admin/comptes?ok=supprime');
    },
  };
}
