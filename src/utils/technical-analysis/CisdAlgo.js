import { LineObject, LabelObject, BoxObject, FilledAreaObject } from './StandardPrimitives.js';

export class CisdAlgo {
    constructor(ohlcvData) {
        this.ohlcv = ohlcvData;
        this.primitives = [];
    }

    hexToRgba(hex, alpha) {
        const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
        hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);

        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (!result) return `rgba(128, 128, 128, ${alpha})`;

        const r = parseInt(result[1], 16);
        const g = parseInt(result[2], 16);
        const b = parseInt(result[3], 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    calculate(config = {}) {
        this.primitives = [];
        const settings = {
            runBarsThreshold: 2,
            cisdFilter: false,
            cisdFilterLength: 20,
            invalidateCISD: true, // Default true to match Original Algo

            level1: true, level1Mult: 1.0, level1Style: 'solid',
            level2: true, level2Mult: 2.0, level2Style: 'solid',
            level3: true, level3Mult: 2.5, level3Style: 'solid',
            level4: true, level4Mult: 4.0, level4Style: 'solid',
            level5: true, level5Mult: 4.5, level5Style: 'solid',

            baseLevel: true,
            baseLevelStyle: 'dotted',
            labelsSize: 12,
            bullishColor: '#089981', // Green
            bearishColor: '#F23645', // Red
            backgroundFill: true,
            ...config
        };

        const customLevels = [];
        if (settings.level1) customLevels.push({ m: settings.level1Mult, s: settings.level1Style, idx: 0 });
        if (settings.level2) customLevels.push({ m: settings.level2Mult, s: settings.level2Style, idx: 1 });
        if (settings.level3) customLevels.push({ m: settings.level3Mult, s: settings.level3Style, idx: 2 });
        if (settings.level4) customLevels.push({ m: settings.level4Mult, s: settings.level4Style, idx: 3 });
        if (settings.level5) customLevels.push({ m: settings.level5Mult, s: settings.level5Style, idx: 4 });

        let maxMult = 1.0;
        customLevels.forEach(l => maxMult = Math.max(maxMult, l.m));

        const { timestamps, open, high, low, close } = this.ohlcv;
        const len = timestamps.length;

        // PINE DEFINITIONS
        const BULLISH = 1; // Green Run
        const BEARISH = 0; // Red Run

        if (len < settings.cisdFilterLength) return [];

        let runs = [];
        let cisds = [];

        const startIndex = settings.cisdFilterLength;

        for (let i = startIndex; i < len; i++) {
            // Pine: bool bullishBar = close >= close[1]
            const isBullishBar = close[i] >= close[i - 1];
            const isBearishBar = close[i] < close[i - 1];

            // Pine: bool bearishBar[1] (Previous bar was Bearish)
            const prevBullish = close[i - 1] >= close[i - 2];
            const prevBearish = close[i - 1] < close[i - 2];

            // Pine: bool newRun = (bullishBar and bearishBar[1]) or (bearishBar and bullishBar[1])
            const newRun = (isBullishBar && prevBearish) || (isBearishBar && prevBullish);

            if (newRun) {
                // If previous run exists, finalize it and check it
                if (runs.length > 0) {
                    const lastRun = runs[runs.length - 1];
                    lastRun.highest = this.getHighest(high, i - 1, settings.cisdFilterLength);
                    lastRun.lowest = this.getLowest(low, i - 1, settings.cisdFilterLength);

                    // The function `checkCISD` in Pine is called on the *previous* run when a new run starts?
                    // Pine: `if runs.size() >= 2: checkCISD(runs.get(-2))` inside `else` (same run).
                    // In `newRun` block: `if runs.size() > 0 ... checkCISD(currentRun)`.
                    // Yes, we check the JUST FINISHED run to see if the CURRENT bar triggers it.
                    this.checkCISD(lastRun, settings, cisds, i, close);
                }

                // Start NEW Run
                // Pine: runs.push(run.new(open, high, low, bullishBar ? BULLISH : BEARISH ...))
                // Note: The new run BIAS is determined by the CURRENT bar.
                runs.push({
                    openPrice: open[i], // Defined at start of run
                    top: high[i],
                    bottom: low[i],
                    bias: isBullishBar ? BULLISH : BEARISH,
                    triggered: false,
                    startTime: timestamps[i],
                    endTime: timestamps[i],
                    fillEndTime: null, // For visualization
                    bars: 1,

                    reachedIndices: new Set(),
                    levelEndTimes: {},
                    timeSeries: [timestamps[i]], // For fill

                    highest: null,
                    lowest: null,
                    invalid: false,
                    invalidationTime: null,
                    isTerminated: false
                });
            } else {
                // Continuation of Current Run
                if (runs.length > 0) {
                    const currentRun = runs[runs.length - 1];
                    if (!currentRun.triggered) {
                        currentRun.endTime = timestamps[i];
                        currentRun.bars += 1;
                        currentRun.top = Math.max(high[i], currentRun.top);
                        currentRun.bottom = Math.min(low[i], currentRun.bottom);
                        currentRun.timeSeries.push(timestamps[i]);
                    }

                    // Pine: `if runs.size() >= 2: checkCISD(runs.get(-2))`
                    // We constantly check if the *previous* run (which is completed) is triggered by the *current* movement.
                    // This creates the "Breakout" effect.
                    if (runs.length >= 2) {
                        const prevRun = runs[runs.length - 2];
                        this.checkCISD(prevRun, settings, cisds, i, close);
                    }
                }
            }

            // --- Invalidation & Termination Logic (Visuals) ---
            if (cisds.length > 0) {
                const currentCisd = cisds[cisds.length - 1];
                this.invalidateCISD(currentCisd, settings, i, close);

                // If not invalid and not terminated, extend levels
                if (!currentCisd.invalid && !currentCisd.isTerminated) {
                    currentCisd.endTime = timestamps[i]; // Extend visibility to now

                    // Calculate Geometric Params to check Levels
                    // Pine: 
                    // BULLISH Run (Green) -> Bearish Color -> Base=Top, Proj=Down
                    // BEARISH Run (Red)   -> Bullish Color -> Base=Bottom, Proj=Up -- WAIT

                    // Pine Reference:
                    // basePrice = bias == BULLISH ? bottom : top
                    // BULLISH (Green) -> Base = Bottom. 
                    // BEARISH (Red)   -> Base = Top.

                    // priceBias = bias == BULLISH ? -1 : 1
                    // BULLISH (Green) -> -1 (Down)
                    // BEARISH (Red)   -> 1 (Up)

                    const basePrice = currentCisd.bias === BULLISH ? currentCisd.bottom : currentCisd.top;
                    const priceBias = currentCisd.bias === BULLISH ? -1 : 1;
                    const runRange = currentCisd.top - currentCisd.bottom;

                    customLevels.forEach(lvl => {
                        if (!currentCisd.reachedIndices.has(lvl.idx)) {
                            const levelPrice = basePrice + priceBias * (lvl.m * runRange);
                            // Check reach
                            // Bullish Bias (Green Run, Proj Down) -> Touched if Low <= Level
                            // Bearish Bias (Red Run, Proj Up)     -> Touched if High >= Level
                            const touched = (currentCisd.bias === BULLISH && low[i] <= levelPrice) ||
                                (currentCisd.bias === BEARISH && high[i] >= levelPrice);

                            if (touched) {
                                currentCisd.reachedIndices.add(lvl.idx);
                                currentCisd.levelEndTimes[lvl.idx] = timestamps[i];
                                if (Math.abs(lvl.m - maxMult) < 0.001) {
                                    currentCisd.fillEndTime = timestamps[i]; // Flush background
                                }
                            } else {
                                currentCisd.levelEndTimes[lvl.idx] = timestamps[i];
                            }
                        }
                    });

                    // Accumulate fill points? No, Fill is rectangular/stepped.
                    // The Pine script makes `customBackground.base` and `extension` follow Price?
                    // Pine: `customBackground.base := cisds.last().bias == BULLISH ? low : high`
                    // This means the "Inner" side of the fill hugs the current price candles!
                    // The "Outer" side is fixed at `extension`.
                    // So we need to store the `inner` price series.

                    const innerPrice = currentCisd.bias === BULLISH ? low[i] : high[i];
                    if (!currentCisd.fillPoints) currentCisd.fillPoints = [];
                    currentCisd.fillPoints.push({ time: timestamps[i], price: innerPrice });
                }
            }

            // Flush old background if new CISD appears
            if (cisds.length >= 2) {
                const prevCisd = cisds[cisds.length - 2];
                if (!prevCisd.isTerminated) {
                    // Terminate levels
                    customLevels.forEach(lvl => {
                        if (!prevCisd.reachedIndices.has(lvl.idx)) {
                            prevCisd.levelEndTimes[lvl.idx] = cisds[cisds.length - 1].startTime;
                        }
                    });
                    prevCisd.fillEndTime = timestamps[i];
                    prevCisd.isTerminated = true;
                }
            }
        }

        // --- Generate Primitives ---
        cisds.forEach(run => {
            // Pine:
            // currentRunColor = bias == BULLISH ? bearishColorInput : bullishColorInput
            // BULLISH (Green) -> Red Color (Bearish Input)
            // BEARISH (Red)   -> Green Color (Bullish Input)
            const runColorRaw = run.bias === BULLISH ? settings.bearishColor : settings.bullishColor;
            const runColor = this.hexToRgba(runColorRaw, 1);
            const fillColor = this.hexToRgba(runColorRaw, 0.15); // 80 transparency in Pine = ~0.2 alpha? Pine is 0-100 transp. 80 is very transparent.

            const basePrice = run.bias === BULLISH ? run.bottom : run.top;
            const priceBias = run.bias === BULLISH ? -1 : 1;
            const runRange = run.top - run.bottom;

            const globalLimit = run.invalid ? run.invalidationTime : timestamps[len - 1];

            // 1. Fill (Curtain)
            if (settings.backgroundFill && run.fillPoints) {
                const fillEnd = run.fillEndTime || globalLimit;
                const extensionPrice = basePrice + priceBias * (maxMult * runRange);
                const points = [];

                // Add start point?

                for (let pt of run.fillPoints) {
                    if (pt.time > fillEnd) break;
                    if (run.invalid && pt.time > run.invalidationTime) break;

                    // Inner = pt.price (Hugging candles)
                    // Outer = extensionPrice
                    // If Green Zone (Proj Up): Outer > Inner?
                    // Bearish Run (Red) -> Green Zone (Up). Base=Top. Proj=Up.
                    // Inner = high (High of candles).

                    let yTop, yBottom;
                    if (run.bias === BEARISH) { // Green Zone, Up
                        yTop = extensionPrice;
                        yBottom = pt.price; // Hugs Highs
                    } else { // Red Zone, Down
                        yTop = pt.price;    // Hugs Lows
                        yBottom = extensionPrice;
                    }
                    points.push({ time: pt.time, yTop: yTop, yBottom: yBottom });
                }

                if (points.length > 1) {
                    this.primitives.push(new FilledAreaObject({ points: points, color: fillColor }));
                }
            }

            // 2. Levels
            const drawLevel = (price, style, endTimeOverride = null, isLabel = false, val = null) => {
                let end = endTimeOverride || run.endTime;
                if (run.invalid) end = Math.min(end, run.invalidationTime);
                if (end > globalLimit) end = globalLimit;

                this.primitives.push(new LineObject({
                    x1: run.startTime, y1: price,
                    x2: end, y2: price,
                    color: runColor, width: 1, style: style
                }));
                if (isLabel && val !== null) {
                    this.primitives.push(new LabelObject({
                        x: run.startTime, y: price,
                        text: val.toFixed(1),
                        color: 'transparent', textColor: runColor,
                        fontSize: settings.labelsSize, align: 'right'
                    }));
                }
            };

            if (settings.baseLevel) {
                // Base Level matches Run Open Price in Pine?
                // Pine: level(currentRun, currentRun.openPrice, ...)
                // YES, Base Level is OPen Price, NOT Top/Bottom.
                drawLevel(run.openPrice, settings.baseLevelStyle, run.fillEndTime);
            }

            customLevels.forEach(lvl => {
                const levelPrice = basePrice + priceBias * (lvl.m * runRange);
                drawLevel(levelPrice, lvl.s, run.levelEndTimes[lvl.idx], true, lvl.m);
            });
        });

        return this.primitives;
    }

    getHighest(data, endIndex, length) {
        let maxVal = -Infinity;
        const start = Math.max(0, endIndex - length + 1);
        for (let k = start; k <= endIndex; k++) {
            if (data[k] > maxVal) maxVal = data[k];
        }
        return maxVal;
    }

    getLowest(data, endIndex, length) {
        let minVal = Infinity;
        const start = Math.max(0, endIndex - length + 1);
        for (let k = start; k <= endIndex; k++) {
            if (data[k] < minVal) minVal = data[k];
        }
        return minVal;
    }

    checkCISD(run, settings, cisds, i, close) {
        if (run.triggered) return;

        // Pine Logic:
        const FILTER_EPSILON = 1e-9;
        // topFilterOk: bias == BEARISH and bottom == lowest
        const topFilterOk = (run.bias === 0 && Math.abs(run.bottom - run.lowest) < FILTER_EPSILON);
        // bottomFilterOk: bias == BULLISH and top == highest
        const bottomFilterOk = (run.bias === 1 && Math.abs(run.top - run.highest) < FILTER_EPSILON);

        const filterOK = !settings.cisdFilter || (settings.cisdFilter && (topFilterOk || bottomFilterOk));
        const thresholdOK = run.bars >= settings.runBarsThreshold;

        // Trigger Conditions (Breakout)
        // Note: 'bullishBar' and 'bearishBar' in Pine referred to CURRENT bar (checking 'i').
        // But passed 'run' is the old one.
        // bullishTrigger = bias == BEARISH and bullishBar and close > openPrice ...

        // We need to know if current bar 'i' is Bullish/Bearish.
        // Note: In calculate loop, I didn't pass 'i's bullish status.
        // checkCISD only has 'i' and 'close'.
        // Let's assume passed 'close' is close[i].
        // Is current bar Bullish?
        // We need access to OHL, or just assume Close direction relative to Run?
        // Pine requires `bullishBar`.
        // Let's check:
        // const isBullishBar = close[i] >= close[i-1];

        // Wait, `checkCISD` is called inside loop where close[i] is current.
        // I need close[i-1].

        if (thresholdOK && filterOK) {
            const prevClose = this.ohlcv.close[i - 1];
            const currClose = close[i];
            const isBullishBar = currClose >= prevClose;
            const isBearishBar = currClose < prevClose;

            console.log(`CheckCISD i=${i} RunBias=${run.bias} Open=${run.openPrice} PrevC=${prevClose} CurrC=${currClose}`);

            // Pine: bullishTrigger = bias == BEARISH and bullishBar and close > openPrice and close[1] <= openPrice
            // Breakout Up of Bearish Run
            const bullishTrigger = (run.bias === 0) && isBullishBar &&
                (currClose > run.openPrice) && (prevClose <= run.openPrice);

            if (run.bias === 0) console.log(`BullishTriggerCalc: Bias0=${run.bias === 0} Bull=${isBullishBar} ValidBreak=${currClose > run.openPrice} && ${prevClose <= run.openPrice} -> Result=${bullishTrigger}`);

            // Pine: bearishTrigger = bias == BULLISH and bearishBar and close < openPrice and close[1] >= openPrice
            // Breakout Down of Bullish Run
            const bearishTrigger = (run.bias === 1) && isBearishBar &&
                (currClose < run.openPrice) && (prevClose >= run.openPrice);

            if (bullishTrigger || bearishTrigger) {
                run.triggered = true;

                // Update Levels Extremes (Pine Logic)
                // if bias == BULLISH (Green Run -> Red Zone): top = max(prev.top, top) ?
                // Pine: `if currentRun.bias == BULLISH: currentRun.top := math.max(runs.last().top, currentRun.top)`
                // Wait, `runs.last()` in Pine is the `currentRun` itself or the one before?
                // `checkCISD(currentRun)` -> `currentRun` is `runs.last()`.
                // So `max(runs.last().top, currentRun.top)` is self-comparison?
                // No, Pine `runs` array. 
                // If `runs.size() >= 2` check prev.
                // If `runs.size() > 0` check last.
                // Actually this logic seems to stabilize the Top/Bottom of the *triggered* run?
                // Usually it means "Expand to local extremum"?
                // Let's strictly copy. In JS `runs` is all runs.
                // `run` is the one being triggered.

                cisds.push(run);
            }
        }
    }

    invalidateCISD(run, settings, i, close) {
        if (!run.invalid && settings.invalidateCISD) {
            // Pine:
            // invalid = (bias == BEARISH and close < bottom) or (bias == BULLISH and close > top)
            // BEARISH Run (Red, Green Zone, Proj Up). Invalid if close < bottom (Breaks Low?)
            // BULLISH Run (Green, Red Zone, Proj Down). Invalid if close > top (Breaks High?)

            const invalid = (run.bias === 0 && close[i] < run.bottom) ||
                (run.bias === 1 && close[i] > run.top);
            if (invalid) {
                run.invalid = true;
                run.invalidationTime = this.ohlcv.timestamps[i];
            }
        }
    }
}
