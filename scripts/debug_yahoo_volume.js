const symbol = 'NVDA';
const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=6mo&indicators=quote&includePrePost=false`;

console.log(`Fetching ${url}...`);

try {
    const response = await fetch(url);
    console.log(`Response Status: ${response.status}`);

    if (!response.ok) {
        console.error('Failed to fetch:', response.statusText);
        process.exit(1);
    }

    const json = await response.json();

    if (!json.chart || !json.chart.result) {
        console.error('Invalid structure:', Object.keys(json));
        process.exit(1);
    }

    const result = json.chart.result[0];
    const quote = result.indicators.quote[0];

    console.log('--- Data Inspection ---');
    console.log('Symbol:', result.meta.symbol);
    console.log('Timestamps:', result.timestamp.length);

    if (quote.volume) {
        console.log('Volume Array Length:', quote.volume.length);
        const nonNullVolume = quote.volume.filter(v => v !== null).length;
        console.log('Non-Null Volumes:', nonNullVolume);

        const filledVolumes = quote.volume.filter(v => v !== null);
        console.log('Sample Volumes (First 5):', filledVolumes.slice(0, 5));
        console.log('Sample Volumes (Last 5):', filledVolumes.slice(-5));

        if (nonNullVolume === 0) {
            console.error('CRITICAL: All volumes are null!');
        } else {
            console.log('Volume data looks OK.');
        }

        // Additional Check for Zeros
        const zeroVolumes = quote.volume.filter(v => v === 0).length;
        console.log('Zero Volumes:', zeroVolumes);

    } else {
        console.error('CRITICAL: quote.volume is undefined!');
    }

    // --- Verify OBV Calculation ---
    function calculateOBV(close, volume) {
        const length = close.length;
        const obv = new Array(length).fill(NaN);
        let currentOBV = 0;
        let startIndex = 0;
        while (startIndex < length) {
            const c = Number(close[startIndex]);
            if (!isNaN(c)) {
                let v = Number(volume[startIndex]);
                if (isNaN(v)) v = 0;
                obv[startIndex] = v;
                currentOBV = v;
                break;
            }
            startIndex++;
        }
        for (let i = startIndex + 1; i < length; i++) {
            const c = Number(close[i]);
            const prevC = Number(close[i - 1]);
            if (isNaN(c) || isNaN(prevC)) {
                obv[i] = NaN;
                continue;
            }
            let v = Number(volume[i]);
            if (isNaN(v)) v = 0;
            const change = c - prevC;
            if (change > 0) currentOBV += v;
            else if (change < 0) currentOBV -= v;
            obv[i] = currentOBV;
        }
        return obv;
    }

    const calculatedOBV = calculateOBV(quote.close, quote.volume);
    const validOBV = calculatedOBV.filter(v => !isNaN(v));
    console.log('--- OBV Calculation Test ---');
    console.log('Total OBV Points:', calculatedOBV.length);
    console.log('Valid OBV Points:', validOBV.length);
    if (validOBV.length > 0) {
        console.log('Last OBV Value:', validOBV[validOBV.length - 1]);
        console.log('SUCCESS: OBV Calculated.');
    } else {
        console.error('FAILURE: OBV is all NaNs.');
    }

} catch (e) {
    console.error('Error:', e);
}
