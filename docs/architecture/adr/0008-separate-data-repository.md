# ADR-0008 — Separate Data Repository (data served from a second same-origin GitHub Pages site)

- **Status**: Accepted
- **Date**: 2026-06-19
- **Deciders**: Project owner
- **Context tags**: `data`, `deployment`, `repo-hygiene`, `cost`

## Context & Problem

The Static-First model ([ADR-0001](0001-static-first-architecture.md)) commits the pre-computed JSON (the "Static Lake") into the app repository under `public/data/`. By 2026-06 that data had become **~99.8% of the repo's weight**: `public/data` ≈ **665 MB** and `.git` ≈ **3.6 GB**, driven by roughly-daily commits that rewrite hundreds of MB of JSON (text that delta-compresses poorly). The app code itself is ~1.5 MB. This made clones slow, bloated every Pages deploy, and had previously broken the GitHub Pages 1 GB artifact limit. We want the **app repo to stay lightweight** while keeping the static-first, no-runtime-backend model.

## Decision

Move `public/data` into a separate repository, **`romarin-hsieh/investment-dashboard-data`**, served via its own GitHub Pages site at `https://romarin-hsieh.github.io/investment-dashboard-data/`. Because that is the **same origin** (`romarin-hsieh.github.io`) as the dashboard, data fetches stay same-origin (**no CORS**), keep correct content-types, and reuse the *exact* caching model already in place (GitHub Pages `max-age=600` plus the client tiers of [ADR-0003](0003-three-tier-cache-model.md) / [ADR-0006](0006-static-data-caching-on-github-pages.md)).

The frontend resolves every data URL through a single `VITE_DATA_BASE_URL`, consumed by `getDataBaseUrl()` / `withDataBase()` in `src/utils/baseUrl.js`, defaulting to the app `BASE_URL` when unset so local dev still serves from local `public/data`. **Configuration (`public/config/*`) stays in the app repo** (small, human-edited).

**Rollout (phased):**
1. **Frontend indirection** (PR #49) — introduce `VITE_DATA_BASE_URL`; no-op by default.
2. **Cutover** (PR #50) — point the production build at the data repo and have the nightly workflows **mirror** `public/data` to the data repo via a `DATA_REPO_TOKEN` PAT. *Dual-push transition*: the app repo stays the working source as a safety net.
3. **Sole-source cut** (planned) — drop `public/data` from the app repo, switch the workflows to seed-from-the-data-repo, and optionally purge the app repo's `.git` history.

## Consequences

**Positive**
- App repo working tree drops ~665 MB → a few MB; future `.git` growth from data stops (after phase 3).
- No CORS (same origin); existing 3-tier cache model unchanged.
- Data updates no longer trigger an app rebuild — the live site fetches fresh JSON at runtime.

**Negative / Trade-offs**
- The **data repo's own `.git`** grows from daily commits — manage via periodic history squash; it does not affect the published Pages artifact (working-tree snapshot).
- Nightly workflows now also clone the data repo (~666 MB) — free on public repos.
- Requires a long-lived `DATA_REPO_TOKEN` (fine-grained PAT, Contents: Read+Write on the data repo) as a secret.

**Neutral**
- Amends the *data-location* aspect of ADR-0001, ADR-0003 (Tier-2 source), and ADR-0006 (caching). Those decisions still hold — only the host moves; the static-first, no-backend, 3-tier-cache model is unchanged.

## Alternatives Considered

- **jsDelivr CDN over the data repo** — better global edge caching, but adds a third-party dependency and its `@branch` cache can serve stale data for hours (would need SHA/version-pinned URLs or purge calls). Rejected in favor of same-origin GitHub Pages (simpler, no extra dependency, identical caching to today).
- **`raw.githubusercontent.com`** — rate-limited, served as `text/plain`, uncontrollable caching. Kept only as a documented fallback, not the primary host.
- **Git submodule** — pins a commit SHA, requires recursive clones, and reintroduces daily pointer-bump commits into the very repo we are trying to keep light. Rejected.
- **Keep data in-repo, BFG/`git-filter-repo` history purge only** — reclaims past bloat but does not stop future daily growth. Rejected as a standalone fix.

## Follow-ups

- Phase 3 (sole-source cut) tracked in the refactor plan.
- Watch the data repo's Pages artifact against the 1 GB limit as the symbol universe grows (the `technical-indicators` retention=2 policy keeps it bounded).
- Update `docs/operations/DATA_OPERATIONS.md` and `docs/architecture/OVERVIEW.md` once phase 3 lands, so they describe the final (external) data location rather than a half-state.
