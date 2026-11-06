# Mandate Decision Studio · Developer level

### ▶ [Open the dashboard](https://mukhrizizraf.github.io/mpob-developer-level-dashboard/)

**https://mukhrizizraf.github.io/mpob-developer-level-dashboard/** works in any browser, on a phone, tablet or computer.
Companion: the [User level](https://mukhrizizraf.github.io/mpob-user-level-dashboard/), the short version for MPOB / MOF staff.
Guide: the [Studio Guide with audio](https://mukhrizizraf.github.io/mpob-developer-level-dashboard/guide-with-audio.html), a narrated walk through both levels that shows where every number comes from.
Master data: the [Master Data Studio](https://mukhrizizraf.github.io/mpob-developer-level-dashboard/master-data-studio.html), one screen on the real workbook: click a column to see what it is and who has it, or press Listen. It shows what AI can download and what to ask MPOB for. Also as a [PDF list](https://mukhrizizraf.github.io/mpob-developer-level-dashboard/MPOB_V3_Codex_Master_Raw_Data_List.pdf).

The step-by-step studio with the V3 "Detailed" evidence behind every step: equations, coefficients, tests,
saved Monte Carlo runs, the five-year stress matrix, the financing table and the WPL baseline reference.
It uses the same design, steps and rules as the User level. The evidence sits in stackable **Detail** cards
that open like an iPhone notification stack.

> **All values are simulated placeholders, not official MPOB figures.** Controls select saved research
> results; they do not rerun the research models. B15 is a proposed safeguard only. WPL is a baseline
> reference only, never a recommended funding source.

## Tabs

| Tab | Objective | Steps |
|---|---|---|
| Home | To decide, each month, whether Malaysia's biodiesel blend stays at B20 or moves to B30. | The biodiesel journey only: one long camera move from B5 to the B30 decision, with Play and clickable chapters |
| OBJ1 · Price | To develop an automatic pricing mechanism for biodiesel (APM-Bio). | 6 |
| OBJ2 · Money sources | To determine the best sources of funding for the BSF. | 5 |
| OBJ3 · Fund test | To evaluate whether a Biodiesel Stabilisation Fund (BSF) can withstand oil price fluctuations. | 6 |
| OBJ4 · Mandate rule | To develop a dynamic rule for moving between B20 and B30. | 7 |
| Decision now | To decide the biodiesel blend for the chosen prices and fund. | 4 |

## Using it

Everything in the User level (swipe between steps and tabs, exact-value boxes that reject bad input, "Your scenario" labelling, reset
scopes, the six looks, `#obj4-5` links, print summary, the Home journey (scroll, swipe or Play) with the sponsor marks, the living hive behind every page that writes the step in hand, the step pictures (a moving drawing of each step, five following the live numbers), the step morph (first click only, then a slight pop), the numbered step buttons in the footer, the slide-to-start guide and sound, and the tabs at the top), plus:

- **Number origins.** Press **Explain** in the top bar to walk through every number on the step with the voice, or rest the cursor on any number and a card floats beside it, above everything, including an open Detail card: the workbook cells with the ORIGIN pin, the sum with its real values, the road from workbook to screen, and a thread back to the number. Click to keep it open; Escape closes it. On a phone, tap the number. It only reads, and the footer switch turns it off. At the default settings the words and sums come from the audio guide's checked lines. After you move a slider the sum is worked out live with your values. The card reads itself aloud (narrator picker, 1× to 2×; the round mute button silences it, and Play still works), covers result words such as Pass, Fail and the blend, and says whether the item is also on the User level.
- **Detail stacks.** Tap a stack to fan the cards out, then open any card. Collapsed cards cannot be reached with Tab.
- **Charts.** Hover or tap to read a point, or focus a chart and use the arrow keys (Shift for a year, Home and End for the ends).
  *Show the data as a table* lists every point.
- **Sources and provenance** (footer, or Decision now): the saved rows of any query, its files, filters and caveats, the source
  manifest, the snapshot SHA-256, release fingerprint, data-through month and the estimation, snapshot and page-build dates.
  Every card's source chip opens its query.

## Review fixes (October 2026)

Implements the code review in `07_Codex_Analysis/code review .md`. Shared with the User level: CR01–CR06, CR08–CR12, CR18–CR20,
A02 and A03. Developer only: collapsed cards are inert with `aria-controls` (CR07); the cost build-up shows the constant and uses
the reviewed master inputs, so the terms add up (CR13); VaR 95% and CVaR 95% have their own definitions (CR14); the source
inspector (CR15); three named geopolitical runs with no fallback to another run (CR16); keyboard chart read-out, data tables and a
real price-map table (CR17). Shared `motion.js`, `theme.js` and `shared.css` are tested to stay identical in both levels (A01).

## Same data, same rules as V3

- Data: the reviewed V3 snapshot (`V3_DASHBOARD_SNAPSHOT.json`), embedded at build time, plus
  `data/master-trace.json`, the latest six rows of the V3 master workbook with their cell references
  (refreshed from V3's `cell-provenance.json` on every build inside the project).
- Rules: `src/model.js` copies V3's `evidence-model.mjs`, `funding-arithmetic.mjs`, `rq2-case-settings.mjs`
  and `wpl-model.mjs`. `test.mjs` proves both give identical results.

In this repo `data/` holds copies of the V3 snapshot and master trace, `vendor/lottie/` the lottie-web
5.13.0 light player (MIT, Bodymovin), and `reference/v3/` V3's rule files, used only by the parity tests.
When the snapshot changes, copy the new files into `data/`, then build, test and commit.

## Rebuild

Needs Node 20 or later. No `npm install`.

```sh
npm run build            # or: node build.mjs
npm test                 # rules match V3; snapshot check; trace matches the snapshot; nothing loads from the network
npm run shoot -- shots   # optional: headless Chrome/Edge walk-through + the review's acceptance checks, about 9 minutes (SCHEME=dark for dark mode)
```

## Files

| File | Role |
|---|---|
| `src/index.html` | Page shell with build placeholders and the source inspector dialog |
| `src/styles.css` | Design tokens (light + dark), ring-step infographic, detail stack, tables, charts |
| `src/shared.css` | Shared with the User level: mobile baseline, review fixes, motion hooks, themes, print |
| `src/model.js` | V3 calculation rules and number formats |
| `src/numtrace.js`, `src/numtrace.css` | Developer only: the number-origins card. Rebuilt data in `data/number-origins.json` |
| `src/motion.js` | Shared spring engine, swipe gesture, CSS spring curves |
| `src/theme.js` | Shared look selector (six looks) |
| `src/home.js` | Shared: the biodiesel journey on Home (one long camera move, sponsor marks) and the living hive behind every page, which writes the step in hand |
| `src/hall.js` | Shared: the Mirror Hall step cards (marbled liquid, WebGL); still built, no longer mounted |
| `src/art.js` | Shared: step pictures, a moving drawing of each step in its box (extra pictures for the long-run link, starting-money search and five-year stress test) |
| `src/morph.js` | Shared: step morph, old cards turn to dust, new cards spin out of a vortex and drop into place (first visit to each page; later visits a slight pop). It runs on the compositor; the reasons are at the top of the file |
| `src/sound.js` | Shared: quiet Web Audio cues (clicks, slider ticks, page notes, card pops, verdict chords, look shimmer, journey bells and kalimba notes); round mute button at the bottom right of every page, and a Sound switch in the Appearance menu |
| `src/guide.js` | Shared: "Slide to start the journey" on Home, and a "carry on" hint when a visitor stops part-way |
| `brand/` | Sponsor logos `mpob.svg` and `ukm.png`, embedded small on the journey's last screen at build time. The MPOB and UKM logos are the trademarks of the Malaysian Palm Oil Board and Universiti Kebangsaan Malaysia, shown only to credit their support of this study. |
| `src/app.js` | Tabs, steps, detail stacks, charts, source inspector, live bindings |
| `src/lottie-icons.mjs` | Project-authored Lottie marks (B30 / B20 / B15 results, detail-stack toggle) |
| `data/master-trace.json` | Master-workbook trace rows (generated) |
| `data/number-origins.json` | Generated: every monthly row of the master, the settings sheets, and the audio guide's lines. The guide's lines are kept only if the guide was built from this same snapshot, so rebuild the guide first, then this studio |
| `build.mjs`, `test.mjs`, `shoot.mjs` | Build, tests, browser check |

## Design rules to keep

- Every objective and Decision tab: one 36px objective statement starting with "To ...", then the same row of picture steps.
  Home is the journey only; its objective statement is kept for screen readers.
- Every step title starts with "To ...". Step colours follow the same order on every tab.
- The step itself stays as short as the User level. Evidence goes into that step's Detail stack, one card
  per table, chart or equation, each labelled with its source table.
