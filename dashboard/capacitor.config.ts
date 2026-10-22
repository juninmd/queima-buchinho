import type { CapacitorConfig } from '@capacitor/cli';

/** Casca nativa do PWA: o mesmo build de `dist/` roda dentro do app Android e iOS. */
const config: CapacitorConfig = {
  appId: 'br.com.queimabuchinho.app',
  appName: 'Queima Buchinho',
  webDir: 'dist',
  backgroundColor: '#0b1120',
  server: { androidScheme: 'https' },
  plugins: {
    // Com o app aberto, a notificação também aparece como banner nativo.
    FirebaseMessaging: { presentationOptions: ['badge', 'sound', 'alert'] },
  },
};

export default config;
