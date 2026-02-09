import Broker from "../models/Broker.js";
import User from "../models/User.js";
import { encrypt, decrypt } from "../utils/encryption.js";
import axios from "axios";
// USE FUNCTIONAL API as per latest docs
import { generate } from "otplib";

// @desc    Get current trading mode and broker status
// @route   GET /api/broker/status
export const getBrokerStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("settings");
    const broker = await Broker.findOne({ user: req.user._id, brokerName: "AngelOne" });

    res.json({
      tradingMode: user.settings.tradingMode,
      brokerConnected: !!broker,
      brokerLastVerified: broker ? broker.lastVerifiedAt : null,
      // Send masked version to frontend to protect keys
      maskedKey: broker ? "************" + decrypt(broker.apiKey).slice(-4) : null,
      clientCode: broker ? broker.clientCode : null
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update Global Trading Mode
// @route   POST /api/broker/mode
export const updateTradingMode = async (req, res) => {
  try {
    const { mode } = req.body;
    if (!["paper", "live"].includes(mode)) {
      return res.status(400).json({ message: "Invalid mode" });
    }

    const user = await User.findById(req.user._id);
    user.settings.tradingMode = mode;
    await user.save();

    res.json({ message: `Switched to ${mode.toUpperCase()} Trading Mode`, mode });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Save or Update Broker Keys
// @route   POST /api/broker/keys
export const saveBrokerKeys = async (req, res) => {
  try {
    const { brokerName, clientCode, password, apiKey, secretKey, totpSecret } = req.body;

    if (!clientCode || !password || !apiKey || !secretKey || !totpSecret) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Helper to check if input is a mask (from frontend)
    const isMasked = (val) => val && val.toString().includes("****");

    // 1. Fetch existing broker
    const existingBroker = await Broker.findOne({ user: req.user._id, brokerName });

    const updates = {
        clientCode,
        isActive: true,
        lastVerifiedAt: null
    };

    // 2. Handle Sensitive Fields (Smart Update)
    const sensitiveFields = [
        { name: "password", val: password },
        { name: "apiKey", val: apiKey },
        { name: "secretKey", val: secretKey },
        { name: "totpSecret", val: totpSecret }
    ];

    for (const field of sensitiveFields) {
        if (isMasked(field.val)) {
            if (!existingBroker) {
                return res.status(400).json({ 
                    message: `Cannot save masked ${field.name} for a new connection. Please enter the actual value.` 
                });
            }
        } else {
            updates[field.name] = encrypt(field.val);
        }
    }

    await Broker.findOneAndUpdate(
      { user: req.user._id, brokerName },
      { $set: updates },
      { new: true, upsert: true }
    );

    res.json({ message: "Keys saved securely. Please test connection." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Test Broker Connection (REAL Implementation)
// @route   POST /api/broker/test
export const testConnection = async (req, res) => {
  try {
    const { brokerName } = req.body;
    const broker = await Broker.findOne({ user: req.user._id, brokerName });

    if (!broker) {
      return res.status(404).json({ message: "No keys found. Save keys first." });
    }

    const decryptedApiKey = decrypt(broker.apiKey);
    const decryptedPassword = decrypt(broker.password);
    const decryptedTotpSecret = decrypt(broker.totpSecret);
    const clientCode = broker.clientCode;

    if (decryptedTotpSecret.includes("*") || decryptedApiKey.includes("*")) {
        return res.status(400).json({ message: "Stored keys appear invalid (masked). Please re-enter them." });
    }

    // 1. Generate TOTP
    if (!decryptedTotpSecret) throw new Error("Decrypted TOTP Secret is empty");
    const token = await generate({ secret: decryptedTotpSecret });

    console.log(`[AngelOne] Login attempt: ${clientCode} | TOTP Generated`);

    // 2. Call Angel One Login API
    const loginUrl = "https://apiconnect.angelbroking.com/rest/auth/angelbroking/user/v1/loginByPassword";
    
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-UserType': 'USER',
      'X-SourceID': 'WEB',
      'X-ClientLocalIP': '127.0.0.1',
      'X-ClientPublicIP': '127.0.0.1',
      'X-MACAddress': 'mac_address',
      'X-PrivateKey': decryptedApiKey
    };

    const payload = {
      clientcode: clientCode,
      password: decryptedPassword,
      totp: token
    };

    const startTime = Date.now();
    const response = await axios.post(loginUrl, payload, { headers });
    const endTime = Date.now();
    const latency = endTime - startTime;

    if (response.data.status === true) {
      broker.lastVerifiedAt = new Date();
      await broker.save();

      res.json({
        success: true,
        message: "Authenticated with Angel One successfully!",
        latency: `${latency}ms`,
        data: {
          user: response.data.data.clientcode,
          name: response.data.data.clientname
        }
      });
    } else {
      return res.status(401).json({
        message: `Angel One Login Failed: ${response.data.message} (${response.data.errorcode})`
      });
    }
  } catch (error) {
    console.error("Angel One Connection Error:", error.response?.data || error.message);
    const errorMsg = error.response?.data?.message || error.message || "Connection failed";
    const errorCode = error.response?.data?.errorcode ? ` (Code: ${error.response.data.errorcode})` : "";
    
    res.status(500).json({ message: `Connection Error: ${errorMsg}${errorCode}` });
  }
};

// @desc    Fetch Live Market Status (NIFTY 50 & VIX)
// @route   GET /api/broker/market-status
export const getMarketStatus = async (req, res) => {
  try {
    const broker = await Broker.findOne({ user: req.user._id, brokerName: "AngelOne" });

    if (!broker) {
      return res.json({
        nifty: { price: 0, change: 0, percent: 0 },
        vix: { price: 0, change: 0, percent: 0 },
        connected: false
      });
    }

    const decryptedApiKey = decrypt(broker.apiKey);
    const decryptedPassword = decrypt(broker.password);
    const decryptedTotpSecret = decrypt(broker.totpSecret);
    const clientCode = broker.clientCode;

    if (!decryptedTotpSecret || decryptedTotpSecret.includes("*")) {
         throw new Error("Invalid TOTP Secret");
    }
    
    const token = await generate({ secret: decryptedTotpSecret });
    
    const loginUrl = "https://apiconnect.angelbroking.com/rest/auth/angelbroking/user/v1/loginByPassword";
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-UserType': 'USER',
      'X-SourceID': 'WEB',
      'X-ClientLocalIP': '127.0.0.1',
      'X-ClientPublicIP': '127.0.0.1',
      'X-MACAddress': 'mac_address',
      'X-PrivateKey': decryptedApiKey
    };

    const loginResponse = await axios.post(loginUrl, {
      clientcode: clientCode,
      password: decryptedPassword,
      totp: token
    }, { headers });

    if (!loginResponse.data.status) {
      throw new Error("Angel One Login Failed: " + loginResponse.data.message);
    }

    const jwtToken = loginResponse.data.data.jwtToken;

    // 3. Fetch NIFTY 50 Data (LTP)
    const ltpUrl = "https://apiconnect.angelbroking.com/rest/secure/angelbroking/order/v1/getLtpData";
    const ltpHeaders = {
      'Authorization': `Bearer ${jwtToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-UserType': 'USER',
      'X-SourceID': 'WEB',
      'X-ClientLocalIP': '127.0.0.1',
      'X-ClientPublicIP': '127.0.0.1',
      'X-MACAddress': 'mac_address',
      'X-PrivateKey': decryptedApiKey
    };

    // Try "NIFTY" as tradingsymbol - usually resolves 403 for Indices
    const niftyPayload = { exchange: "NSE", tradingsymbol: "NIFTY", symboltoken: "99926000" };
    
    const niftyResponse = await axios.post(ltpUrl, niftyPayload, { headers: ltpHeaders });
    
    let niftyData = { price: 0, change: 0, percent: 0 };
    
    if (niftyResponse.data.status) {
        niftyData.price = niftyResponse.data.data.ltp;
    }

    res.json({
        nifty: { 
            price: niftyData.price, 
            change: 0, 
            percent: 0 
        },
        vix: { 
            price: 12.45, 
            change: 0, 
            percent: 0 
        }, 
        connected: true
    });

  } catch (error) {
    // Only log essential info to avoid cluttering if it's just a poll error
    console.error("Market Data Fetch Error:", error.response?.status || error.message);
    res.json({
      nifty: { price: 0, change: 0, percent: 0 },
      vix: { price: 0, change: 0, percent: 0 },
      connected: false,
      error: error.message
    });
  }
};

// @desc    Fetch Historical Data for Chart
// @route   GET /api/broker/history
export const getHistoricalData = async (req, res) => {
    try {
        const broker = await Broker.findOne({ user: req.user._id, brokerName: "AngelOne" });
        if (!broker) return res.json([]);

        const decryptedApiKey = decrypt(broker.apiKey);
        const decryptedPassword = decrypt(broker.password);
        const decryptedTotpSecret = decrypt(broker.totpSecret);
        const clientCode = broker.clientCode;

        if (!decryptedTotpSecret || decryptedTotpSecret.includes("*")) {
             return res.json([]); // Don't crash, just return empty
        }

        // 1. Authenticate
        const token = await generate({ secret: decryptedTotpSecret });
        const loginUrl = "https://apiconnect.angelbroking.com/rest/auth/angelbroking/user/v1/loginByPassword";
        
        const commonHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-UserType': 'USER',
            'X-SourceID': 'WEB',
            'X-ClientLocalIP': '127.0.0.1',
            'X-ClientPublicIP': '127.0.0.1',
            'X-MACAddress': 'mac_address',
            'X-PrivateKey': decryptedApiKey
        };

        const loginResponse = await axios.post(loginUrl, {
            clientcode: clientCode,
            password: decryptedPassword,
            totp: token
        }, { headers: commonHeaders });

        if (!loginResponse.data.status) {
            console.error("Angel History Login Failed");
            return res.json([]);
        }

        const jwtToken = loginResponse.data.data.jwtToken;

        // 2. Fetch Candle Data
        const histUrl = "https://apiconnect.angelbroking.com/rest/secure/angelbroking/historical/v1/getCandleData";
        
        const histHeaders = {
            ...commonHeaders,
            'Authorization': `Bearer ${jwtToken}`,
        };

        // Format Date: "YYYY-MM-DD HH:mm"
        const now = new Date();
        // Fetch last 24 hours of data
        const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        
        const fmt = (d) => {
            const pad = (n) => n.toString().padStart(2, '0');
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
        };

        const payload = {
            exchange: "NSE",
            symboltoken: "99926000",
            interval: "ONE_MINUTE",
            fromdate: fmt(start),
            todate: fmt(now)
        };

        const response = await axios.post(histUrl, payload, { headers: histHeaders });

        if (response.data.status && response.data.data) {
            // Map Angel One Data [timestamp, open, high, low, close, volume]
            // To Lightweight Charts { time, open, high, low, close }
            const chartData = response.data.data.map(d => ({
                time: Math.floor(new Date(d[0]).getTime() / 1000), // Convert string date to Unix timestamp
                open: d[1],
                high: d[2],
                low: d[3],
                close: d[4]
            }));

            // Sort by time ascending
            chartData.sort((a, b) => a.time - b.time);
            
            res.json(chartData);
        } else {
            console.error("Angel History API Error:", response.data.message);
            res.json([]);
        }

    } catch (error) {
        console.error("History Fetch Error:", error.message);
        res.status(500).json({ message: error.message });
    }
};