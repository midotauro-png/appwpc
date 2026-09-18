# Submitting Women Impact Club to the App Store

## 0. Before you start
- Apple Developer Program membership, active ($99/yr).
- Publish `store/PRIVACY_POLICY.md` at a public URL (e.g. https://www.womenimpactclub.com/privacy) — Apple rejects submissions without a reachable privacy policy.
- Have `store/APP_STORE_LISTING.md` open for the copy.

## 1. Create the app record
1. https://appstoreconnect.apple.com → My Apps → "+" → New App.
2. Platform iOS, Name "Women Impact Club", Primary language English (U.K.), Bundle ID `com.womenimpactclub.app`, SKU `womenimpactclub-ios`.
   - If the bundle ID is not listed: https://developer.apple.com/account/resources/identifiers → "+" → App IDs → App → Bundle ID `com.womenimpactclub.app`, enable Push Notifications.
3. Note the Apple ID number shown on the app's App Information page (that is `ascAppId`).

## 2. Build and upload
Option A — Xcode (on your Mac):
```bash
cd WomenImpactClub
npm install
npx pod-install ios
open ios/WomenImpactClub.xcworkspace
```
- Select target "WomenImpactClub" → Signing & Capabilities → Team = your team, "Automatically manage signing" on.
- Device target: "Any iOS Device (arm64)" → Product → Archive → Distribute App → App Store Connect → Upload.

Option B — EAS (cloud build, no Xcode):
```bash
npm i -g eas-cli
eas login
eas build -p ios --profile production   # asks for Apple login, creates certs
eas submit -p ios --latest
```
Fill `eas.json` → `submit.production.ios` with your `appleId` (Apple ID email), `ascAppId` (from step 1.3) and `appleTeamId` (developer.apple.com → Membership) to skip the prompts.

## 3. TestFlight
- The build appears in TestFlight after ~10-30 min of processing.
- Answer the export compliance question: the app uses only standard HTTPS encryption → "No" to the exempt-encryption follow-up wording Apple shows for standard TLS (or set `ITSAppUsesNonExemptEncryption` to `false` in Info.plist to stop being asked).
- Add yourself under Internal Testing and install via the TestFlight app to verify on a real device.

## 4. Listing
- App Store tab → paste name, subtitle, promotional text, description, keywords, support/marketing/privacy URLs from `APP_STORE_LISTING.md`.
- Upload screenshots (6.7" iPhone required). Capture in the iOS Simulator (iPhone 16 Pro Max) with Cmd+S.
- App Privacy section → answer as listed in `APP_STORE_LISTING.md`.
- App Review Information → add the demo member account and the review notes.

## 5. Submit
Select the build → Add for Review → Submit. First reviews usually take 24-48 h.

## Rejection risks to watch
- **Guideline 4.2 (minimum functionality).** Mitigated by the native events list, offline bundled events, on-device reminders and push notifications — call these out in the review notes.
- **Guideline 3.1.1 (in-app purchase).** Paid membership is sold outside the app; the app must not link to an external purchase flow for digital membership. Keep "Join the Club" pointing at a membership enquiry (WhatsApp/contact), not a checkout page. If Apple treats membership as digital content, the alternatives are IAP or removing the purchase path from the app.
- **Guideline 5.1.1 (account deletion).** The Account tab now has a "Delete my account" control that confirms and sends a deletion request by email (WhatsApp fallback). Apple accepts a request flow for memberships that require manual verification, but a self-service delete inside the members dashboard is safer — add one when the backend supports it, and honour requests within 30 days as the privacy policy states.
