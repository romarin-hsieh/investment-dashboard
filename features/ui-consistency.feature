Feature: One visual grammar across routes
  # US-X1 · WIREFRAMES.md §1-§4 · audit SC-1/SC-2/SC-6. The button system is global;
  # pages consume it and never redefine its geometry or invent undefined variants.

  @bound(src/bdd/ui-consistency.feature.test.ts)
  Scenario: No page redefines button geometry
    Given the global .btn system in src/style.css
    When every style block under src/pages is scanned
    Then no page-local rule sets .btn geometry (padding, font-size, height)
    And no page defines a private button family (.control-btn)

  @bound(src/bdd/ui-consistency.feature.test.ts)
  Scenario: Every btn-* variant used in markup is defined in the global layer
    Given the set of .btn-* variants defined in src/style.css
    When every class attribute under src/pages and src/components is scanned
    Then every used btn-* variant is a member of the defined set

  @e2e(e2e/a11y.spec.ts)
  Scenario: Both themes pass the axe gate on every route
    Given the 7 gated routes
    When each renders in light and dark
    Then no non-baseline WCAG violations are reported
