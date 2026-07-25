// Ambient module declaration for single-file components. Needed once a `.ts`
// file imports a `.vue` (main.ts's App + lazy route components) — SFC-to-SFC
// imports are resolved by vue-tsc directly and never needed this shim. Kept
// deliberately loose (no props/emits typing) — routes only need the default
// export to be a Component. No `any` (ADR-0014); `DefineComponent`'s defaults
// are permissive enough for createApp() and vue-router's lazy components.
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent
  export default component
}
