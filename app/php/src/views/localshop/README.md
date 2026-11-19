# Neighbourhood Enterprise

A local-first, zero-dependency website concept for former retail employees building independent businesses.

## Project structure

This is **Option B — a multi-file native ES-module SPA**.

```text
neighbourhood-enterprise/
├── index.html
├── README.md
├── styles/
│   └── main.css
└── js/
    ├── app.js
    ├── data.js
    ├── main.js
    ├── render.js
    ├── router.js
    ├── state.js
    └── utils.js
```

## Run locally

From this folder:

```bash
python3 -m http.server 5173
```

Open `http://localhost:5173`.

A local server is recommended because the application uses native JavaScript ES modules. No installation, build step, npm, framework, CDN or external asset is required.

## Included features

- Responsive neighbourhood-inspired landing page and custom inline SVG high-street illustration.
- Hash-based SPA navigation with deep links and browser back/forward support.
- Interactive business snapshot planner with illustrative break-even and daily-sales estimates.
- Searchable, filterable and sortable directory of 16 illustrative B2B support profiles.
- Save/favourite directory connections.
- Community events, local demo profile sign-up and a locally saved community thought.
- Light/dark/system theme preference, reduced-motion preference and local JSON import/export.
- Browser capability inspector and graceful fallbacks for optional platform features.
- Versioned localStorage state with defensive parsing and cross-tab refresh.

## Important prototype boundaries

This is a front-end demonstration. Profiles, events, member stories and example financial outputs are illustrative, not verified offers or advice. The prototype does not create secure accounts, send emails, accept payments, submit business registrations, book events, verify suppliers or connect to external services. A production service needs a secure backend, authentication, verified provider onboarding, privacy and data-retention controls, payment integrations and professional review.

## Manual QA checklist

- [ ] Check layout at 320px, 375px, 768px, 1024px and 1440px.
- [ ] Navigate using keyboard only; confirm visible focus and skip link.
- [ ] Check mobile navigation and Escape dismissal.
- [ ] Test planner inputs, save and reload.
- [ ] Search, filter, sort, favourite and open directory profiles.
- [ ] Open community event details and save a community thought.
- [ ] Switch light/dark/system preferences and reduced motion.
- [ ] Export JSON, reset data, then import the backup.
- [ ] Test direct routes (`#start`, `#directory`, `#community`, `#settings`) and browser back/forward.
- [ ] Inspect capability panel in more than one browser.
- [ ] Check screen-reader landmarks and live announcements.
- [ ] Confirm there is no horizontal overflow and no console error.
- [ ] Confirm the app makes no external network requests.

## Suggested next upgrades

1. Add secure user accounts and business-owner profiles.
2. Build verified supplier onboarding, reviews and quote requests.
3. Add a real B2B procurement workflow and supplier comparison.
4. Connect B2C storefronts, inventory, checkout and payment providers.
5. Add bookings, appointment calendars, order management and delivery integrations.
6. Add local authority, enterprise-agency and professional-adviser referral pathways.
7. Add moderation, reporting, privacy controls and accessible community messaging.
