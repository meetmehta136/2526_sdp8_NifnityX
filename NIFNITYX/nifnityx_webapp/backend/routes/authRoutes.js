import express from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  getUserProfile,
  updateStrategySettings,
  updateCapital
} from "../controllers/authController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", logoutUser);
router.get("/me", protect, getUserProfile);
router.put("/strategy", protect, updateStrategySettings);
router.put("/capital", protect, updateCapital);

export default router;