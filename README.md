# Executive Dashboard

Browser-based executive analytics dashboard for PlaySpare performance data. The app is a static HTML/CSS/JavaScript project that talks to a Google Apps Script backend for dashboard data, LTV data, authentication, user management, and shared targets.

## Folder Structure

```text
Executive Dashboard/
├── index.html
├── README.md
├── assets/
│   └── images/
│       ├── playspare-cube.png
│       └── playspare-wordmark.png
├── css/
│   └── style.css
└── js/
    ├── utils.js
    ├── targets.js
    ├── login.js
    ├── dashboard.js
    ├── charts.js
    ├── users.js
    ├── ltv.js
    └── app.js
```

## Key Files

`index.html`  
Defines the application markup, tab panels, modals, dashboard sections, script loading order, external libraries, and Content Security Policy.

`css/style.css`  
Contains all visual styling for the login screen, dashboard layout, charts, KPI cards, targets UI, LTV tables, modals, responsive behavior, and theme variants.

`assets/images/`  
Stores extracted image assets used by the loader, login screen, brand area, and favicon runtime setup.

## JavaScript Files

Scripts are loaded as classic browser scripts, not ES modules. They share globals, so the order in `index.html` matters.

`js/utils.js`  
Must load first. Provides shared helpers, formatting functions, DOM lookup/cache helpers, HTML escaping, static selector caching, API config, session helpers, local lockout helpers, global app state, loader/toast helpers, and date reference utilities.

`js/targets.js`  
Owns target storage and target editing. Handles default target generation, localStorage persistence, server sync, monthly/quarter/annual target calculations, target preview rendering, per-game ROI target inputs, and the bulk target modal.

`js/login.js`  
Owns authentication UI and session restore/logout flow. Handles password hashing, login requests, local attempt tracking, file-protocol warning modal, role-based UI visibility, session expiry, and initial dashboard data loading after login.

`js/dashboard.js`  
Owns top-level dashboard interactions and data preparation. Handles tab switching, theme switching, dashboard data loading, refresh timers, CSV/JSON parsing, date presets, date inputs, filter dropdowns, and filtered/previous-period data generation.

`js/charts.js`  
Owns the main dashboard visualizations and exports. Renders KPI cards, spark charts, daily overview chart, month projection, quarterly gauge, monthly achievement table, target chart, alerts, game analysis, ROI ranking, daily summary, CSV export, and PDF export.

`js/users.js`  
Owns the user management modal. Lists users, changes roles, removes users, adds new users, hashes new user passwords, and calls the backend user-management actions.

`js/ltv.js`  
Owns the LTV tab. Loads LTV data, parses app names, manages LTV filters, renders LTV KPI tiles, cumulative curves, forecast chart, performance trends, cohort heatmap, leaderboard, day chips, forecast controls, and sort/show-all interactions.

`js/app.js`  
Runs app bootstrap behavior. Sets the favicon, restores login state on page load, wraps theme switching so LTV charts repaint correctly, binds static event handlers, and registers delegated handlers for dynamically rendered controls.

## Script Load Order

The scripts are loaded in this order:

```html
<script src="js/utils.js"></script>
<script src="js/targets.js"></script>
<script src="js/login.js"></script>
<script src="js/dashboard.js"></script>
<script src="js/charts.js"></script>
<script src="js/users.js"></script>
<script src="js/ltv.js"></script>
<script src="js/app.js"></script>
```

Keep `utils.js` first because it defines shared helpers and state. Keep `app.js` last because it binds handlers that call functions from the other files.

## How To Run

Do not open `index.html` directly with `file://`; browser security can block backend requests.

From the project folder, run a local static server:

```bash
python -m http.server 8080
```

Then open:

```text
http://127.0.0.1:8080/
```

Alternative options:

- Use VS Code Live Server.
- Deploy the static folder to Netlify, GitHub Pages, or another static host.

The app expects `SHEET_API_URL` in `js/utils.js` to point to a deployed Google Apps Script `/exec` endpoint.

## How To Add New Dashboard Pages

1. Add a new tab button in `index.html`:

```html
<button class="tabBtn" data-tab="new-page">New Page</button>
```

2. Add a matching panel in `index.html`:

```html
<div class="tabPanel" id="tab-new-page">
  <div class="main">
    <!-- page content -->
  </div>
</div>
```

3. Add page-specific rendering code to the most relevant JS file, or create a new file if the page is large.

4. If the new page needs startup behavior when opened, update `switchTab()` in `js/dashboard.js`:

```js
if(name === 'new-page') renderNewPage();
```

5. If the page has static buttons or inputs, bind them in `bindStaticHandlers()` in `js/app.js`.

6. If the page renders controls dynamically with `innerHTML`, prefer `data-*` attributes plus delegated handlers in `js/app.js`.

7. If the page displays data from the backend or sheets, escape text with `escapeHTML()` or assign text through `textContent`.

8. If the page uses repeated static selectors, add them to `staticDom` and `cacheStaticDom()` in `js/utils.js`.

## Development Notes

- Keep UI behavior and business calculations separate where possible.
- Avoid inline event attributes such as `onclick`.
- Use existing formatting helpers like `fm`, `fmK`, `fmFull`, `fr2`, and `fmtLbl`.
- Use `g(id)` for ID lookups so the shared cache can reduce repeated DOM queries.
- Preserve script order unless converting the project to ES modules as a dedicated refactor.
- Run syntax checks after editing JavaScript:

```bash
node --check js/utils.js
node --check js/targets.js
node --check js/login.js
node --check js/dashboard.js
node --check js/charts.js
node --check js/users.js
node --check js/ltv.js
node --check js/app.js
```
