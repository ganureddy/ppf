# Purple Patch Farms — Capacitor + PWA hybrid

Two thin native shells (Android/iOS) that load the live PWAs served by ERPNext:

- `customer/` → loads `https://ppf.emrid.store/customer`
- `admin/`    → loads `https://ppf.emrid.store/admin`

This is the **hybrid** approach: the web app is still a normal installable PWA in
the browser, and the same hosted app is wrapped in a native shell for the app
stores. Because the webview navigates to the real origin, the Frappe login
session cookie and every API call work exactly as in the browser (no CORS, no
duplicate backend).

> The native binaries (`.apk` / `.aab` / `.ipa`) **must be built on a developer
> machine** with the Android SDK (Android Studio) and/or Xcode. They cannot be
> built on the ERPNext server.

## Prerequisites (on your dev machine)
- Node.js 18+
- Android: Android Studio + JDK 17
- iOS: macOS + Xcode + CocoaPods

## Build steps (Android, repeat in `customer/` and `admin/`)
```bash
cd customer            # or: cd admin
npm install
npx cap add android
npx cap sync
npx cap open android   # opens Android Studio → Run / Build APK or AAB
```

## Build steps (iOS)
```bash
cd customer            # or: cd admin
npm install
npx cap add ios
npx cap sync
npx cap open ios       # opens Xcode → Run / Archive
```

## App icons / splash
Drop a 1024×1024 PNG of the logo and run:
```bash
npm i -D @capacitor/assets
npx @capacitor/assets generate --iconBackgroundColor '#6B1170' --splashBackgroundColor '#FFFFFF'
```

## Notes
- `server.url` in `capacitor.config.ts` controls which hosted app the shell loads.
- `allowNavigation` keeps navigation inside `ppf.emrid.store`; external links open
  in the system browser.
- To ship a fully offline build instead of the hosted hybrid, copy the built web
  app (`apps/ppf/ppf/public/customer`) into `customer/www`, remove the `server.url`
  block, and enable CORS + `SameSite=None` cookies on ERPNext for the
  `capacitor://` / `https://localhost` origin. The hosted hybrid above avoids all
  of that and is the recommended path.
```
