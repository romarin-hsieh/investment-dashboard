/**
 * Ambient module declaration for `plotly.js-dist-min`.
 *
 * The dist-min bundle ships no type declarations and there is no
 * `@types/plotly.js` in this project, so a `<script lang="ts">` that imports it
 * would fail resolution (TS7016). Plotly's data/layout/config objects are large,
 * loosely-typed literals that we pass straight through, so the trace/layout
 * params are typed `unknown` rather than modelling Plotly's full API surface.
 */
declare module 'plotly.js-dist-min' {
  interface PlotlyStatic {
    newPlot(el: HTMLElement, data: unknown[], layout?: unknown, config?: unknown): Promise<unknown>;
    react(el: HTMLElement, data: unknown[], layout?: unknown, config?: unknown): Promise<unknown>;
    relayout(el: HTMLElement, layout: unknown): Promise<unknown>;
    purge(el: HTMLElement): void;
    Plots: { resize(el: HTMLElement): void };
  }
  const Plotly: PlotlyStatic;
  export default Plotly;
  export { PlotlyStatic };
}
