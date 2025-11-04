import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.campusstore.app',
  appName: 'CampusStore',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
    iosScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#6366f1",
      androidSplashResourceName: "splash",
      iosSpinnerStyle: "small",
      spinnerColor: "#ffffff",
      showSpinner: true
    }
  }
};

export default config;
