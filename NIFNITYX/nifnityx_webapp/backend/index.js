import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import http from "http"; // Required for Socket.io
import { Server } from "socket.io";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import brokerRoutes from "./routes/brokerRoutes.js";
import tradeRoutes from "./routes/tradeRoutes.js";

dotenv.config();
connectDB();

const app = express();

// 1. Create HTTP Server explicitly
const server = http.createServer(app);

// 2. Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// 3. Inject Socket.io into Express Request
app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/broker", brokerRoutes);
app.use("/api/trades", tradeRoutes);

app.get("/", (req, res) => {
  res.send("NifnityX API is running...");
});

// Socket Events
io.on("connection", (socket) => {
  console.log(`⚡ Client Connected: ${socket.id}`);
  socket.on("disconnect", () => {
    console.log("Client Disconnected");
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: "Server Error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

const PORT = process.env.PORT || 5000;

// Listen on server, not app
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.io Active`);
});