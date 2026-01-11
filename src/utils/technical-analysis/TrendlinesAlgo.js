import { LineObject, BoxObject, LabelObject, ArrowObject, SideBarObject } from './StandardPrimitives.js';

/**
 * Trendlines & SR Zones Algorithm
 * Ported strictly from provided Pine Script v6
 */
export class TrendlinesAlgo {
    constructor(ohlcvData) {
        this.ohlcv = ohlcvData; // { timestamps, open, high, low, close, volume }
        this.primitives = [];
    }

    /**
     * Main calculation function
     */
    calculate(config = {}) {
        this.primitives = [];
        const defaults = {
            // Trendlines
            leftBars: 10,
            rightBars: 10,
            extendBars: 50,
            period: 100, // Avg body period
            multiplier: 1.0, // Tolerance multiplier
            highLineColor: 'rgba(255, 59, 48, 1)',
            lowLineColor: 'rgba(52, 199, 89, 1)',

            // Breakouts
            enableBreakouts: true,

            // Volume Delta
            vdLookback: 200,
            vdRows: 50,
            vdSections: 20,
            vdZoneNum: 3,
            vdZoneExtend: 50,
            vdPanelWidth: 40, // Visual width scaler
            vdZoneColorDemand: 'rgba(52, 199, 89, 0.3)',
            vdZoneColorDemand: 'rgba(52, 199, 89, 0.3)',
            vdZoneColorSupply: 'rgba(255, 59, 48, 0.3)',
            vdBarAlign: 'left' // 'right' or 'left'
        };

        const settings = { ...defaults, ...config };

        const { timestamps, open, high, low, close, volume } = this.ohlcv;
        const len = timestamps.length;
        if (len < settings.leftBars + settings.rightBars) return [];

        // ----------------------------------------------------
        // 1. Trendlines & Breakouts Logic
        // ----------------------------------------------------

        // Helper: Calculate SMA of Body Sizes
        const bodySizes = close.map((c, i) => Math.abs(open[i] - c));
        const avgBodyArr = this.calculateSMA(bodySizes, settings.period);

        // Storage for Active Trendlines (simulating Pine's var arrays)
        // We need to track them chronologically as they are created
        let allLines = []; // objects: { x1, y1, x2, y2, slope, tolerance, isHigh, broken, breakBar, alertGiven, creationIndex }

        // We simulate the bar-by-bar execution for Pivot detection and Line management
        // Start iteration from enough history
        const startIndex = settings.leftBars + settings.rightBars;

        for (let i = startIndex; i < len; i++) {
            // Check Pivots (at i - rightBars)
            const pivotIndex = i - settings.rightBars;

            // Check Pivot High
            if (this.isPivot(high, pivotIndex, settings.leftBars, settings.rightBars, true)) {
                this.handlePivot(settings, allLines, true, pivotIndex, high[pivotIndex], avgBodyArr, i);
            }

            // Check Pivot Low
            if (this.isPivot(low, pivotIndex, settings.leftBars, settings.rightBars, false)) {
                this.handlePivot(settings, allLines, false, pivotIndex, low[pivotIndex], avgBodyArr, i);
            }

            // Breakout Detection (running on CURRENT bar 'i')
            if (settings.enableBreakouts) {
                this.checkBreakouts(settings, allLines, i, timestamps, high, low, close);
            }
        }

        // Convert Active Trendlines to Primitives
        allLines.forEach(l => {
            const color = l.broken ? '#FF9800' : (l.isHigh ? settings.highLineColor : settings.lowLineColor); // Orange if broken
            const width = l.broken ? 1 : 2;

            // Handle Time Projection for X2 (which extends into future)
            const t1 = this.getTimeCount(timestamps, l.x1);
            const t2 = this.getTimeCount(timestamps, l.x2);

            // Main Line
            this.primitives.push(new LineObject({
                x1: t1,
                y1: l.y1,
                x2: t2,
                y2: l.y2,
                color: color,
                width: width
            }));

            // Parallel/Tolerance Line
            if (!l.broken) {
                const y1_par = l.y1 + (l.isHigh ? l.tolerance : -l.tolerance);
                const y2_par = l.y2 + (l.isHigh ? l.tolerance : -l.tolerance);
                const parColor = l.isHigh ? 'rgba(255, 59, 48, 0.5)' : 'rgba(52, 199, 89, 0.5)';

                this.primitives.push(new LineObject({
                    x1: t1,
                    y1: y1_par,
                    x2: t2,
                    y2: y2_par,
                    color: parColor,
                    width: 1,
                    style: 'dotted'
                }));
            }
        });

        // ----------------------------------------------------
        // 2. Volume Delta Zones Logic
        // ----------------------------------------------------
        this.calculateVolumeDeltaZones(settings);

        return this.primitives;
    }

    // ==========================================================
    // TRAILING HELPERS
    // ==========================================================

    getTimeCount(timestamps, index) {
        if (index < 0) return timestamps[0];
        if (index < timestamps.length) return timestamps[index];

        // Extrapolate future time
        const len = timestamps.length;
        if (len < 2) return timestamps[len - 1]; // Fallback

        const lastTime = timestamps[len - 1];
        const prevTime = timestamps[len - 2];
        const interval = lastTime - prevTime; // Average step

        // Projected
        return lastTime + (index - (len - 1)) * interval;
    }

    // ==========================================================
    // TRENDLINE HELPERS
    // ==========================================================

    handlePivot(settings, allLines, isHigh, idx, price, avgBodyArr, currentBarIdx) {
        const currentTolerance = settings.multiplier * (avgBodyArr[idx] || 0);

        // Create New Line Candidate
        const newLine = {
            isHigh: isHigh,
            x1: idx,
            y1: price,
            x2: idx,
            y2: price,
            slope: 0,
            tolerance: currentTolerance,
            broken: false,
            breakBar: -1,
            alertGiven: false,
            creationIndex: idx
        };

        allLines.push(newLine);

        // Find recent line of SAME type (Second to last)
        let recentLineIdx = -1;
        for (let k = allLines.length - 2; k >= 0; k--) {
            if (allLines[k].isHigh === isHigh) {
                recentLineIdx = k;
                break;
            }
        }

        if (recentLineIdx >= 0) {
            const recentLine = allLines[recentLineIdx];

            // Calculate slope to connect recentLine to this new pivot
            const dx = idx - recentLine.x1;
            const slope = dx !== 0 ? (price - recentLine.y1) / dx : 0;

            // Extend PAST this pivot
            const x2_ext = idx + settings.extendBars;
            const y2_ext = recentLine.y1 + slope * (x2_ext - recentLine.x1);

            // Update recentLine properties
            recentLine.x2 = x2_ext;
            recentLine.y2 = y2_ext;
            recentLine.slope = slope;

            // Slope Validation
            let deleteRecent = false;
            // High Trendline must be falling (slope <= 0) or flat to be valid resistance per script logic?
            // Script: "if slope > 0 delete" for High.
            if (isHigh && slope > 0) deleteRecent = true;
            // Low Trendline must be rising (slope >= 0) or flat.
            // Script: "if slope < 0 delete" for Low.
            if (!isHigh && slope < 0) deleteRecent = true;

            if (deleteRecent) {
                allLines.splice(recentLineIdx, 1);
            }
        }

        // Keep Last 3 items
        while (allLines.length > 3) {
            allLines.shift(); // Remove oldest
        }
    }

    checkBreakouts(settings, allLines, i, timestamps, high, low, close) {
        if (i <= 0) return;

        allLines.forEach(l => {
            if (l.broken && (i - l.breakBar > 2)) return;

            const dx = (i - 1) - l.x1;
            const prevExpectedY = l.y1 + l.slope * dx;

            let breakUp = false;
            let breakDown = false;

            if (l.isHigh) {
                // Resistance Breakout
                if (close[i - 1] > (prevExpectedY + l.tolerance) && high[i] >= high[i - 1]) {
                    if (!l.broken) {
                        breakUp = true;
                    } else if (i - l.breakBar <= 2) {
                        breakUp = true;
                    }
                }
            } else {
                // Support Breakout
                if (close[i - 1] < (prevExpectedY - l.tolerance) && low[i] <= low[i - 1]) {
                    if (!l.broken) {
                        breakDown = true;
                    } else if (i - l.breakBar <= 2) {
                        breakDown = true;
                    }
                }
            }

            if (breakUp) {
                if (!l.broken) {
                    l.broken = true;
                    l.breakBar = i;
                }
                this.primitives.push(new ArrowObject({
                    x: timestamps[i],
                    y: low[i],
                    direction: 'up',
                    color: '#00E676', // Green
                    text: ''
                }));
            }

            if (breakDown) {
                if (!l.broken) {
                    l.broken = true;
                    l.breakBar = i;
                }
                this.primitives.push(new ArrowObject({
                    x: timestamps[i],
                    y: high[i],
                    direction: 'down',
                    color: '#FF1744', // Red
                    text: ''
                }));
            }
        });
    }

    isPivot(data, index, left, right, isHigh) {
        if (index - left < 0 || index + right >= data.length) return false;
        const val = data[index];
        for (let i = 1; i <= left; i++) {
            if (isHigh) { if (data[index - i] > val) return false; }
            else { if (data[index - i] < val) return false; }
        }
        for (let i = 1; i <= right; i++) {
            if (isHigh) { if (data[index + i] >= val) return false; }
            else { if (data[index + i] <= val) return false; }
        }
        return true;
    }

    calculateSMA(data, period) {
        let sma = new Array(data.length).fill(0);
        for (let i = 0; i < data.length; i++) {
            if (i < period - 1) { sma[i] = 0; continue; }
            let sum = 0;
            for (let j = 0; j < period; j++) sum += data[i - j];
            sma[i] = sum / period;
        }
        return sma;
    }

    // ==========================================================
    // VOLUME DELTA ZONES LOGIC
    // ==========================================================
    calculateVolumeDeltaZones(settings) {
        const { timestamps, high, low, close, open, volume } = this.ohlcv;
        const len = timestamps.length;
        if (len < settings.vdLookback) return;

        const startIdx = len - settings.vdLookback;

        // 1. Calculate Price Range over lookback
        let maxP = -Infinity;
        let minP = Infinity;
        for (let i = startIdx; i < len; i++) {
            if (high[i] > maxP) maxP = high[i];
            if (low[i] < minP) minP = low[i];
        }
        const priceRange = maxP - minP;
        if (priceRange <= 0) return;

        const rowCount = settings.vdRows;
        const rowSize = priceRange / rowCount;

        const binsBull = new Array(rowCount).fill(0);
        const binsBear = new Array(rowCount).fill(0);

        // 2. Populate Bins
        for (let i = startIdx; i < len; i++) {
            const p = (high[i] + low[i] + close[i]) / 3; // HLC3
            const vol = volume[i];
            const isBull = close[i] > open[i];

            let binIdx = Math.floor((p - minP) / rowSize);
            if (binIdx < 0) binIdx = 0;
            if (binIdx >= rowCount) binIdx = rowCount - 1;

            if (isBull) binsBull[binIdx] += vol;
            else binsBear[binIdx] += vol;
        }

        // 3. Create Sections
        const sectionCount = settings.vdSections;
        const rowsPerSection = Math.max(1, Math.floor(rowCount / sectionCount));

        let sections = [];
        let maxTotalVol = 0;

        for (let s = 0; s < sectionCount; s++) {
            let sBull = 0, sBear = 0;
            const startBin = s * rowsPerSection;
            // Fix: Strict Pine Script logic - Last section grabs all remaining rows
            let endBin;
            if (s === sectionCount - 1) {
                endBin = rowCount - 1;
            } else {
                endBin = Math.min((s + 1) * rowsPerSection - 1, rowCount - 1);
            }

            if (startBin > endBin) continue;
            if (startBin >= rowCount) break;

            for (let k = startBin; k <= endBin; k++) {
                sBull += binsBull[k];
                sBear += binsBear[k];
            }

            const total = sBull + sBear;
            if (total <= 0) continue;
            if (total > maxTotalVol) maxTotalVol = total;

            const topPrice = minP + (endBin + 1) * rowSize;
            const botPrice = minP + (startBin) * rowSize;

            const delta = sBull - sBear;
            const deltaPct = (delta / total) * 100;

            sections.push({
                deltaPct,
                total,
                top: topPrice,
                bottom: botPrice,
                isDemand: deltaPct > 0
            });
        }

        // 4. Draw SideBars
        sections.forEach(sec => {
            const widthRatio = sec.total / maxTotalVol;
            const displayWidthPct = widthRatio * 0.3;

            const color = sec.deltaPct > 0 ?
                `rgba(52, 199, 89, ${0.3 + widthRatio * 0.5})` :
                `rgba(255, 59, 48, ${0.3 + widthRatio * 0.5})`;

            this.primitives.push(new SideBarObject({
                y1: sec.top,
                y2: sec.bottom,
                value: sec.deltaPct,
                color: color,
                text: `Δ ${sec.deltaPct.toFixed(1)}%`,
                widthPct: Math.max(0.02, displayWidthPct),
                align: settings.vdBarAlign
            }));
        });

        // 5. Draw Zones (Top N)
        const demandZones = sections.filter(s => s.deltaPct > 0).sort((a, b) => b.deltaPct - a.deltaPct);
        const supplyZones = sections.filter(s => s.deltaPct < 0).sort((a, b) => a.deltaPct - b.deltaPct);

        const topDemand = demandZones.slice(0, settings.vdZoneNum);
        const topSupply = supplyZones.slice(0, settings.vdZoneNum);

        const lastTime = timestamps[len - 1];
        const extendIdx = Math.max(0, len - settings.vdZoneExtend);
        // Use getTimeCount here too for safety, although extendIdx usually < len
        const startTime = this.getTimeCount(timestamps, extendIdx);

        topDemand.forEach((z, i) => {
            const opacity = 0.3 + (i * 0.1);
            const color = `rgba(52, 199, 89, ${opacity})`;

            this.primitives.push(new BoxObject({
                x1: startTime,
                y1: z.top,
                x2: lastTime,
                y2: z.bottom,
                color: color,
                borderWidth: 1,
                borderColor: 'rgb(52, 199, 89)'
            }));

            this.primitives.push(new LabelObject({
                x: startTime,
                y: z.top,
                text: `Demand ${i + 1}`,
                color: 'transparent',
                textColor: 'rgb(52, 199, 89)',
                fontSize: 10
            }));
        });

        topSupply.forEach((z, i) => {
            const opacity = 0.3 + (i * 0.1);
            const color = `rgba(255, 59, 48, ${opacity})`;

            this.primitives.push(new BoxObject({
                x1: startTime,
                y1: z.top,
                x2: lastTime,
                y2: z.bottom,
                color: color,
                borderWidth: 1,
                borderColor: 'rgb(255, 59, 48)'
            }));

            this.primitives.push(new LabelObject({
                x: startTime,
                y: z.top,
                text: `Supply ${i + 1}`,
                color: 'transparent',
                textColor: 'rgb(255, 59, 48)',
                fontSize: 10
            }));
        });
    }
}
