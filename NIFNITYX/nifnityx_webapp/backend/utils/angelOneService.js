import { SmartAPI } from "smartapi-javascript";
import { generate } from "otplib"; // generate() is ASYNC - must await!
import axios from "axios";
import https from "https";

// Shared HTTPS agent (bypass self-signed cert issues in dev)
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

// SINGLETON SERVICE FOR ANGEL ONE
class AngelOneService {
    constructor() {
        this.scripMaster = new Map();
        this.isScripMasterLoaded = false;

        // SESSION CACHE: Prevents re-login on every request
        // key: clientCode, value: { jwtToken, feedToken, refreshToken, expiresAt }
        this.sessionCache = new Map();

        // CIRCUIT BREAKER: Stop retrying after fatal errors
        this.loginBlocked = false;
        this.loginBlockedUntil = null;
        this.loginBlockReason = "";
    }

    // 1. INITIALIZE & DOWNLOAD SCRIP MASTER (Run on Server Start)
    async initialize() {
        console.log("🚀 Initializing Angel One Service...");
        try {
            if (!this.isScripMasterLoaded) {
                await this.downloadScripMaster();
            }
        } catch (error) {
            console.error("❌ Failed to initialize Angel One Service:", error.message);
        }
    }

    // 2. DOWNLOAD SCRIP MASTER FROM ANGEL ONE
    async downloadScripMaster() {
        console.log("📥 Downloading Scrip Master...");
        const SCRIP_MASTER_URL = "https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json";

        try {
            const response = await axios.get(SCRIP_MASTER_URL);
            const scrips = response.data;

            console.log(`✅ Downloaded ${scrips.length} scrips. Filtering and Indexing...`);

            this.scripMaster.clear();

            let count = 0;
            for (const scrip of scrips) {
                if (scrip.exch_seg === "NSE" || scrip.exch_seg === "NFO") {
                    this.scripMaster.set(scrip.symbol, {
                        token: scrip.token,
                        symbol: scrip.symbol,
                        name: scrip.name,
                        expiry: scrip.expiry,
                        strike: scrip.strike,
                        lotsize: scrip.lotsize,
                        instrumenttype: scrip.instrumenttype,
                        exch_seg: scrip.exch_seg
                    });
                    count++;
                }
            }

            this.isScripMasterLoaded = true;
            console.log(`💾 Scrip Master Loaded. Indexed ${count} instruments.`);

        } catch (error) {
            console.error("❌ Error downloading Scrip Master:", error.message);
            throw error;
        }
    }

    // ═══════════════════════════════════════════════════════════
    // 3. GENERATE SESSION (DAILY HANDSHAKE)
    //    FIX #1: await generate() — it's async!
    //    FIX #2: Circuit breaker — stop retrying on 400/401
    //    FIX #3: Session cache — reuse token until expiry
    // ═══════════════════════════════════════════════════════════
    async generateSession(clientCode, password, apiKey, totpSecret) {

        // ── CIRCUIT BREAKER CHECK ──
        if (this.loginBlocked && this.loginBlockedUntil && Date.now() < this.loginBlockedUntil) {
            console.warn(`🛑 Login blocked until ${new Date(this.loginBlockedUntil).toLocaleTimeString()} — Reason: ${this.loginBlockReason}`);
            return { status: false, message: `Login temporarily blocked: ${this.loginBlockReason}. Try again later.` };
        }
        // Auto-unblock after cooldown
        if (this.loginBlocked && Date.now() >= this.loginBlockedUntil) {
            this.loginBlocked = false;
            this.loginBlockedUntil = null;
            this.loginBlockReason = "";
            console.log("✅ Login block cleared. Retrying...");
        }

        // ── SESSION CACHE CHECK ──
        const cached = this.sessionCache.get(clientCode);
        if (cached && cached.expiresAt > Date.now()) {
            console.log(`♻️  Using cached session for ${clientCode} (expires at ${new Date(cached.expiresAt).toLocaleTimeString()})`);
            return {
                status: true,
                jwtToken: cached.jwtToken,
                feedToken: cached.feedToken,
                refreshToken: cached.refreshToken
            };
        }

        console.log(`🔐 Generating Session for ${clientCode}...`);

        // ── STEP 1: Generate TOTP (6-digit code) ──
        // CRITICAL FIX: generate() is ASYNC — must await!
        // Without await, we send "[object Promise]" as the TOTP → 400 Bad Request
        let totp;
        try {
            totp = await generate({ secret: totpSecret }); // ← THE MISSING AWAIT
            console.log(`🔑 TOTP Generated: ${totp} (${totp.length} digits)`);
        } catch (e) {
            console.error("❌ TOTP Generation Failed:", e.message);
            return { status: false, message: "Invalid TOTP Secret: " + e.message };
        }

        // ── STEP 2: Login via Angel One REST API ──
        try {
            const loginUrl = "https://apiconnect.angelbroking.com/rest/auth/angelbroking/user/v1/loginByPassword";

            const headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-UserType': 'USER',
                'X-SourceID': 'WEB',
                'X-ClientLocalIP': '192.168.1.1',
                'X-ClientPublicIP': '106.193.147.98',
                'X-MACAddress': '00:00:00:00:00:00',
                'X-PrivateKey': apiKey
            };

            const payload = {
                clientcode: clientCode,
                password: password,
                totp: totp  // Now a proper 6-digit string like "868976"
            };

            const response = await axios.post(loginUrl, payload, { headers, httpsAgent });
            const data = response.data;

            console.log("🔍 Angel One Login Response:", JSON.stringify(data, null, 2));

            if (data.status === true) {
                console.log("✅ Session Generated Successfully!");

                // Cache for ~12 hours (Angel One sessions expire at midnight)
                const now = new Date();
                const midnight = new Date(now);
                midnight.setHours(23, 59, 59, 999);
                const expiresAt = midnight.getTime();

                this.sessionCache.set(clientCode, {
                    jwtToken: data.data.jwtToken,
                    feedToken: data.data.feedToken,
                    refreshToken: data.data.refreshToken,
                    expiresAt: expiresAt
                });

                return {
                    status: true,
                    jwtToken: data.data.jwtToken,
                    feedToken: data.data.feedToken,
                    refreshToken: data.data.refreshToken
                };
            } else {
                console.error("❌ Session Generation Failed:", data.message);

                // CIRCUIT BREAKER: Block login for 60s on credential errors
                this._blockLogin(data.message || "Login rejected by Angel One", 60);

                return { status: false, message: data.message || "Login failed" };
            }

        } catch (error) {
            const statusCode = error.response?.status;
            const errorData = error.response?.data || {};
            const errorMsg = typeof errorData === 'string' ? errorData : (errorData.message || error.message);

            console.error(`❌ Angel One API Error (HTTP ${statusCode}):`, errorMsg);

            // CIRCUIT BREAKER LOGIC
            if (statusCode === 400) {
                // Bad Request = wrong credentials/format. Don't retry immediately.
                this._blockLogin("Bad Request (400) — Check credentials", 120); // 2 min cooldown
            } else if (statusCode === 401) {
                this._blockLogin("Unauthorized (401) — Invalid credentials", 120);
            } else if (statusCode === 403) {
                // Rate limited! Back off for 5 minutes
                this._blockLogin("Rate Limited (403) — Too many requests", 300); // 5 min cooldown
            }
            // For 500 / timeout errors, we don't block — they might be temporary

            return { status: false, message: errorMsg };
        }
    }

    // Helper: Block login attempts for a duration
    _blockLogin(reason, durationSeconds) {
        this.loginBlocked = true;
        this.loginBlockedUntil = Date.now() + (durationSeconds * 1000);
        this.loginBlockReason = reason;
        console.warn(`🛑 CIRCUIT BREAKER: Login blocked for ${durationSeconds}s — ${reason}`);
    }

    // ═══════════════════════════════════════════════════════════
    // 4. GET MARKET DATA (HISTORICAL CANDLES)
    // ═══════════════════════════════════════════════════════════
    async getMarketData(apiKey, jwtToken, symbol, interval = "FIVE_MINUTE") {
        // NIFTY 50 Index default
        let token = "99926000";
        let exchange = "NSE";

        const instrument = this.scripMaster.get(symbol);
        if (symbol === "NIFTY" || symbol === "NIFICANDLE") {
            token = "99926000";
        } else if (instrument) {
            token = instrument.token;
            exchange = instrument.exch_seg;
        }

        // Use raw Axios (matching Python script) instead of SmartAPI SDK
        const url = "https://apiconnect.angelbroking.com/rest/secure/angelbroking/historical/v1/getCandleData";

        const toDate = new Date();
        const fromDate = new Date();
        fromDate.setDate(toDate.getDate() - 7);

        const formatDate = (d) => {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            const hh = String(d.getHours()).padStart(2, '0');
            const min = String(d.getMinutes()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
        };

        try {
            const headers = {
                'Authorization': `Bearer ${jwtToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-UserType': 'USER',
                'X-SourceID': 'WEB',
                'X-ClientLocalIP': '192.168.1.1',
                'X-ClientPublicIP': '106.193.147.98',
                'X-MACAddress': '00:00:00:00:00:00',
                'X-PrivateKey': apiKey
            };

            const payload = {
                exchange: exchange,
                symboltoken: token,
                interval: interval,
                fromdate: formatDate(fromDate),
                todate: formatDate(toDate)
            };

            console.log("📊 Fetching Candles:", payload);

            const response = await axios.post(url, payload, { headers, httpsAgent });
            const data = response.data;

            if (data.status === true && data.data) {
                const chartData = data.data.map(candle => ({
                    time: new Date(candle[0]).getTime() / 1000,
                    open: candle[1],
                    high: candle[2],
                    low: candle[3],
                    close: candle[4],
                }));

                chartData.sort((a, b) => a.time - b.time);
                return chartData;
            } else {
                console.warn("⚠️ No candle data returned:", data.message);
                return [];
            }

        } catch (error) {
            console.error("Market Data Fetch Error:", error.response?.status || error.message);
            return [];
        }
    }

    // ═══════════════════════════════════════════════════════════
    // 5. GET RMS (MARGIN / FUNDS)
    // ═══════════════════════════════════════════════════════════
    async getRMS(apiKey, jwtToken) {
        const url = "https://apiconnect.angelbroking.com/rest/secure/angelbroking/user/v1/getRMS";

        try {
            const headers = {
                'Authorization': `Bearer ${jwtToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-UserType': 'USER',
                'X-SourceID': 'WEB',
                'X-ClientLocalIP': '192.168.1.1',
                'X-ClientPublicIP': '106.193.147.98',
                'X-MACAddress': '00:00:00:00:00:00',
                'X-PrivateKey': apiKey
            };

            const response = await axios.get(url, { headers, httpsAgent });
            const data = response.data;

            if (data.status === true) {
                return data.data;
            }
            return null;
        } catch (error) {
            console.error("Error fetching RMS:", error.response?.status || error.message);
            return null;
        }
    }

    // ═══════════════════════════════════════════════════════════
    // 6. PLACE ORDER
    // ═══════════════════════════════════════════════════════════
    async placeOrder(apiKey, jwtToken, orderParams) {
        const instrument = this.scripMaster.get(orderParams.symbol);
        if (!instrument) throw new Error("Symbol not found in Scrip Master");

        const smartApi = new SmartAPI({ api_key: apiKey, jwt_token: jwtToken });

        try {
            const payload = {
                variety: "NORMAL",
                tradingsymbol: instrument.symbol,
                symboltoken: instrument.token,
                transactiontype: orderParams.transactionType,
                exchange: instrument.exch_seg,
                ordertype: "MARKET",
                producttype: "CARRYFORWARD",
                duration: "DAY",
                price: orderParams.price || "0",
                squareoff: "0",
                stoploss: "0",
                quantity: orderParams.quantity
            };

            const response = await smartApi.placeOrder(payload);
            return response;

        } catch (error) {
            console.error("Order Placement Failed:", error);
            throw error;
        }
    }

}

export const angelOneService = new AngelOneService();
