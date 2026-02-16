import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import {
    connectBroker,
    getMarketHistory,
    getRMS,
    placeOrder
} from "../controllers/angelOneController.js";

const router = express.Router();

// All routes protected
router.use(protect);

router.post("/connect", connectBroker);
router.get("/history", getMarketHistory);
router.get("/rms", getRMS);
router.post("/order", placeOrder);

export default router;
