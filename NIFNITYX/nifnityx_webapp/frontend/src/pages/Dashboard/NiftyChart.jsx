import React, { useEffect, useRef, memo } from 'react';

/**
 * TradingView Widget Component
 * Configured to use GIFT Nifty (NSEIX:NIFTY1!) to solve the "Blocked/Delayed" data issue.
 */
function TradingViewWidget() {
  const container = useRef();

  useEffect(() => {
    // Check if script is already injected to prevent duplicates
    if (container.current && container.current.querySelector("script")) return;

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = `
      {
        "autosize": true,
        "symbol": "NSEIX:NIFTY1!",
        "interval": "D",
        "timezone": "Asia/Kolkata",
        "theme": "dark",
        "style": "1",
        "locale": "en",
        "enable_publishing": false,
        "allow_symbol_change": true,
        "calendar": false,
        "hide_side_toolbar": false,
        "support_host": "https://www.tradingview.com"
      }`;
    container.current.appendChild(script);
  },);

  return (
    <div className="tradingview-widget-container" ref={container} style={{ height: "100%", width: "100%" }}>
      <div className="tradingview-widget-container__widget" style={{ height: "calc(100% - 32px)", width: "100%" }}></div>
      <div className="tradingview-widget-copyright">
        <a href="https://www.tradingview.com/" rel="noopener nofollow" target="_blank">
          <span className="blue-text">Track all markets on TradingView</span>
        </a>
      </div>
    </div>
  );
}

const MemoizedWidget = memo(TradingViewWidget);

/**
 * Main Page Component
 * Responsive, Dark Theme, and Consistent Styling
 */
export default function MarketDashboard() {
  // Inline styles for true dark theme consistency
  const styles = {
    pageContainer: {
      backgroundColor: "#0f0f0f", // Matches TradingView dark background
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      color: "#e0e0e0",
      fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    },
    header: {
      padding: "1rem 2rem",
      borderBottom: "1px solid #2a2e39",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: "#131722"
    },
    logo: {
      margin: 0,
      fontSize: "1.25rem",
      fontWeight: "bold",
      letterSpacing: "0.5px"
    },
    accent: {
      color: "#2962ff" // TradingView Blue
    },
    main: {
      flex: 1,
      padding: "20px",
      display: "flex",
      flexDirection: "column",
      gap: "20px"
    },
    chartSection: {
      flex: 1,
      minHeight: "600px", // Ensures visibility on all devices
      position: "relative",
      border: "1px solid #2a2e39",
      borderRadius: "8px",
      overflow: "hidden",
      backgroundColor: "#131722"
    }
  };

  return (
    <div style={styles.pageContainer}>
      {/* Navigation Header */}
      <nav style={styles.header}>
        <h1 style={styles.logo}>
          Trade<span style={styles.accent}>Dash</span>
        </h1>
        <div style={{ fontSize: "0.9rem", opacity: 0.8 }}>
          Live Market Data
        </div>
      </nav>

      {/* Main Content */}
      <main style={styles.main}>
        {/* Chart Container */}
        <section style={styles.chartSection}>
          <MemoizedWidget />
        </section>
      </main>
    </div>
  );
}