// Isolated test APK only; transport is loopback through adb reverse.
// Expo loads local config plugins as CommonJS.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { withAndroidManifest } = require('expo/config-plugins');
module.exports = (config) => withAndroidManifest(config, (value) => {
  value.modResults.manifest.application[0].$['android:usesCleartextTraffic'] = 'true';
  return value;
});
