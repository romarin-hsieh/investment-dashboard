// Minimal Given/When/Then harness over vitest.
//
// Purpose (docs/product/BDD_DDD_GAP_ANALYSIS.md §4): make the Gherkin scenarios in
// features/*.feature executable without adopting a second test runner. A binding test
// mirrors its .feature scenario step-for-step; a failing step rethrows with its
// `Given/When/Then <text>` label prefixed, so the vitest output reads like the feature file.
//
// Deliberately tiny: no regex step registry, no world object, no cucumber glue — a
// scenario is an ordered list of labelled steps sharing a local closure. If a shared step
// registry ever earns its keep (steps reused across many features), revisit then.
import { describe, it } from 'vitest'

type StepFn = () => void | Promise<void>
interface StepApi {
  given(text: string, fn: StepFn): void
  when(text: string, fn: StepFn): void
  then(text: string, fn: StepFn): void
  and(text: string, fn: StepFn): void
}

/** `Feature:` block — groups its scenarios in the vitest report. */
export function feature(name: string, fn: () => void): void {
  describe(`Feature: ${name}`, fn)
}

/**
 * `Scenario:` block. Steps are collected synchronously via the StepApi, then run in
 * order inside one vitest `it`.
 */
export function scenario(name: string, define: (s: StepApi) => void): void {
  const steps: Array<{ kw: string; text: string; fn: StepFn }> = []
  const push = (kw: string) => (text: string, fn: StepFn) => {
    steps.push({ kw, text, fn })
  }
  define({ given: push('Given'), when: push('When'), then: push('Then'), and: push('And') })

  it(`Scenario: ${name}`, async () => {
    for (const step of steps) {
      try {
        await step.fn()
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err))
        e.message = `[${step.kw} ${step.text}] ${e.message}`
        throw e
      }
    }
  })
}

/**
 * Scenario whose binding exists but is gated on a named fix PR (feature-file tag
 * `@pending-fix(...)`). Renders as skipped with the reason, so the pending state is
 * visible in every test run instead of silently absent. Flip to `scenario` in the fix PR.
 */
export function pendingScenario(name: string, reason: string, define: (s: StepApi) => void): void {
  void define
  it.skip(`Scenario: ${name} (@pending-fix — ${reason})`, () => {})
}

/** Scenario declared in a .feature file that is not yet automatable (`@manual` tag). */
export function manualScenario(name: string, reason: string): void {
  it.skip(`Scenario: ${name} (@manual — ${reason})`, () => {})
}
