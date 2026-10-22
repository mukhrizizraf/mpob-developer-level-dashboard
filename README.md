# Mandate Decision Studio · Developer level

The step-by-step studio with the V3 "Detailed" evidence behind every step: equations, coefficients, tests,
saved Monte Carlo runs, the five-year stress matrix, the financing table and the WPL baseline reference.
It uses the same design, steps and rules as the User level. The evidence sits in stackable **Detail** cards
that open like an iPhone notification stack.

**Open the app:** `index.html` (one self-contained file, works offline). If GitHub Pages is on, it is served at
`https://mukhrizizraf.github.io/mpob-developer-level-dashboard/`. Companion: the
[User level](https://github.com/mukhrizizraf/mpob-user-level-dashboard).

In this repo `data/` holds copies of the V3 snapshot and master trace, `vendor/lottie/` the lottie-web
5.13.0 light player (MIT, Bodymovin), and `reference/v3/` V3's rule files, used only by the parity tests.
When the snapshot changes, copy the new files into `data/`, then build, test and commit.

> **All values are simulated placeholders, not official MPOB figures.** Controls select saved research
> results; they do not rerun the research models. B15 is a proposed safeguard only. WPL is a baseline
> reference only, never a recommended funding source.

## Tabs

| Tab | Objective | Steps |
|---|---|---|
| OBJ1 | To develop an automatic pricing mechanism for biodiesel (APM-Bio). | 6 |
| OBJ2 | To evaluate whether a Biodiesel Stabilisation Fund (BSF) can withstand price shocks. | 6 |
| OBJ3 | To determine the best sources of funding for the BSF. | 5 |
| OBJ4 | To develop a dynamic rule for moving between B20 and B30. | 7 |
| Decision now | To decide this month's biodiesel blend. | 4 |

## Same data, same rules as V3

- Data: the reviewed V3 snapshot (`V3_DASHBOARD_SNAPSHOT.json`), embedded at build time, plus
  `data/master-trace.json`, the latest six rows of the V3 master workbook with their cell references
  (refreshed from V3's `cell-provenance.json` on every build inside the project).
- Rules: `src/model.js` copies V3's `evidence-model.mjs`, `funding-arithmetic.mjs`, `rq2-case-settings.mjs`
  and `wpl-model.mjs`. `test.mjs` proves both give identical results.

## Rebuild

Needs Node 20 or later. No `npm install`.

```sh
node build.mjs          # builds the page
node --test test.mjs    # rules match V3; trace matches the snapshot; nothing loads from the network
node shoot.mjs <dir>    # optional: headless Chrome/Edge walk-through (SCHEME=dark for dark mode)
```

## Files

| File | Role |
|---|---|
| `src/index.html` | Page shell with build placeholders |
| `src/styles.css` | Design tokens (light + dark), ring-step infographic, detail stack, tables, charts |
| `src/model.js` | V3 calculation rules and number formats |
| `src/app.js` | Tabs, steps, detail stacks, charts, live bindings, motion |
| `src/lottie-icons.mjs` | Project-authored Lottie marks (B30 / B20 / B15 results, detail-stack toggle) |
| `data/master-trace.json` | Master-workbook trace rows (generated) |
| `build.mjs`, `test.mjs`, `shoot.mjs` | Build, tests, browser check |

## Design rules to keep

- Every tab: one 36px objective statement starting with "To ...", then the same ring-step infographic.
- Every step title starts with "To ...". Step colours follow the same order on every tab.
- The step itself stays as short as the User level. Evidence goes into that step's Detail stack, one card
  per table, chart or equation, each labelled with its source table.
