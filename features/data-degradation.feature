Feature: Stale-but-not-broken data degradation
  # PRD F6/F9 · Job Story 6 · US-M2 · SM-1/SM-2 (docs/product/STATE_MACHINES.md)
  # The indicator ladder (precomputed → daily cache → realtime → error response) is the
  # concrete implementation of the 3-tier contract for technical indicators.

  @bound(src/bdd/data-degradation.feature.test.ts)
  Scenario: Fresh pre-computed data short-circuits the ladder
    Given the static lake serves fresh pre-computed indicators
    When a widget requests indicators for a symbol
    Then the pre-computed data is returned
    And no cache or live fallback is attempted

  @bound(src/bdd/data-degradation.feature.test.ts)
  Scenario: Invalid pre-computed data falls back to the daily cache
    Given the pre-computed indicators fail their validity gate
    And the daily cache holds valid indicators
    When a widget requests indicators for a symbol
    Then the daily-cache data is returned
    And the live API is not called

  @bound(src/bdd/data-degradation.feature.test.ts)
  Scenario: Every tier fails so the widget receives a renderable error payload
    Given the static lake is unreachable
    And the daily cache is empty
    And the live API fails
    When a widget requests indicators for a symbol
    Then an error-tagged all-N/A payload is returned for that widget alone
    And the payload names the symbol and the failure

  @manual
  Scenario: Stale data renders with a staleness banner
    Given the newest pipeline run is older than 26 hours
    When the user opens Market Overview
    Then the data still renders
    And a "資料可能過期" banner shows the last-updated timestamp
