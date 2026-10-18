# NOVA INVEST Android build

The Android wrapper uses Capacitor and has the application ID
`com.novainvest.app`.

## Prerequisites

- JDK 21
- Android Studio with Android SDK Platform 36 and Build Tools installed
- `ANDROID_HOME` configured by Android Studio
- Node.js and pnpm versions from `.mise.toml`

## Debug APK

From the repository root:

```sh
pnpm install
pnpm android:apk
```

The APK is written to:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## Build entirely on GitHub

The workflow in `.github/workflows/android-apk.yml` builds an installable debug
APK without a local Android development environment.

1. Put this repository on GitHub with `main` as its default branch.
2. Open the repository's **Actions** tab.
3. Select **Build Android APK**.
4. Choose **Run workflow**, then wait for the build to complete.
5. Open the completed workflow run and download the
   `nova-invest-debug-apk-*` artifact.
6. Extract the downloaded ZIP to obtain `app-debug.apk`.

The workflow also runs automatically when relevant files are pushed to `main`.
GitHub keeps each APK artifact for 14 days.

The debug APK is suitable for direct testing but not for Google Play. A Play
Store release requires a consistently signed release AAB and protected GitHub
Actions secrets.

To work in Android Studio:

```sh
pnpm android:sync
pnpm android:open
```

Always run `pnpm android:sync` after changing the web application.

## Backend deployment

Deploy `supabase/functions/server/index.tsx` from the Make settings page before
testing registration. The first account can use the founding invite
`NI-A8M2K9`; every successfully created account receives its own random,
server-generated `NI-XXXXXX` code.

## Release

Create and protect a private Android signing key, then configure release
signing locally or in CI. Never commit a keystore or its passwords. Use Android
Studio's **Generate Signed Bundle / APK** workflow to produce a signed APK or
Play Store AAB.

Production release also requires:

- A privacy policy and terms reviewed for every operating jurisdiction
- Financial-services, custody, referral-program, KYC/AML, and securities review
- A vetted KYC provider; do not store identity documents in the prototype KV
  store
- Server-side admin roles, audit logs, rate limits, monitoring, backups, and
  transactional financial ledgers
- Play Console declarations and testing tracks
