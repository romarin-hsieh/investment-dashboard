
import { CisdAlgo } from '../src/utils/technical-analysis/CisdAlgo.js';

function createMockData() {
    const timestamps = [];
    const open = [];
    const high = [];
    const low = [];
    const close = [];
    let t = 1000;

    // 10 Bars of HIGH prices (e.g. previous range was high, then dip, then high?)
    // No, we want an Uptrend where the previous 'Low' is far away.
    // Or just "Price was High, then trended higher?"
    // If we want Pullback (12) to be Lowest of last 5.
    // The bars before the pullback must be > 12.

    for (let i = 0; i < 10; i++) {
        timestamps.push(t); t += 1000;
        open.push(20); high.push(25); low.push(18); close.push(22); // Lows are 18
    }

    // Bar 10-12: Bullish Continuation
    timestamps.push(t); t += 1000; open.push(22); high.push(25); low.push(21); close.push(24);
    timestamps.push(t); t += 1000; open.push(24); high.push(28); low.push(24); close.push(27);
    timestamps.push(t); t += 1000; open.push(27); high.push(30); low.push(27); close.push(29);

    // Bar 13: Bear (Start of Run)
    timestamps.push(t); t += 1000; open.push(29); high.push(29); low.push(25); close.push(26);
    // Bar 14: Bear (Continuation, Low 12) -> Deep dip!
    timestamps.push(t); t += 1000; open.push(26); high.push(26); low.push(12); close.push(13);

    // Window at 14 (len 5): Bars 10,11,12,13,14.
    // Lows: [21, 24, 27, 25, 12].
    // Lowest is 12 (Current).
    // THIS SHOULD PASS!

    // Bar 15: Breakout
    timestamps.push(t); t += 1000; open.push(13); high.push(35); low.push(13); close.push(30);

    return { timestamps, open, high, low, close };
}

console.log("--- TEST 3: Filter ON (Local Low in Trend) ---");
const data = createMockData();
const algo = new CisdAlgo(data);

const res = algo.calculate({
    runBarsThreshold: 2,
    cisdFilter: true,
    cisdFilterLength: 5,
    invalidateCISD: true
});
console.log("Test 3 Primitives:", res.length);
if (res.length > 0) console.log("SUCCESS: Triggered!");
else console.log("FAILURE");
