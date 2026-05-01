import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.freshkeep.app',
  appName: 'FreshKeep',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
