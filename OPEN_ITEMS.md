# Open Items

## Launch Blocking

### 1. Google Maps API key unrestricted
The key `AIzaSyDE81zzchDXalQuGapH-E8tBBjnN9fT304` is committed in plain text in `frontend/app.json`. It is not restricted by bundle ID or SHA-1 fingerprint in Google Cloud Console. Anyone can extract it from the APK and use it.
**Fix:** In Google Cloud Console → Credentials → restrict the key to package `app.koord` + the release SHA-1 fingerprint.

### 2. iOS App Store ID placeholder
`EXPO_PUBLIC_APP_STORE_URL` is set to `id0000000000` in `eas.json` production env and in `StoreButtons.tsx` fallback. This breaks the App Store deeplink.
**Fix:** Create the app in App Store Connect, get the real numeric app ID, update `eas.json` and the `.env.production.example`.

### 3. Push notification credentials not configured
`expo-notifications` is installed and used but APNs (iOS) and FCM (Android) credentials have not been set up in EAS.
**Fix:** Run `eas credentials` and configure both platforms before production build.

### 4. Production Google Maps key missing from EAS env
`EXPO_PUBLIC_GOOGLE_MAPS_KEY` is in `.env` (dev key) but not in the `eas.json` production `env` block. Android production builds will embed the dev key.
**Fix:** Add `EXPO_PUBLIC_GOOGLE_MAPS_KEY` to the production profile env in `eas.json`, using the restricted production key.

---

## Non-Blocking (fix before v1.1)

### 5. 162 console.log statements in production code
Internal data (user IDs, assignment data, tokens) leaks to device logs. Visible to anyone with a connected device.
**Fix:** Gate all logs behind `if (__DEV__)` or strip with a babel plugin.

### 6. LocationTimelineMap is a placeholder
`src/app/(manager)/components/LocationTimelineMap.tsx` shows 'Map and Timeline will be displayed here.' It is not imported anywhere currently so it does not affect users, but needs a real implementation.
**Status:** Not launch blocking since unused.

---

## GDPR / Data

### 7. Data aggregation and anonymisation review
See separate GDPR analysis discussion. Worker location data, work sessions, and payroll data must be reviewed for retention periods, anonymisation on deletion, and data processor agreements.
