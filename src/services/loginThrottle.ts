// Blocage temporaire d'un identifiant après trop d'échecs de connexion.
// Le bandeau « ATTENTION : C'est votre dernier essai... » (Epic 6) prévient après 2 échecs ;
// au 3e échec, l'identifiant est bloqué quelques minutes (protection contre les essais en série).
// Le compteur est lié à l'identifiant et non à la session : effacer ses cookies ne le remet pas à zéro.

export const MAX_FAILURES = 3;
export const LOCK_DURATION_MS = 5 * 60 * 1000;

interface Attempts {
  failures: number;
  lockedUntil?: number;
}

export function createLoginThrottle(now: () => number = Date.now) {
  const attempts = new Map<string, Attempts>();
  const key = (login: string) => login.trim().toLowerCase();

  return {
    // Millisecondes restantes avant déblocage, ou 0 si l'identifiant n'est pas bloqué
    remainingLock(login: string): number {
      const entry = attempts.get(key(login));
      if (!entry?.lockedUntil) {
        return 0;
      }
      const remaining = entry.lockedUntil - now();
      if (remaining <= 0) {
        attempts.delete(key(login));
        return 0;
      }
      return remaining;
    },

    recordFailure(login: string) {
      const entry = attempts.get(key(login)) ?? { failures: 0 };
      entry.failures += 1;
      if (entry.failures >= MAX_FAILURES) {
        entry.lockedUntil = now() + LOCK_DURATION_MS;
      }
      attempts.set(key(login), entry);
    },

    recordSuccess(login: string) {
      attempts.delete(key(login));
    },
  };
}

export type LoginThrottle = ReturnType<typeof createLoginThrottle>;
