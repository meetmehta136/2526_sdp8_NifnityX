import express from "express";
import {
  getTodayNews,
  getNewsByDate,
  getNewsSummary,
  storeNewsFromPython,
  refreshNews,
  testGNewsAPI,
} from "../controllers/newsController.js";

const router = express.Router();

router.get("/today", getTodayNews);
router.get("/date", getNewsByDate);
router.get("/summary", getNewsSummary);
router.post("/store", storeNewsFromPython);
router.post("/refresh", refreshNews);
router.get("/test-api", testGNewsAPI);

export default router;
