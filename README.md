# Monthlane

**Plan life, one month at a time.**

Monthlane is a calm, local-first personal calendar. Phase 1 provides a responsive
Monday-first month view, device-local event persistence with IndexedDB, event
creation and editing, soft deletion, default calendars, calendar filtering,
keyboard shortcuts, and a mobile day agenda.

## Development

Use Node.js 22 or newer.

```bash
npm install
npm run dev
```

Validation:

```bash
npm run typecheck
npm run test
npm run build
npm run build:pages
```

Monthlane stores event data in the browser's IndexedDB database named
`monthlane`. Clearing browser site data removes the local calendar, so backup
and restore support will be added before cloud synchronization.

## Keyboard shortcuts

- `N`: create an event on the selected day
- `T`: return to today
- `←` / `→`: switch months
- `Esc`: close the event editor

## GitHub Pages

Push the `main` branch to `Aprollov/monthlane`, then open **Settings → Pages**
and select **GitHub Actions** as the source. Every later push to `main` runs the
checked-in deployment workflow and publishes the static app at:

`https://aprollov.github.io/monthlane/`
