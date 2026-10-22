# Trocado demo

A read-only demo of Trocado, a household expense tracker. It shows a year of made-up spending for two people, Bruno and Marina. Every name, amount and seller is invented.

Nothing is saved, nothing is imported and no AI is called. Open it in a browser and look around.

## How it works

- `scripts/demo/` writes a year of sample lines (Nov 2025 to Oct 2026) into a throwaway database.
- `scripts/demo/buildSnapshots.ts` runs the real Trocado server code against that database once and saves each screen's answer as a JSON file in `client/public/demo-data/`.
- The browser reads those files in place of calling a server. Filters on Transações run in the browser over the full year (`client/src/demo/`).

## Commands

- `npm ci` installs dependencies.
- `npm run dev` builds the sample data and starts the site on http://localhost:5173.
- `npm run build` builds the site into `client/dist/`.
- `npm run typecheck` and `npm run lint` check the code.

## Publishing

Every push to `main` builds the site and publishes it to GitHub Pages through `.github/workflows/pages.yml`. In the repository settings, set Pages to deploy from GitHub Actions.
