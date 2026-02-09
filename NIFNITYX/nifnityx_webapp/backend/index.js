import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import brokerRoutes from "./routes/brokerRoutes.js";
import tradeRoutes from "./routes/tradeRoutes.js"; // <--- Imported Trade Routes

// Load environment variables immediately
dotenv.config();

// Connect to Database
connectDB();

const app = express();

// Middleware
app.use(
  cors({
    // IMPORTANT: In production, strictly set this to your frontend domain
    // For development, we assume Vite is running on localhost:5173
    origin: "http://localhost:5173",
    credentials: true, // Essential for Cookies to be sent/received
  })
);

app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(cookieParser()); // Parse Cookies

// Mount Routes
app.use("/api/auth", authRoutes);
app.use("/api/broker", brokerRoutes);
app.use("/api/trades", tradeRoutes); // <--- Registered Trade Routes

// Base route for health check
app.get("/", (req, res) => {
  res.send("NifnityX API is running...");
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: "Server Error",
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});