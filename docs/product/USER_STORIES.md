# User Stories — Investment Dashboard

> **Scope**: Route-level user stories with acceptance criteria. Complements
> [PRD.md](PRD.md) §2 — the PRD's seven Job Stories anchor the *product*; these stories
> anchor each *surface*, including the operational (Tools) pages the PRD never covered.
> That omission is why the Tools pages drifted (see
> [audits/2026-08-07-adversarial-round2-audit.md](../audits/2026-08-07-adversarial-round2-audit.md)):
> no one had defined who they serve or what "done" looks like.
>
> **Personas** (PRD §2): **Operator** (solo PM+RD+SA, Taiwan-based, zh-TW-first),
> **Core Partner** (read-only, ≤5 trusted peers). One additional persona is made explicit
> here: **Operator-as-Maintainer** — the same human, but in the "is my pipeline healthy?"
> role rather than the "should I enter this trade?" role. Every Tools-page story belongs
> to that role.
> Format: story + Given/When/Then acceptance criteria (executable copies live in
> `features/*.feature` — see [BDD_DDD_GAP_ANALYSIS.md](BDD_DDD_GAP_ANALYSIS.md)).

---

## 1. Market Overview (`/market-overview`)

**US-M1** — As an **Operator**, I want the landing page to show market indices, volatility
and market news within seconds of opening, so that my pre-market scan starts without
ceremony.

```gherkin
Given the daily data is fresh (< 26 h)
When I open the app root
Then I land on Market Overview and the indices strip renders from cached data without
  any artificial delay
And the data date (資料日期) in the masthead matches the newest pipeline run
```

**US-M2** — As an **Operator**, I want each widget on the page to fail independently with
a consistent error card and a working 重試, so that one dead upstream never blanks my scan.

```gherkin
Given the indices feed is unreachable
When Market Overview renders
Then only the indices widget shows the shared error state (one message vocabulary,
  one retry control) and every other widget renders normally
```

## 2. Stock Overview (`/stock-overview`)

**US-S1** — As an **Operator**, I want the universe grouped by sector (類股) → industry
(產業) with a search that filters the *cards I see*, so that I can reach any symbol in
seconds. *(Search-filters-grid shipped in PR #121; kept as the regression contract.)*

```gherkin
Given the universe contains AAPL
When I type "AAP" in the search box
Then the card grid shows only matching symbols and the sidebar tree filters identically
And clearing the search restores the full grid with my scroll position intact
```

**US-S2** — As a **Core Partner**, I want a symbol card to open the full analysis via one
click and a shareable URL, so that a setup discussion is a link, not a screenshot thread.

## 3. Stock Detail (`/stock-overview/symbols/:symbol`)

**US-D1** — As an **Operator**, I want price action, technicals, quant state, holdings and
fundamentals composed on one page in my UI language, so that I can triangulate a thesis
without tab-hopping. *(PRD Job #2; the quant signal/commentary rendering in English on the
zh-TW UI violates this — audit CP-1.)*

```gherkin
Given my locale is zh-TW
When the quant block renders a WAIT / NO_DATA / NO_TRADE state with a reason
Then the signal badge and the reason text are rendered in 繁體中文 from i18n keys
  (payload carries codes, not display strings)
```

**US-D2** — As an **Operator**, I want the page to tell me when metadata failed to load
instead of silently guessing the exchange, so that I never cite a wrong venue in a note.

```gherkin
Given symbols_metadata.json is unreachable
When I open a symbol page
Then the header shows an explicit metadata-unavailable state with retry
And no guessed exchange/industry value is presented as fact
```

## 4. Settings (`/settings`)

**US-SET1** — As an **Operator**, I want Settings to only advertise controls that exist,
so that the page's promises are trustworthy. *(Today all three cards are TODO stubs —
audit SD-6.)*

```gherkin
Given a Settings section has no implemented controls
When Settings renders
Then that section is either absent or explicitly marked 規劃中 (planned)
And no description promises a choice the page cannot make
```

**US-SET2** *(target state)* — As an **Operator**, I want to export/import my
local preferences (theme, locale, watchlist), so that a browser wipe or second machine
doesn't cost me my setup. *(P1 — implement or remove the card per US-SET1.)*

## 5. System Status (`/system-manager`) — Operator-as-Maintainer

**US-SYS1** — As the **Maintainer**, I want one page that answers "did the nightly
pipeline run, when, and over how many symbols?", so that I can trust this morning's data
before trading on it. *(PRD Job #6's UI surface.)*

```gherkin
Given the pipeline index is reachable and < 26 h old
When System Status renders
Then the pipeline card reads healthy with the run timestamp and symbol coverage
```

**US-SYS2** — As the **Maintainer**, I want fetch failures surfaced as "status unknown",
never as fabricated definite values, so that a monitoring page can't lie in either
direction. *(Audit FH-8 / I3 / I8.)*

```gherkin
Given the status fetches fail
When System Status renders
Then each affected card shows an unknown/error state with a retry affordance
And no card shows 過期 / 從未 / 0 as if measured
```

**US-SYS3** — As the **Maintainer**, I want cache controls whose labels state their blast
radius (e.g. 清除快取並重新載入), so that I can predict what a click does. *(Audit SD-5.)*

## 6. Auto-Update Monitor (`/auto-update-monitor`) — Operator-as-Maintainer

**US-AUM1** — As the **Maintainer**, I want the freshness grade of each feed derived from
the documented SLO (< 26 h), so that green means on-SLO and red means action needed —
on every page that grades the same feed. *(Audit SD-1.)*

```gherkin
Given the technical-indicator feed is 13 hours old
When I read its status on Auto-Update Monitor and on System Status
Then both pages grade it identically as fresh/on-SLO
```

**US-AUM2** — As the **Maintainer**, I want every displayed timestamp to be a real
measurement (armed-at, last-run, next-run), so that "下次更新" is information, not
decoration. *(Audit SD-2.)*

**US-AUM3** — As the **Maintainer**, I want controls that report success only when work
occurred, so that the update log is evidence, not reassurance. *(Audit SD-3.)*

```gherkin
Given the cache-cleanup routine performs no eviction
When I trigger 清理快取
Then the log entry states what was (not) done, and never level=SUCCESS for a no-op
```

**US-AUM4** — As the **Maintainer**, I want configuration edits to change actual scheduler
behaviour (or be absent), so that a saved setting is a commitment. *(Audit SD-4.)*

## 7. Technical Indicators Manager (`/technical-manager`) — Operator-as-Maintainer

**US-TIM1** — As the **Maintainer**, I want to see per-source status (pre-computed /
daily cache / live fallback) in glossary vocabulary (快取, 資料, 中繼資料), so that the
page reads as part of the same product as the rest of the app. *(Audit CP-2.)*

**US-TIM2** — As the **Maintainer**, I want destructive actions (清除所有快取) to confirm
in an in-app dialog consistent with the design system, so that operational surfaces feel
as trustworthy as analytical ones. *(Audit I5, still open.)*

## 8. Cross-cutting

**US-X1** — As an **Operator**, I want every route to share one visual language — one
button system, one card system, one page-header system — so that the app reads as one
product. *(Audit SC-1/SC-4/SC-7; the wireframes in [WIREFRAMES.md](WIREFRAMES.md) are the
normative reference.)*

**US-X2** — As an **Operator**, I want all user-facing dates/numbers formatted per my
active locale, so that a zh-TW session never shows `10/9/2025` or English month names.
*(Audit S1 residue in the API layer.)*

**US-X3** — As a **Core Partner** using assistive tech, I want tab patterns and tables to
expose real semantics (ARIA tabs, `th scope="row"`), so that the analysis pages are
navigable non-visually. *(Audit S3/S4, still open.)*

**US-X4** — As the **owner**, I want the UI to carry a standing "not investment advice"
notice and neutral, non-directive signal language in both locales, so that partners read
analysis, not recommendations. *(Audit CP-13/CP-16.)*
