# Changelog

All notable changes to the MapYourHealth platform are documented here. This file is the authoritative log for data-source updates (Risks.xlsx revisions, schema migrations, seed-data corrections) so future operators can trace why a reseed produced different output than a previous one.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Dates are ISO 8601.

## [Unreleased]

### Data — Risks.xlsx (2026-05-10)

Restructured the "Drinking Water Contamination" sheet so six contaminants land in correct sections. Before this change, the parser (`scripts/parse-risks-excel.ts`) inferred categories from section headers and produced the wrong enum values for these six rows on every reseed.

Backup of the pre-change file: `Risks.before-cascade-fix.xlsx` (repo root).

**Section moves:**

| Contaminant | Old section | New section | Old category | New category |
|---|---|---|---|---|
| Silver | 27 Chemicals | 14 Heavy Metals | organic | **inorganic** |
| Aluminium | 27 Chemicals | 14 Heavy Metals | organic | **inorganic** |
| Boron | 27 Chemicals | 14 Heavy Metals | organic | **inorganic** |
| Fluoride | 27 Chemicals | 14 Heavy Metals | organic | **inorganic** |
| Microcystin-LR | 27 Chemicals | 1 Microbiological (new section) | organic | **microbiological** |
| Microplastics | 28 Chemicals - Disinfectants | 23 Chemicals | disinfectant | **organic** |

**Section header counts updated:**
- `10 Heavy Metals` → `14 Heavy Metals`
- `27 Chemicals` → `23 Chemicals`
- `28 Chemicals - Desinfectants used to purify water` stays (label was already off-by-one vs row count)
- New section: `1 Microbiological`

**Parser change** (`scripts/parse-risks-excel.ts`): added `"microbiological" → "microbiological"` and `"microbiological contaminants" → "microbiological"` to `CATEGORY_MAP`. Without this, the new section header would parse as "unknown" and Microcystin-LR would inherit the previous section's category.

**Why this matters:** the prior workaround (`scripts/update-contaminant-categories.ts`) only patched the DDB rows post-seed. Any subsequent reseed re-read the unmodified Excel and overwrote the patch with the original wrong values. After this restructure, the parser produces correct categories directly — the patch script becomes a no-op.

**Operator impact:** anyone running `bash scripts/reseed-all.sh` after 2026-05-10 will produce correct categories on the target environment. Production was reseeded immediately after the change landed.

**Side effect:** in-place rewrite via openpyxl flattened cell formatting in rows 1–200 of the sheet. Cell values are intact; styling (colors, borders) was lost. Re-style as desired from the backup.

### Backend — `wipe-all-data.ts --force` flag (2026-05-10)

Added `--force` / `--yes` flag to skip the interactive `Are you sure? (y/N)` prompt. `reseed-all.sh` now passes `--force` so non-TTY runs (CI, backgrounded shells) don't silently no-op the wipe and produce doubled-up data downstream. Direct standalone runs of `wipe-all-data.ts` still prompt.

See PR #334.

### Backend — cascade GSIs on WarningBanner and HazardReport (2026-05-09)

Added `byCity` / `byState` / `byCountry` secondary indexes to both models (PR #329). Enables the `useWarningBanners` fanout hook (PR #331) to query by location without scanning the full table.

### Backend — `seed-contaminants.ts` upsert behavior (2026-05-10)

Was `.create()`-only — silently no-op'd on existing rows. Now create-or-update by `contaminantId`, so edits to `seed-data.json` roll forward via `yarn seed`. Closes the EPI-18 trap that previously required a separate patch script. See PR #332.

### Backend — test-ready wipe-and-reseed pipeline (2026-05-10)

`reseed-all.sh` extended from 5 to 9 steps. New steps add cascade test fixtures (uranium-238 measurements at QC/CA anchors, radon observations at QC/CA/US anchors), 4 sample warning banners (global/country/state/city), and 5 sample pollution sources at varied anchors. The cascade-test environment now exercises every cascade scope end-to-end. See PR #332.

### Docs (2026-05-10)

`packages/backend/README.md` documents the full wipe-and-reseed pipeline, environment swap procedure, idempotency, and the Node v25 workaround. `.nvmrc` at repo root pins Node 22. See PR #333.
