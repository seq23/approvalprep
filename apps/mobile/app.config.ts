import type { ExpoConfig } from 'expo/config';
// @ts-ignore release guard is also run directly by Node
import { assertReleaseReady } from './scripts/release-gate.mjs';
// Bundle id com.approvalprep.app is registered in App Store Connect (app id 6834891489).
// Light only: the approved brand has no dark theme (spry brain, ApprovalPrep brand, 6 Nov 2026).
const config: ExpoConfig = {
  name: 'ApprovalPrep', slug: 'approvalprep', owner: 'seq23', version: '1.0', scheme: 'approvalprep',
  orientation: 'portrait', userInterfaceStyle: 'light',
  icon: './assets/icon.png',
  ios: { bundleIdentifier: 'com.approvalprep.app', supportsTablet: false,
    infoPlist: { ITSAppUsesNonExemptEncryption: false, UIFileSharingEnabled: false } },
  android: { package: 'com.approvalprep.app', allowBackup: false,
    adaptiveIcon: { foregroundImage: './assets/adaptive-icon.png', backgroundColor: '#FF7A3D' },
    blockedPermissions: ['android.permission.RECORD_AUDIO', 'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_COARSE_LOCATION', 'android.permission.READ_CONTACTS', 'android.permission.CAMERA'] },
  extra: { eas: { projectId: '378c0655-6268-4a12-8bfe-d615ed402858' } },
  updates: { enabled: false },
  plugins: ['expo-router', 'expo-font', 'expo-notifications', ['expo-splash-screen', { image: './assets/splash.png', imageWidth: 160, backgroundColor: '#F7F3EA' }]],
};
if (process.env.EAS_BUILD_PROFILE === 'production') {
  assertReleaseReady({ env: process.env, iosBundleId: config.ios?.bundleIdentifier, androidPackage: config.android?.package });
}
export default config;
