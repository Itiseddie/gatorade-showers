# Gatorade Showers league history

This is an interactive historical fantasy-football dashboard for the Gatorade Showers Yahoo league. It includes championship and podium exploration, a season-by-season league board, draft-lottery history, championship results by draft slot, first-round player history, recorded-era FAAB analysis, and a complete first-round Hit / Bust Lab.

The public site is expected at:

https://itiseddie.github.io/gatorade-showers/

## How the data works

The website uses three local data files:

- `public/data/champions.json` — championship, runner-up, third-place, and league-size history
- `public/data/drafts.csv` — each season's first-round order, manager, drafted player, and FAAB balance when available
- `public/data/player-performance.json` — fantasy points, positional finish, games, grade, and injury evidence for all 150 first-round picks

The original source is the Google Sheet named **Yahoo Fantasy Football League All Time Info**. The site does not connect to Google Sheets while visitors are using it, so it remains fast and simple on GitHub Pages.

Historical names stay distinct. In particular, `Jane`, `Ryan`, and `Jane/Ryan` are separate identities. Any old `Richard` entry is displayed as `Rich` through the alias rule in `src/stats.js`; the source-history file does not need to be rewritten for that.

FAAB analysis only uses seasons with a recorded `FAAB Remaining` value (currently 2017–2025).

The Hit / Bust Lab uses nflverse regular-season statistics with the league's Standard scoring from 2012–2016 and Half-PPR scoring from 2017–2025. Grades are based on same-season positional finish: Smash Hit 1–3, Hit 4–8, Fine 9–25, and Bust 26+. Injury Bust is reserved for players who missed more than half the schedule because of an injury verified by the weekly injury data or a linked NFL report. Non-injury absences, such as Le'Veon Bell's 2018 contract holdout, remain Busts.

`scripts/build-player-performance.mjs` is the reproducible builder for the performance file. It joins `public/data/drafts.csv` to nflverse player-stat and injury-report CSVs and applies the documented league scoring rules.

## Annual update — the four steps to remember

1. Update the league history in the Google Sheet.
2. Update or replace `public/data/champions.json` and `public/data/drafts.csv` with the new rows.
3. Refresh `public/data/player-performance.json` after the NFL regular season is complete.
4. Commit the changes and push them to the `main` branch.

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
