# State Machines — Investment Dashboard

> **Scope**: The finite states behind every dynamic surface, as `stateDiagram-v2`. These are
> normative: a widget/service may only be in one of its named states, and every transition
> names its trigger. The audit found several surfaces inventing un-named states (fabricated
> 過期/從未/0 on failed fetch; permanent 未預熱) — each machine below closes that class of
> bug by making *Unknown/Error* an explicit, renderable state.
> Executable scenario copies: `features/*.feature`.

## SM-1 · Widget data lifecycle (every data widget)

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Loading : mount / retry / locale-refetch
    Loading --> Success : data OK & fresh
    Loading --> Stale : data OK & age > SLO (26 h)
    Loading --> Error : all tiers failed
    Success --> Loading : refresh()
    Stale --> Loading : refresh()
    Error --> Loading : 重試 clicked
    note right of Stale : renders data + staleness flag —\nstale beats broken (PRD Job 6)
    note right of Error : widget-scoped error card,\nshared component & copy
```

**Rules**: `Loading` must be gated on a *real* promise (no `setTimeout` simulation —
audit SD-8); `Error` is reachable (no dead retry UI — audit I4); no state renders
fabricated definite values (audit FH-8).

## SM-2 · 3-Tier cache resolution (per request; ADR-0003/0008)

```mermaid
stateDiagram-v2
    [*] --> T1
    T1 --> Served : memory/localStorage hit (TTL ok)
    T1 --> T2 : miss
    T2 --> Served : static JSON 200 (data-repo Pages)
    T2 --> T3 : 404 / network error
    T3 --> ServedLive : proxy → Yahoo OK (『即時資料』 flag)
    T3 --> Failed : proxies exhausted
    Served --> [*]
    ServedLive --> [*]
    Failed --> [*] : surface SM-1 Error
```

## SM-3 · Auto-update scheduler (`autoUpdateScheduler.ts`)

```mermaid
stateDiagram-v2
    [*] --> Stopped
    Stopped --> Running : start() — single bootstrap,\nprod-only gate (audit SD-10)
    Running --> Stopped : stop()
    Running --> Running : interval fires → task run\n(armedAt recorded → real nextRun)
    state Running {
        [*] --> IdleTick
        IdleTick --> TaskActive : timer / manual trigger
        TaskActive --> IdleTick : done → log with real outcome
    }
```

**Rules**: exactly one bootstrap owner (`main.ts`); `nextRun = armedAt + interval`, never
`now + interval` (audit SD-2); a manual trigger pauses the 30 s poll instead of racing it
(audit I7); log level SUCCESS only when work occurred (audit SD-3).

## SM-4 · Cache warm-up service

```mermaid
stateDiagram-v2
    [*] --> Disabled : .start() never called (current)
    Disabled --> Standby : start() (if adopted)
    Standby --> Warming : manual trigger / boot policy
    Warming --> Warmed : all symbols warmed (lastWarmupTime set)
    Warming --> PartialFail : some fetches failed → count shown
    Warmed --> Standby : TTL elapsed
    PartialFail --> Standby
```

**Rule**: while `Disabled`, the UI card must present the service as 手動 / 未啟用 — not as
a red error state (audit SD-7); tracked list derives from the universe config, not a
hardcoded array.

## SM-5 · Theme & locale (per-session preferences)

```mermaid
stateDiagram-v2
    state Theme {
        [*] --> Light
        Light --> Dark : toggle (persist localStorage.theme)
        Dark --> Light : toggle
    }
    state Locale {
        [*] --> zhTW : default
        zhTW --> EN : toggle → lazy-load messages
        EN --> zhTW : toggle (messages cached)
    }
```

**Rule**: every rendered string, date and number derives from the active locale (audit
S1/X2); every color from theme-aware tokens.

## SM-6 · Data-version lifecycle (`dataVersionService`)

```mermaid
stateDiagram-v2
    [*] --> Current
    Current --> Checking : throttled check (≥ 5 s apart)
    Checking --> Current : version unchanged
    Checking --> Refreshed : version changed → clear performanceCache\nnamespace + refetch
    Refreshed --> Current
```

**Rule**: a throttled/no-op check must report "checked, unchanged / skipped (throttle)" —
not SUCCESS-cleared (audit SD-5).
