/**
 * Which live Firebase project the app talks to. `VITE_FIREBASE_TARGET` wins when
 * set (`staging` or `production`); otherwise the dev server uses staging and a
 * build uses production. So `npm run dev` never touches patient data by accident,
 * and the deploy workflow's plain `npm run build` still ships the production config.
 */
export type FirebaseTarget = 'staging' | 'production';

export const resolveFirebaseTarget = (explicit: string | undefined, dev: boolean): FirebaseTarget => {
  if (explicit === 'staging' || explicit === 'production') return explicit;
  if (explicit) throw new Error(`VITE_FIREBASE_TARGET must be "staging" or "production", not "${explicit}".`);
  return dev ? 'staging' : 'production';
};
