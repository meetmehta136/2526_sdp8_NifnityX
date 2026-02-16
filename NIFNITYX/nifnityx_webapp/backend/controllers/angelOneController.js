import { angelOneService } from "../utils/angelOneService.js";
import Broker from "../models/Broker.js";
// import { decrypt } from "../utils/encryption.js"; // Assuming you have an encryption utility

// For now, let's assume simple string handling or we need to implementation decryption
// The User Request mentioned: "Decrypt User's API Key, PIN, and TOTP Secret."
// I need to check utils/encryption.js to see how to decrypt. 
// For this MVP step, I will assume the keys in DB are what we use, or I need to read encryption.js.
// Let's first read encryption.js in a separate step if needed, but I'll write the controller with placeholders or import it if I saw it in file list.
// I saw "encryption.js" in backend/utils in Step 30 list. 

// Let's try to import it. If it fails, I'll fix it.
import { decrypt } from "../utils/encryption.js";

export const connectBroker = async (req, res) => {
    try {
        const userId = req.user._id;
        // functionality to get broker details
        const broker = await Broker.findOne({ user: userId, brokerName: "AngelOne" });

        if (!broker) {
            return res.status(404).json({ message: "Broker keys not found. Please save them first." });
        }

        // Decrypt Keys
        const apiKey = decrypt(broker.apiKey);
        const password = decrypt(broker.password);
        const clientCode = broker.clientCode; // Usually not encrypted or we check
        // Wait, Broker.js schema said clientCode is String, others are "Encrypted" in comments.
        // Let's assume clientCode is plain text.
        const totpSecret = decrypt(broker.totpSecret);

        console.log(`🔌 Connecting Broker for ${clientCode}...`);

        // Generate Session
        const session = await angelOneService.generateSession(clientCode, password, apiKey, totpSecret);

        if (session.status) {
            // Store tokens in memory or cache?
            // For MVP, we can return them to frontend to store in context/localstorage (NOT SECURE but easy)
            // OR store in a server-side cache mapped to UserID.
            // The plan said: "Store these in a temporary cache (like Node-Cache or Redis) or update the User document"
            // Let's update the Broker document with "isActive: true" and maybe store session momentarily? 
            // ACTUALLY, usually we need these tokens for subsequent calls.
            // Let's return them to the frontend for now, or use a simple in-memory map in the controller/service.

            // Better: Store in AngelOneService singleton map? 
            // userId -> { jwtToken, feedToken }
            // BUT, controller functions are stateless.

            // Let's send them back to client, client sends them in headers for subsequent calls?
            // Or simple in-memory map here.

            // Set cookies?
            res.cookie("angel_jwt", session.jwtToken, { httpOnly: true, secure: false }); // secure true in prod
            // We also need feedToken for websocket.

            res.status(200).json({
                message: "Broker Connected Successfully",
                active: true,
                // sending feedToken for frontend websocket
                feedToken: session.feedToken
            });

        } else {
            res.status(401).json({ message: "Angel One Login Failed: " + session.message });
        }

    } catch (error) {
        console.error("Connect Broker Error:", error);
        res.status(500).json({ message: "Internal Server Error during Broker Connection" });
    }
};

export const getMarketHistory = async (req, res) => {
    try {
        const { symbol, interval } = req.query; // e.g. symbol=NIFTY, interval=FIVE_MINUTE
        const userId = req.user._id;

        // In a real app, we get tokens from session/cache.
        // For now, let's assume we might need to re-login OR client sends token.
        // IF we rely on cookies set in connectBroker:
        const jwtToken = req.cookies?.angel_jwt;

        // IF NO TOKEN, maybe re-login? 
        // For MVP, let's just fetch keys and re-login if needed OR fail.
        // Re-logging in every time is slow.
        // Let's assumes we have a way to get the token.

        // Alternative: Pass jwtToken from frontend if we returned it.
        // Let's look at how we implemented connectBroker. We Set a cookie.

        if (!jwtToken) {
            // return res.status(401).json({ message: "Broker session expired. Please connect again." });

            // AUTO-CONNECT FALLBACK (As per "Daily Handshake" requirement, maybe auto connect?)
            // Implementation: Fetch keys, login, get token.
            const broker = await Broker.findOne({ user: userId, brokerName: "AngelOne" });
            if (!broker) return res.status(404).json({ message: "No broker keys" });

            const apiKey = decrypt(broker.apiKey);
            const password = decrypt(broker.password);
            const totpSecret = decrypt(broker.totpSecret);

            const session = await angelOneService.generateSession(broker.clientCode, password, apiKey, totpSecret);
            if (!session.status) return res.status(401).json({ message: "Auto-login failed" });

            // Use this new token
            const data = await angelOneService.getMarketData(apiKey, session.jwtToken, symbol, interval);
            return res.json(data);
        }

        // We also need API Key for the calls.
        const broker = await Broker.findOne({ user: userId, brokerName: "AngelOne" });
        const apiKey = decrypt(broker.apiKey);

        const data = await angelOneService.getMarketData(apiKey, jwtToken, symbol, interval);
        res.json(data);

    } catch (error) {
        console.error("Market History Error:", error);
        res.status(500).json({ message: "Failed to fetch market history" });
    }
};

export const getRMS = async (req, res) => {
    try {
        const userId = req.user._id;
        const broker = await Broker.findOne({ user: userId, brokerName: "AngelOne" });
        if (!broker) return res.status(404).json({ message: "No broker setup" });

        // Auto-login if needed (simplified logic)
        // In prod, use centralized token management
        const apiKey = decrypt(broker.apiKey);
        const password = decrypt(broker.password);
        const totpSecret = decrypt(broker.totpSecret);

        // Always generating fresh session for critical actions for this MVP to ensure it works
        // Optimization: Use cached token
        const session = await angelOneService.generateSession(broker.clientCode, password, apiKey, totpSecret);

        if (session.status) {
            const rms = await angelOneService.getRMS(apiKey, session.jwtToken);
            res.json(rms);
        } else {
            res.status(401).json({ message: "Failed to authenticate with Broker" });
        }

    } catch (error) {
        res.status(500).json({ message: "Error fetching RMS" });
    }
};

export const placeOrder = async (req, res) => {
    try {
        const userId = req.user._id;
        const orderParams = req.body; // { symbol, transactionType, quantity, ... }

        const broker = await Broker.findOne({ user: userId, brokerName: "AngelOne" });
        if (!broker) return res.status(404).json({ message: "No broker setup" });

        const apiKey = decrypt(broker.apiKey);
        const password = decrypt(broker.password);
        const totpSecret = decrypt(broker.totpSecret);

        const session = await angelOneService.generateSession(broker.clientCode, password, apiKey, totpSecret);

        if (session.status) {
            const response = await angelOneService.placeOrder(apiKey, session.jwtToken, orderParams);
            res.json(response);
        } else {
            res.status(401).json({ message: "Broker Authentication Failed" });
        }

    } catch (error) {
        console.error("Order Error:", error);
        res.status(500).json({ message: "Order Placement Failed", error: error.message });
    }
};
