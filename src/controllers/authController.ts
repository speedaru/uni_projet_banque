import type { Request, Response } from 'express';

import '../lib/session';
import { navigation } from '../lib/navigation';
import { authenticate, shouldShowLastAttemptWarning } from '../services/authService';
import type { LoginThrottle } from '../services/loginThrottle';
import type { UserRepository } from '../services/userRepository';

function renderLoginPage(req: Request, res: Response, options: { error?: string; login?: string }) {
  res.render('connexion', {
    titre: 'Connexion',
    error: options.error,
    login: options.login ?? '',
    lastAttemptWarning: shouldShowLastAttemptWarning(req.session.failedAttempts ?? 0),
  });
}

export function showLoginPage(req: Request, res: Response) {
  // Déjà connecté : on renvoie directement vers l'accueil de son espace
  if (req.session.user) {
    return res.redirect(navigation[req.session.user.role][0].href);
  }
  renderLoginPage(req, res, {});
}

export function createLoginHandler(users: UserRepository, throttle: LoginThrottle) {
  return async (req: Request, res: Response) => {
    const login = String(req.body.login ?? '').trim();
    const password = String(req.body.password ?? '');

    // Identifiant bloqué après le dernier essai : on ne vérifie même pas le mot de passe
    const remaining = throttle.remainingLock(login);
    if (remaining > 0) {
      res.status(429);
      return renderLoginPage(req, res, {
        error: `Trop de tentatives échouées : cet identifiant est bloqué. Réessayez dans ${Math.ceil(remaining / 60000)} minute(s).`,
        login,
      });
    }

    const user = await authenticate(login, password, users);

    if (!user) {
      req.session.failedAttempts = (req.session.failedAttempts ?? 0) + 1;
      if (login) {
        throttle.recordFailure(login);
      }
      res.status(401);
      return renderLoginPage(req, res, { error: 'Identifiant ou mot de passe incorrect.', login });
    }
    throttle.recordSuccess(login);

    // Nouvelle session à la connexion (évite la fixation de session)
    req.session.regenerate((err) => {
      if (err) {
        return res.status(500).send('Erreur de session');
      }
      req.session.user = user;
      res.redirect(navigation[user.role][0].href);
    });
  };
}

export function logout(req: Request, res: Response) {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.redirect('/connexion');
  });
}
