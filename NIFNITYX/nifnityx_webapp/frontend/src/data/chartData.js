// Generates realistic-looking random candle data for the chart initialization
// In production, this would be replaced by an API call to get historical data
export const generateInitialData = (count = 300) => {
    const data = [];
    // Start 'count' minutes ago
    let time = Math.floor(Date.now() / 1000) - (count * 60); 
    let price = 24500; // Starting NIFTY price

    for (let i = 0; i < count; i++) {
        // Random volatility logic
        const volatility = (Math.random() - 0.5) * 15; 
        const open = price;
        const close = price + volatility;
        
        // Ensure High/Low encapsulate Open/Close
        const high = Math.max(open, close) + Math.random() * 5;
        const low = Math.min(open, close) - Math.random() * 5;

        data.push({
            time: time + (i * 60),
            open,
            high,
            low,
            close,
        });

        price = close;
    }
    return data;
};