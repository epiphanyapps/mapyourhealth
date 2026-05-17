# Refactor handoff — 2026-05-17

Snapshot of the cascade / jurisdiction / safety-defaults refactor so work can resume from a fresh session without losing context. Read this before continuing the refactor.

The full original plan lives at `~/.claude/plans/yes-lets-look-for-glittery-liskov.md`. This doc is the running state of that plan.

## TL;DR

- Phase 1 (admin clarity) shipped in full.
- Phase 2a (mobile boundary defaults), 2d (mobile dead code), and the schema-tightening follow-up shipped.
- Phase 2b (canonical `computeStatus`), 2c (`useJurisdictionResolver` hook), and Phase 3 (admin CRUD hook) are pending.
- The risk model was opened up mid-refactor: **no production users, staging can be wiped and reseeded freely.** Backend / schema changes that were originally deferred are now in-bounds.

## What's shipped (all merged to `staging`)

| Phase | PR | Title | One-liner |
|---|---|---|---|
| 1c | #369 | docs(admin): jurisdictions reframed | Subtitle/dialog/Guide say it's a rulebook catalog, not a list of places |
| 1c | #370 | docs(admin): thresholds reframed | Keyed by (contaminant, jurisdiction); cascade explained |
| 1c | #371 | docs(admin): measurements reframed | Cascade coverage view; `source` field is informational |
| 1c | #373 | docs(admin): properties + property-thresholds | Non-numeric contrast; reactive dialog cites observationType |
| 1b | #374 | feat(admin): LinkedCountBadge | Cross-link counts on Jurisdictions + Contaminants; `/thresholds?contaminant=X&jurisdiction=Y` URL-filter support |
| 1a | #375 | feat(admin): /threshold-coverage | Per-jurisdiction matrix: direct / cascade-parent / cascade-who / none. Plus pagination-truncation warning the user added during review. |
| 2d | #377 | chore(mobile): dead code | Deleted `postalCode.ts` (+test) and 5 unused Location getters in `services/amplify/data.ts`. 165 deletions, 0 additions. |
| 2a | #378 | refactor(mobile): normalize defaults at boundary | `DEFAULT_WARNING_RATIO` / `DEFAULT_HIGHER_IS_BAD` in `safety.ts`; `mapAmplifyThreshold` / `mapAmplifyContaminant` normalize once. |
| schema | #379 | refactor: schema-tighten threshold defaults | `warningRatio` and `higherIsBad` are now `.required().default(...)` at the Amplify layer. Stripped downstream coalesces on both apps. Removed `DEFAULT_WARNING_RATIO` (no consumers left). Kept `DEFAULT_HIGHER_IS_BAD` (still used at lookup-failure sites). |

## Pending — original plan

1. **Phase 2b — canonical `computeStatus()` pure fn.** Today the same logic lives in four places, all with now-aligned input shapes thanks to #379:
   - `apps/mobile/app/data/types/safety.ts` `calculateStatus`
   - `apps/mobile/app/hooks/useLocationData.ts` `computeStatusForThreshold`
   - `apps/mobile/app/context/ContaminantsContext.tsx` `calculateMeasurementStatus`
   - `apps/mobile/app/screens/DashboardScreen.tsx` inline
   Consolidation target: one exported `computeStatus(value, threshold, higherIsBad): SafetyStatus` in `safety.ts`, with all four sites calling it.

2. **Phase 2c — `useJurisdictionResolver()` hook.** Extract the 4 inline `getJurisdictionForLocation(state, country)` calls (in `useLocationData.ts`, `DashboardScreen.tsx`, `CategoryDetailScreen.tsx`) into one memoized hook. Small, isolated.

3. **Phase 3 — admin `useCrudResource()` hook + apply to 8 pages.** Pure-internal infra refactor; no UX change. ~1500 LOC reduction. Plan deferred this; do it after 2b + 2c.

## Pending — opened up after lifting prod-users constraint

4. **Lambda env-var fallbacks (CLAUDE.md §8).** Today `process.env.GOOGLE_PLACES_API_KEY ?? ''` etc. silently swallows missing config. Replace with throw-on-startup. ~6 handlers, small.
5. **`process-notifications` hardcoded defaults (§6).** `'your area'`, `'Water Quality'`, `'safe'` fallbacks in user-visible notifications. Tighten.
6. **`Location` model audit + removal from public GraphQL.** Backend writes for dedup; mobile read-path doesn't touch it. With prod-users constraint lifted, safe to drop public read auth. Medium, real schema change.
7. **Add `resolvedJurisdictionCode` to `LocationMeasurement`.** Backend resolves jurisdiction at write time → mobile drops the in-memory `getJurisdictionForLocation` derivation. Medium-large, additive schema change.

## Pending — docs / housekeeping

8. **Refresh CLAUDE.md "Legacy Patterns (Tech Debt)" table.** References `useZipCodeData.ts`, `postalCode.ts`, `getZipCodeStats()` — all deleted in #377 or earlier renames. Pure docs.
9. **CLAUDE.md §4 / §5 / §7 / §9** (mock fallbacks, hardcoded category names, status defaults, location-string defaults). Each is its own narrative; address case-by-case as priorities dictate.

## Risk model (current)

- **No production users.** Schema-narrowing changes are safe.
- **Staging is wipeable.** Recovery from a bad schema deploy = `yarn workspace @mapyourhealth/backend wipe && yarn workspace @mapyourhealth/backend reseed`, or use the admin Settings "Manage Data" UI (backed by the `manageData` Lambda — actions: `wipeContaminants`, `wipeLocations`, `wipeAll`, `reseedAll`).
- **App Store / native mobile coordination is moot** because there's no production user pool.
- **Surviving constraint:** backend deploy ordering within a single PR (CDK deploy is ~10–15 min and sequential; failures can leave partial state).

## PR conventions established

- Every PR branches off `origin/staging` in a worktree under `.claude/worktrees/<short-name>/`. Use `git -C <path>` (not `cd`) for git ops because `cd` persists across Bash tool calls and has caused bugs.
- PR base is `staging`. The CLAUDE.md "Feature Branch Testing Workflow" section is the source of truth.
- Each PR is self-contained, independently revertable, and leaves staging shippable.
- Commits should explain the *why* in the body, not just the *what*. Use HEREDOC to preserve formatting.
- Trust CI lint + tsc to catch issues; the worktree-local `node_modules` resolution is broken (Yarn workspace quirk), so local tsc reports many false positives. The two `google.maps` namespace errors in `PollutionSourceMap.tsx` are pre-existing and unrelated to recent work.

## Things that bit me; future-me should know

- **The user's `test/e2e-pollution-sources-cascade` branch** in the main repo has many uncommitted edits and stale deleted files (`stats/`, `reports/`, `testing/`, `zip-codes/`). All worktrees should branch off `origin/staging` directly, not off that local branch.
- **`cd` persists across Bash tool calls.** Use absolute paths or `git -C` for all git operations from worktrees.
- **CLAUDE.md tech-debt tables are stale.** §1, §2 (pre-#379), §3 (pre-#379), and the Legacy Patterns table all reference files that no longer exist. Treat them as inspiration, not ground truth — re-grep before acting on any entry.
- **`useSearchParams` in Next.js app router** requires a Suspense boundary or it errors at build time. Read query params via `useEffect` + `window.location.search` instead — see `apps/admin/src/app/(admin)/thresholds/page.tsx` `useEffect` for the URL-param filter pattern.
- **The `manageData` Lambda** (defined in `packages/backend/amplify/data/resource.ts`) is the admin-side wipe/reseed surface, callable from the admin Settings page. It never touches user data (UserSubscription, NotificationLog, HazardReport).

## Next recommended PR

**Phase 2b (canonical `computeStatus`)** — the moment after #379 is the cleanest time to consolidate the four implementations, because schema tightening gave them aligned non-null inputs. After that, 2c (`useJurisdictionResolver`) closes Phase 2.

After Phase 2 wraps, the menu is: docs refresh (#8 — tiny), Lambda env-var hardening (#4 — small), Phase 3 (CRUD hook — large), or schema additions (#6 / #7 — medium with deploy coordination).
