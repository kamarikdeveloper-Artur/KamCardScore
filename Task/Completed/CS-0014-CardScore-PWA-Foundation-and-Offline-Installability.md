# CS-0014 — CardScore PWA Foundation and Offline Installability

## Project
CardScore

## Baseline
Use `CardScore_06(3)` after completed CS-0013 as the authoritative baseline.

This task introduces the first PWA foundation for CardScore.

Preserve all Pokerochok and Mariage gameplay, scoring, persistence, table behavior, and UI logic unless explicitly required for PWA integration.

The project is still in active development/testing. Do not add legacy-save migration work.

Do NOT add Git, GitHub, deployment pipelines, Builds, or automatic ZIP generation.

---

# Objective

Make CardScore ready to behave as an installable Progressive Web App when served from HTTPS or localhost.

Implement:

1. Web App Manifest.
2. PWA app icons.
3. Manifest/meta integration in `index.html`.
4. `viewport-fit=cover`.
5. Service Worker registration.
6. Offline application-shell caching.
7. Safe cache versioning/update behavior.
8. Standalone display mode.
9. Basic installability/offline verification.

Do NOT add a custom in-app Install button in this task. Native browser installation UI / Add to Home Screen is sufficient for the first PWA stage.

---

# 1. Update viewport

Change the current viewport declaration to:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
```

Keep the existing responsive layout.

This must remain compatible with the safe-area CSS already used by the fixed Pokerochok bottom status bar.

---

# 2. Web App Manifest

Create at the project root:

```text
manifest.webmanifest
```

Use CardScore identity.

Required manifest members:

```json
{
  "name": "CardScore",
  "short_name": "CardScore",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "background_color": "...",
  "theme_color": "...",
  "icons": [...]
}
```

Choose `background_color` and `theme_color` from the existing CardScore visual design rather than introducing an unrelated palette.

Do not use absolute production-domain URLs. Keep the app relocatable under a normal web directory by using correct relative paths.

Include at least:

```text
192x192 PNG
512x512 PNG
```

Also provide maskable-compatible icon entries if practical.

Do not set `prefer_related_applications` to true.

---

# 3. PWA Icons

Create a dedicated folder:

```text
assets/icons/
```

Required files:

```text
assets/icons/icon-192.png
assets/icons/icon-512.png
```

The icons must:

- be valid PNG files at the declared exact dimensions;
- be clearly recognizable as CardScore;
- work against launcher backgrounds;
- not depend on network resources;
- not use copyrighted third-party logos/artwork;
- have enough safe padding for launcher masking.

If creating a maskable-specific icon set, use clear names such as:

```text
icon-maskable-192.png
icon-maskable-512.png
```

and declare them with:

```json
"purpose": "maskable"
```

If one safely padded icon is suitable for both normal and maskable presentation, manifest entries may use an appropriate standards-compatible `purpose` value.

Do not download icon assets from the internet.

---

# 4. Manifest and PWA metadata in `index.html`

Inside `<head>`, add:

```html
<link rel="manifest" href="./manifest.webmanifest">
```

Add an appropriate:

```html
<meta name="theme-color" content="...">
```

matching the manifest.

Add an Apple touch icon reference using the best available local CardScore icon, for example:

```html
<link rel="apple-touch-icon" href="./assets/icons/...">
```

If needed, create a suitable local Apple touch icon from the same CardScore icon source.

Do not add obsolete or unnecessary PWA meta tags merely by copying old tutorials.

---

# 5. Service Worker

Create at the project root:

```text
service-worker.js
```

Register it from the application JavaScript only when supported:

```javascript
if ("serviceWorker" in navigator) {
    // register after page load or at an appropriate safe point
}
```

Use a relative/root-correct registration URL suitable for this project structure.

Registration failure must not break CardScore.

Do not make gameplay depend on service-worker availability.

---

# 6. Offline App Shell

The service worker must cache the local resources required to launch and use the current CardScore application offline after a successful online load.

At minimum review and include the actual current project shell/resources, including as applicable:

```text
./
./index.html
./manifest.webmanifest
./css/style.css
./js/app.js
./js/storage.js
./js/games/poker.js
./js/games/mariage.js
./assets/backgrounds/bg_games.png
./assets/suits/spades.svg
./assets/suits/hearts.svg
./assets/suits/clubs.svg
./assets/suits/diamonds.svg
./assets/icons/...
```

Also include other runtime-local assets actually referenced by the current application.

Do NOT blindly cache:

```text
Task/
Task/Reports/
Task/Completed/
```

or development/documentation files.

Do not cache user game state manually in the service worker. Existing `localStorage` persistence remains authoritative for game data.

---

# 7. Caching Strategy

CardScore is currently a small static application.

Use a simple, understandable service-worker strategy appropriate for static application assets.

Requirements:

- application shell must remain available offline after initial successful caching;
- same-origin static assets should be served reliably;
- navigation to the app should have a sensible offline fallback to cached `index.html`;
- external/cross-origin requests, if any appear later, must not be blindly cached;
- failed fetches must not crash the service worker;
- do not interfere with `localStorage`.

Keep the service worker readable and maintainable. Avoid adding a PWA framework or dependency for this task.

---

# 8. Cache Versioning and Updates

Use an explicit cache version/name, conceptually:

```javascript
const CACHE_NAME = "cardscore-v1";
```

During `activate`, remove obsolete CardScore caches created by this service worker.

Do not delete unrelated origin caches.

Implement normal lifecycle handling so a newly deployed CardScore version can replace old cached application assets without requiring the user to manually clear browser data.

Use `skipWaiting()` / `clients.claim()` only if implemented deliberately and safely. Document the chosen update behavior in the report.

Do not implement a complex update-notification UI in CS-0014.

---

# 9. Offline Behavior

After CardScore has been loaded successfully at least once through a supported secure context:

- opening/reloading the application without network should load the cached app shell;
- Pokerochok should remain usable;
- Mariage should remain usable;
- existing localStorage game state should remain available;
- no game data should be reset merely because the app is offline;
- local images/background/suit assets required by the current UI should still load.

Do not add fake server synchronization.

CardScore remains local-first in this task.

---

# 10. Standalone Behavior

Manifest must request:

```json
"display": "standalone"
```

When installed and launched from the OS/home screen, CardScore should be able to open without normal browser navigation chrome where the platform supports standalone PWA display.

Do not switch to `fullscreen` in this task.

The app must still work normally when opened as an ordinary browser website.

---

# 11. Secure Context Requirement

Do not attempt to make service workers work under `file://`.

Document in the report that PWA installability/service workers require the project to be served through:

```text
HTTPS
```

or for local development:

```text
http://localhost
http://127.0.0.1
```

Do not hard-code a production hosting provider or deployment target.

Do not add deployment configuration in this task.

---

# 12. No Custom Install Button Yet

Do NOT add:

```text
Встановити
Install App
Add to Home Screen
```

buttons or a custom `beforeinstallprompt` flow in CS-0014.

First establish a clean standards-based PWA foundation.

A custom install UX can be considered in a later task after Android/iOS testing.

---

# 13. Preserve Existing CardScore Logic

PWA work must not change:

## Pokerochok
- round chronology;
- ORDER/ACTUAL rules;
- Pass rules;
- scoring;
- special rounds;
- fixed `roundOrderStatus`;
- final results;
- current-game persistence/history.

## Mariage
- 3/4-player restriction;
- 500/420 maximums;
- Order validation;
- arbitrary result entry;
- Bite;
- Ski;
- Repaint;
- current-game persistence.

Do not rename existing localStorage keys solely for PWA work.

---

# 14. Required Tests

## Static validation
Verify:

```text
manifest.webmanifest
service-worker.js
assets/icons/icon-192.png
assets/icons/icon-512.png
```

exist.

Verify PNG dimensions are exactly correct.

Verify all manifest icon paths resolve to real files.

Verify manifest JSON is valid.

Verify all JavaScript files pass syntax checks, including `service-worker.js`.

## HTML
Verify `index.html` contains:

```text
viewport-fit=cover
manifest link
theme-color
Apple touch icon
```

Verify no duplicate viewport declaration.

## Service Worker
Serve the project through localhost.

Verify service worker registers successfully.

Verify the expected CardScore cache is created.

Verify app-shell resources are cached.

Verify development `Task/` files are not cached.

## Offline
1. Load CardScore online through localhost.
2. Confirm service worker is active.
3. Disable network / use browser Offline mode.
4. Reload.
5. Verify CardScore opens.
6. Verify CSS, JS, background and suit assets load.
7. Verify Pokerochok can be opened/used.
8. Verify Mariage can be opened/used.
9. Verify an existing localStorage current game remains available.

## Update behavior
Change/increment the service-worker cache version in a controlled test if practical and verify obsolete CardScore caches are removed without deleting unrelated caches.

## Manifest/installability
Use browser DevTools/Application or equivalent to verify:

- manifest is detected;
- `name` / `short_name` are correct;
- `start_url` resolves;
- `scope` is correct;
- `display` is `standalone`;
- 192 and 512 icons are detected;
- no obvious manifest errors prevent installation.

## Regression
Run critical Pokerochok and Mariage smoke tests.

Specifically verify the CS-0013 fixed bottom order-status bar still respects safe-area spacing after adding `viewport-fit=cover`.

---

# 15. Acceptance Criteria

CS-0014 is complete when:

1. `manifest.webmanifest` exists and is linked.
2. CardScore manifest uses `display: "standalone"`.
3. Manifest has valid 192x192 and 512x512 local PNG icons.
4. `viewport-fit=cover` is enabled.
5. theme-color metadata is configured.
6. an Apple touch icon is configured from local CardScore assets.
7. `service-worker.js` exists and registers safely.
8. the current application shell is cached for offline use.
9. CardScore reloads offline after a successful initial online load.
10. localStorage game state is not replaced by service-worker storage.
11. obsolete CardScore service-worker caches are cleaned safely.
12. unrelated origin caches are not deleted.
13. `Task/` development files are not cached.
14. no custom install button is introduced.
15. CardScore still works as a normal website.
16. CardScore is structurally ready for Add to Home Screen / PWA installation when served through HTTPS or localhost and supported by the browser.
17. Pokerochok behavior remains intact.
18. Mariage behavior remains intact.
19. fixed bottom `roundOrderStatus` remains correct with safe areas.
20. all JavaScript syntax checks pass.

---

# Scope Restrictions

Do NOT:

- add deployment/hosting configuration;
- choose a production domain;
- add Git/GitHub;
- add Builds;
- create automatic ZIP files;
- add cloud synchronization;
- replace localStorage;
- add push notifications;
- add background sync;
- add a custom install prompt/button;
- add third-party PWA frameworks;
- redesign the game UI;
- change gameplay rules;
- cache `Task/` documentation;
- attempt to support service workers through `file://`.

---

# Deliverables

Task lifecycle:

```text
Task/Inbox/CS-0014-CardScore-PWA-Foundation-and-Offline-Installability.md
→ Task/In_Progress/CS-0014-CardScore-PWA-Foundation-and-Offline-Installability.md
→ Task/Completed/CS-0014-CardScore-PWA-Foundation-and-Offline-Installability.md
```

Create:

```text
Task/Reports/CS-0014-CardScore-PWA-Foundation-and-Offline-Installability-Report.md
```

The English report must document:

- implementation summary;
- files created/modified;
- manifest configuration;
- icon files and dimensions;
- viewport/theme metadata;
- service-worker registration;
- cached application-shell resources;
- caching strategy;
- cache version/update strategy;
- offline test results;
- manifest/installability test results;
- localhost test method;
- confirmation that `Task/` files are not cached;
- confirmation localStorage persistence remains authoritative;
- Pokerochok regression results;
- Mariage regression results;
- JavaScript syntax-check results;
- any browser/platform limitation discovered during testing.

Do NOT create a ZIP archive.

The user will manually create and provide the project archive after Codex completes the task.
