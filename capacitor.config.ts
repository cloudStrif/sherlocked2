import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sherlocked.mindpalace',
  appName: 'Sherlocked',
  webDir: 'dist/sherlocked/browser',
  bundledWebRuntime: false,
  plugins: {
    Camera: {
      presentationStyle: 'fullscreen'
    }
  }
};

export default config;
