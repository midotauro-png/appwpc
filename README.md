# Women Impact Club — mobile app

Native iOS/Android wrapper (Expo SDK 57 + React Native WebView) around
https://www.womenimpactclub.com.

App identity:
- Display name: `Women Impact Club`
- Bundle ID / package: `com.womenimpactclub.app`
- Icon and splash generated from the site's own icon; brand color `#B81C36`

Native behavior beyond a plain browser tab:
- Native splash screen, full-screen chrome-less experience
- Loading indicator and offline/error screen with retry + pull-to-refresh
- Android hardware back button navigates WebView history
- Links outside `womenimpactclub.com` (WhatsApp, Instagram, mailto, payment
  providers) open in the system browser/app instead of inside the WebView
- Cookies/localStorage persist, so member logins survive app restarts

## Run locally

```bash
npm install
npx expo start           # then press "a" for Android, or scan QR with Expo Go
npx expo run:android     # native debug build on an emulator/device
npx expo run:ios         # macOS + Xcode only
```

Note: `npx expo start --web` will show a blank frame, because the site sends
`X-Frame-Options: SAMEORIGIN` and cannot be embedded in a browser iframe. This
restriction does not apply to the native WebView, so the app works on device.

## Ship to the App Store

1. Enroll in the Apple Developer Program ($99/yr) and create the app record in
   App Store Connect with bundle ID `com.womenimpactclub.app`.
2. `npm install -g eas-cli && eas login`
3. `eas build --platform ios --profile production`
   (EAS builds on macOS in the cloud — no Mac needed; it will create/manage the
   signing certificate and provisioning profile for you.)
4. Fill in `eas.json` → `submit.production.ios` with your Apple ID, team ID and
   App Store Connect app ID, then `eas submit --platform ios --latest`.
5. In App Store Connect add screenshots (6.7" and 5.5"), description, keywords,
   support URL, and a privacy policy URL, then submit for review.

Apple review note: guideline 4.2 rejects apps that are only a repackaged
website. The wrapper above adds native affordances; the strongest additions
before submitting are push notifications for events and a native
events/members screen. Plan for that if the first submission is rejected.

Android/Play Store: `eas build --platform android --profile production` then
`eas submit --platform android --latest`.
