import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
function run(...args) {
  const result = spawnSync(process.execPath, ['node_modules/@capacitor/cli/bin/capacitor', ...args], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}
for (const platform of ['android', 'ios']) if (!existsSync(platform)) run('add', platform);
const plist = 'ios/App/App/Info.plist';
let ios = readFileSync(plist, 'utf8');
if (!ios.includes('NSMicrophoneUsageDescription')) ios = ios.replace('<key>LSRequiresIPhoneOS</key>', '<key>NSMicrophoneUsageDescription</key>\n<string>Record prayers in your own voice for playback and sharing.</string>\n<key>LSRequiresIPhoneOS</key>');
writeFileSync(plist, ios);
const manifest = 'android/app/src/main/AndroidManifest.xml';
let android = readFileSync(manifest, 'utf8').replace('android:allowBackup="true"', 'android:allowBackup="false"');
if (!android.includes('android.permission.RECORD_AUDIO')) android = android.replace('</manifest>', '<uses-permission android:name="android.permission.RECORD_AUDIO" />\n<uses-feature android:name="android.hardware.microphone" android:required="false" />\n</manifest>');
writeFileSync(manifest, android);
run('sync');
