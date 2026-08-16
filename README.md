# Gatorade Showers league history

This is a historical fantasy-football dashboard for the Gatorade Showers Yahoo league. It shows championship records, podium finishes, draft-lottery history, championship results by draft slot, and first-round player history.

The public site is expected at:

https://itiseddie.github.io/gatorade-showers/

## How the data works

The website uses two small local data files:

- `public/data/champions.json` — championship, runner-up, third-place, and league-size history
- `public/data/drafts.csv` — each season's first-round order, manager, drafted player, and FAAB balance when available

The original source is the Google Sheet named **Yahoo Fantasy Football League All Time Info**. The site does not connect to Google Sheets while visitors are using it, so it remains fast and simple on GitHub Pages.

Historical names stay distinct. In particular, `Jane`, `Ryan`, and `Jane/Ryan` are separate identities. Any old `Richard` entry is displayed as `Rich` through the alias rule in `src/stats.js`; the source-history file does not need to be rewritten for that.

## Annual update — the four steps to remember

1. Update the league history in the Google Sheet.
2. Update or replace `public/data/champions.json` and `public/data/drafts.csv` with the new rows.
3. Commit the changes.
4. Push them to the `main` branch.

GitHub Pages rebuilds and publishes the site automatically after the push.

## Optional local preview

Local preview is optional. From this project folder, run:

```text
npm run dev
```

Open the address printed in the terminal. To stop the preview, press:

```text
Ctrl + C
```

If this is a fresh computer, run `npm install` once before `npm run dev`.

## Publishing

The workflow in `.github/workflows/deploy.yml` builds and publishes the site whenever changes are pushed to `main`. The Vite base path is set to `/gatorade-showers/` for this project-page URL.

If GitHub Pages has never been enabled for the repository, open **GitHub → Settings → Pages** once and set **Source** to **GitHub Actions**. No server or local computer needs to stay on after publishing.
