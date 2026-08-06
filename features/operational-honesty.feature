Feature: Monitoring surfaces report only measured truth
  # US-SYS2 · US-AUM1..3 · SM-3/SM-4 · audit SD-1/SD-2/SD-3/FH-8. On a static-first
  # architecture (ADR-0001) the ops pages may observe the lake and control browser-local
  # caches only — and must never render a value they did not measure.

  @bound(src/bdd/operational-honesty.feature.test.ts) @pending-fix(fix/ops-honesty · SD-1)
  Scenario: One freshness grade per feed across all pages
    Given the technical-indicator feed is 13 hours old
    When System Status and Auto-Update Monitor grade its freshness
    Then both derive the grade from the shared SLO helper
    And a feed younger than the 26-hour SLO grades as fresh on both

  @manual
  Scenario: A failed status fetch renders Unknown, not fabricated values
    Given the status endpoints are unreachable
    When System Status renders its overview cards
    Then each affected card shows 無法取得狀態 with a retry control
    And no card asserts 過期, 從未 or 0 as if measured

  @manual
  Scenario: SUCCESS log entries only for performed work
    Given a maintenance action performs no eviction or update
    When its handler completes
    Then the update log entry for it is not level SUCCESS
