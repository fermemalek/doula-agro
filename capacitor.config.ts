import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.farmfriendy',
  appName: 'Doula Agro',
  // Le build statique généré dans dist/ est embarqué directement dans l'APK.
  // L'app fonctionne hors-ligne (sauf les requêtes Supabase qui nécessitent une connexion).
  webDir: 'dist',
};

export default config;
