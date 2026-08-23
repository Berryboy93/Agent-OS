/**
 * Simple auth token helper
 * Stores dashboard secret in localStorage. api.ts reads it automatically.
 */

export const auth = {
  /** Get the current secret */
  getSecret: (): string | null => localStorage.getItem('dashboard_secret'),

  /** Set a new secret */
  setSecret: (secret: string): void => {
    localStorage.setItem('dashboard_secret', secret);
  },

  /** Clear the secret */
  clearSecret: (): void => {
    localStorage.removeItem('dashboard_secret');
  },

  /** Check if authenticated */
  isAuthenticated: (): boolean => !!localStorage.getItem('dashboard_secret'),
};

export default auth;
