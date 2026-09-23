import bcrypt from 'bcrypt';

import type { UserRepository } from './userRepository';

export interface ClientAccountForm {
  login: string;
  password: string;
  siren: string;
  raisonSociale: string;
  // Case « Accord Product Owner » (spécifications, fonction 1)
  poAgreement: boolean;
}

export const MIN_PASSWORD_LENGTH = 8;
const BCRYPT_ROUNDS = 10;

// Vérifie le formulaire de création d'un compte client. Renvoie la liste des erreurs (vide si OK).
export function validateClientAccount(form: ClientAccountForm): string[] {
  const errors: string[] = [];

  if (!form.poAgreement) {
    errors.push("L'accord du Product Owner est obligatoire.");
  }
  if (!/^[a-zA-Z0-9._-]{3,50}$/.test(form.login)) {
    errors.push(
      "L'identifiant doit contenir 3 à 50 caractères (lettres, chiffres, point, tiret, underscore).",
    );
  }
  if (form.password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`);
  }
  if (!/^\d{9}$/.test(form.siren)) {
    errors.push('Le SIREN doit contenir exactement 9 chiffres.');
  }
  if (!form.raisonSociale || form.raisonSociale.length > 20) {
    errors.push('La raison sociale est obligatoire (20 caractères maximum).');
  }

  return errors;
}

export async function createClientAccount(
  form: ClientAccountForm,
  users: UserRepository,
): Promise<string[]> {
  const errors = validateClientAccount(form);
  if (errors.length > 0) {
    return errors;
  }

  if (await users.findByLogin(form.login)) {
    return ['Cet identifiant est déjà utilisé.'];
  }

  await users.createClient({
    login: form.login,
    passwordHash: await bcrypt.hash(form.password, BCRYPT_ROUNDS),
    siren: form.siren,
    raisonSociale: form.raisonSociale,
  });
  return [];
}
