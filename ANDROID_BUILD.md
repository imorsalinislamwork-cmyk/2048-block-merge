# Android Build & Google Play Store AAB Guide — 2048 BLOCK MERGE

- **App Name:** `2048 BLOCK MERGE`
- **Package / App ID:** `com.morsalin.blockmerge2048`
- **Web Assets Directory:** `dist/`

---

## 1. Prerequisites

- **Node.js** 18+ and npm (always run `npm install` before opening `android/` so `node_modules/@capacitor/*` plugin modules resolve)
- **Java Development Kit (JDK)** 17 or 21 (JDK 21 recommended; Android Gradle config automatically aligns all Capacitor plugin Java variants for JDK 17 or 21)
- **Android Studio** (with Android SDK 36 & Platform Tools installed)

---

## 2. Build Web Assets & Sync Capacitor

Whenever you update web code (`src/`), build production assets and sync them into `android/`:

```bash
npm install
npm run cap:sync
```

This runs `vite build` (outputting to `dist/`) and `npx cap sync android` (copying assets to `android/app/src/main/assets/public` and updating native plugins).

---

## 3. Run & Test on Android Device or Emulator

```bash
# Run directly on a connected USB device or Android emulator
npm run android:run

# Or open the native project inside Android Studio
npm run cap:open
```

---

## 4. Create a Release Keystore (One-Time Setup)

Generate an upload keystore for Google Play App Signing (keep this file and its passwords backed up safely outside version control):

```bash
keytool -genkey -v \
  -keystore android/app/release-key.jks \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -alias blockmerge2048
```

Then copy `android/keystore.properties.example` to `android/keystore.properties` and fill in your credentials:

```properties
storeFile=release-key.jks
storePassword=YOUR_KEYSTORE_PASSWORD
keyAlias=blockmerge2048
keyPassword=YOUR_KEY_PASSWORD
```

> Note: `android/keystore.properties`, `*.jks`, and `*.keystore` are excluded from git in `.gitignore`. You may also provide credentials via environment variables (`RELEASE_STORE_FILE`, `RELEASE_STORE_PASSWORD`, `RELEASE_KEY_ALIAS`, `RELEASE_KEY_PASSWORD`).

---

## 5. Generate a Signed Android App Bundle (AAB) for Google Play

Run the AAB build script from the project root:

```bash
npm run android:aab
```

The signed Google Play App Bundle will be generated at:

```text
android/app/build/outputs/bundle/release/app-release.aab
```

To build a debug APK immediately without a release keystore:

```bash
npm run cap:sync && cd android && ./gradlew assembleDebug
```

Debug APK output path:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

To build a release APK for direct sideload testing instead:

```bash
npm run android:apk
```

Output path:

```text
android/app/build/outputs/apk/release/app-release.apk
```

---

## 6. Before Publishing a New Play Store Update

Increment `versionCode` and `versionName` inside `android/app/build.gradle`:

```groovy
defaultConfig {
    applicationId "com.morsalin.blockmerge2048"
    ...
    versionCode 2
    versionName "1.0.1"
}
```

Then run `npm run android:aab` and upload `app-release.aab` to the Google Play Console.

---

## 7. Play Store Readiness Summary

- **App Name:** `2048 BLOCK MERGE` (`android/app/src/main/res/values/strings.xml`)
- **Application ID / Package:** `com.morsalin.blockmerge2048` (`android/app/build.gradle`, `capacitor.config.ts`)
- **SDK Levels:** `minSdkVersion 24`, `compileSdkVersion 36`, `targetSdkVersion 36` (`android/variables.gradle`)
- **Versioning:** `versionCode 1`, `versionName "1.0.0"` (`android/app/build.gradle`)
- **App Icons & Splash:** Custom branded adaptive + legacy icons (`mipmap-mdpi` to `mipmap-xxxhdpi`), Play Store 512×512 icon (`android/playstore-icon-512.png`), and cosmic purple splash screens (`drawable-*`).
- **Release Security:** `webContentsDebuggingEnabled: false` (`capacitor.config.ts`), minimal `INTERNET` permission only (`AndroidManifest.xml`), and AAB splits enabled (`language`, `density`, `abi`).
