import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.pokerlegend.app',
  appName: 'Poker Legend',
  // Capacitor ships whatever `npm run build` produced.
  webDir: 'dist',
  ios: {
    // The overworld draws to the very edges; the UI handles safe areas itself.
    contentInset: 'never',
    backgroundColor: '#14141f',
  },
  server: {
    // Avoids the WKWebView treating swipes as navigation gestures.
    iosScheme: 'app',
  },
}

export default config
