# Koordinate launch tracker

Status: ✅ done · 🟡 in progress · ⬜ to do · 👤 needs you (outside the code)

"Verified" says how the change was checked. Nothing below has been tested on a phone yet.
Android = `gradlew :background-location:compileDebugKotlin`. JS = `npx tsc --noEmit`.
iOS Swift can't be compiled on the dev Windows machine, so iOS changes are unverified until an Xcode build.

---

## 1. Blocks any launch

| # | Item | Status | Notes |
|---|------|--------|-------|
| B1 | Build both apps and field-test on real phones | 👤 | Xcode build for iOS. Test: check in on site, stay indoors, leave, reboot the phone, swipe the app away, location off and on, offline for a while, manager ends a shift while the app is closed. |
| B2 | Google Play background-location declaration and video | 👤 | Play Console > App content > Location permissions. Needs a short video of the feature. |
| B3 | Privacy labels (App Store) and Data safety form (Play) | 👤 | Must match what the app collects (location, name, email, device ID). |
| B4 | In-app account deletion | ⬜ | Required by both stores. Overlaps with G4. |

---

## 2. Tracking module

### Done

| Item | Commit | Verified |
|------|--------|----------|
| Failed uploads are retried instead of deleted; permanent rejects kept locally (`synced = 2`) | 2ddb1b3 | Android, iOS by reading |
| iOS Keychain readable while the phone is locked; credentials kept until the queue is empty | 2ddb1b3 | iOS by reading |
| Server: no HMAC/token in errors, 30-day age window (applied to dev and prod) | root 9610701 | applied with `supabase db push` |
| First mode switch actually starts location updates (both platforms) | 3e9f471 | Android, iOS by reading |
| iOS resumes in the saved mode after a relaunch; CoreLocation set up on the main thread | 3e9f471 | iOS by reading |
| Stale native tracking is stopped when the server confirms no active shift | d21e4d3, fe5efbd | JS |
| New check-in never inherits the previous session's state (work session ID passed to native) | dc66714 | Android, JS, iOS by reading |
| Check-in race in the stale-tracking stop closed | dc66714 | JS |
| iOS: GPS (≤ 50 m) required to cancel EXIT_PENDING; OS exits verified with a fresh fix | 6586a31 | iOS by reading |
| iOS: background task identifier fixed, safe to register twice | 6586a31 | iOS by reading |
| Android: inside/outside state survives restarts; mode follows confirmed state; stale flags cleared | cc57925 | Android |
| Android: geofence receiver not exported; restart after app update; geofences re-registered when location comes back; `startForeground` guarded | 6fe4189 | Android |
| Android: battery prompt opens the optimization list (no restricted permission) | 6fe4189 | Android, JS |
| T1: EXIT_PENDING time limit. After 10 min without a GPS decision, back to PASSIVE (force-checks continue) | 680c9ff | Android, iOS by reading |
| T2: coordinates in log files rounded to 2 decimals (~1 km); Android logger made thread-safe | 680c9ff | Android, iOS by reading |
| T3: events stamped with the time of the reading (falls back to now if older than 1 h or ahead by over 1 min) | 680c9ff | Android, iOS by reading |
| T4: mock-location detection. Readings from a fake GPS app are tagged `[MOCK_LOCATION]` in the event notes (Android `isMock`, iOS `isSimulatedBySoftware`, Android check-in via expo-location `mocked`). Managers see a warning banner on the worker's daily details. Flag only, nothing is blocked. A rooted phone can hide the flag | 1d568cd | Android, JS, iOS by reading |
| T8: `exit_pending_tracking` events no longer stored (decision: they add rows and uploads but nothing uses them). The 30 s GPS checking that verifies an exit is unchanged | 1d568cd | Android, iOS by reading |
| G5: sub-processor list corrected. Supabase region fixed (Ireland, not Frankfurt), Resend, Geoapify, map providers and jsDelivr added, "no transfers outside the EEA" statement replaced. Expo/Apple/Google push are NOT used (no push token is ever created) so they are not listed | 881e271 | `tsc` |
| G10: flag images bundled in the app (8 PNGs, new `CountryFlag` component). The old package loaded every flag from `flagcdn.com`, so worker IP addresses went to a third party from the language picker. Package removed; no CDN references left in the web bundle. My earlier note about jsDelivr was wrong: those URLs in `countries.ts` were never used and are deleted | 3557c63 | `tsc`, web bundle scan |
| G11: provider details checked against their own DPAs and corrected in the privacy policy and DPA. Vercel Inc. (SCCs), Stripe Payments Europe + Stripe, Inc. (Data Privacy Framework + SCCs), Resend (processing mainly in the USA, SCCs), Supabase Pte. Ltd. (EU Ireland), Geoapify (EU) | 3557c63 | provider DPA pages |

### Before public launch

| # | Item | Status | Effort | Notes |
|---|------|--------|--------|-------|
| T5 | Tell the worker when tracking degrades | ⬜ | M | Location off, permission reduced to "While using", approximate location. |
| T6 | Battery: overlapping wake-ups (Android), 1 Hz GPS with no distance filter (iOS) | ⬜ | M–L | Needs device measurements before and after. |
| T7 | Native background retry of the upload queue | ⬜ | M | Today the queue uploads when the app opens or at transitions. |
| T9 | Android receiver and service apply different exit rules | ⬜ | M | One shared rule set. |

---

## 3. GDPR and legal

| # | Item | Status | Effort | Notes |
|---|------|--------|--------|-------|
| G1 | German versions of Privacy, Terms, DPA, Impressum | ⬜ | M | Drafts, then lawyer review (G7). |
| G2 | Rework the worker notice | ⬜ | M | Name the employer as controller, add purposes, recipients, full rights list; record "acknowledged" instead of consent; store per user, versioned. |
| G3 | Deletion schedules for data without one | ⬜ | M | Pending invites, `consent_logs` IP/user agent, chat messages, avatars, removed employees, derived location summaries. Check `pg_cron` runs in prod. |
| G4 | Data export and deletion tools | ⬜ | L | Promised in the privacy policy. Covers B4. |
| G5 | Full sub-processor list in the privacy policy | ✅ | – | Done in 881e271, see the tracking table above. Follow-ups G9 to G11. |
| G9 | Web map tiles: attribution missing, and an unnamed middleman | ✅ | - | Done. (1) Removed `attributionControl={false}` from the three web maps, so the OpenFreeMap / OpenMapTiles / OpenStreetMap credit shows. It is open on load and folds into an "i" button after the first drag on maps under 640 px wide. (2) Style URL switched to `https://tiles.openfreemap.org/styles/bright` in the three web maps. DPA row and privacy section 6 now name OpenFreeMap (Hyperknot Software Kft., Hungary). Remaining for you: none. |
| G10 | Flag images loaded from a CDN | ✅ | – | Done in 3557c63, see the tracking table above. |
| G11 | Verify provider details | 👤 | S | Done from the providers' own DPA pages. Still needs you: (a) **Vercel plan.** Vercel's DPA covers Pro and Enterprise plans only, check yours (as far as I know the free Hobby plan is also limited to non-commercial use). (b) **Resend.** I could not confirm Resend is configured for production; check Supabase dashboard > Authentication > SMTP on the prod project. (c) Google/Apple map locations are listed as "Global infrastructure" because I could not verify more. |
| G6 | Record of processing, security measures (TOMs), breach process | 👤 | M | Drafts can be written here; you own them. |
| G7 | Data-protection lawyer review | 👤 | – | DPA, Terms, privacy policy, works-council question (§87 BetrVG). |
| G8 | Impressum | ✅ | – | DDG/MStV references, ODR link removed, VAT ID, link in worker app. |

---

## 4. Security

| # | Item | Status | Notes |
|---|------|--------|-------|
| S1 | Google Maps API key | 👤 | The key ships inside the app no matter what, so the fix is to restrict it in Google Cloud Console: Android apps (package `app.koordinate` + signing SHA-1) and iOS apps (bundle `app.koordinate`), Maps SDK APIs only. A hard-coded fallback key is also in `app.config.js`. |
| S2 | Server `insert_location_event` doesn't check company/assignment, no `search_path` | ⬜ | Small migration. |
| S3 | `.env` is committed to git | 👤 | Only `EXPO_PUBLIC_*` values (they end up in the app anyway), so not a leak today. Keep server secrets out of it; consider untracking it and keeping `.env.example`. |
| S4 | Geoapify API key in the app | 👤 | Restrict it to your domains/app IDs in the Geoapify dashboard. |
| S5 | **`create-worker-invite` is stale on both projects** | ✅ | Deployed `create-worker-invite` (version 7) to dev and prod on 25 Nov, including the seat-limit logic (pending invites, scheduled downgrade). Server and app now enforce the same limit. Not yet tested end to end with a real invite. |
| S6 | `create-worker-invite` counts disabled workers as used seats | ✅ | Added `.eq('status', 'active')` to the worker count; committed in the root repo as `52e9fe4` and deployed with S5. |
| S7 | Two functions exist on dev with no source in the repo | ⬜ | `send-invite-email` and `create-employee-from-invite` are deployed on dev only and the app never calls them. Recover the source into git or delete them from dev. Prod has `update-employee-email`; dev does not. |
