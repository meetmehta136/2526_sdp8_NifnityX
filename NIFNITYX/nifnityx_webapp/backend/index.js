import express from 'express';
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

import userRoutes from './routes/user.js'

dotenv.config();
const PORT = process.env.PORT || 3000;
const app = express();

// app.use(cors());
app.use(express.json());

app.use(
  cors({
    origin: "http://localhost:5173", // frontend URL
    credentials: true,               // allow cookies
  })
);


app.use("/api/auth", userRoutes);

app.get('/', (req, res) => {
  res.send({
    activeStatus: true,
    error: false
  })
})

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected ✅");
    app.listen(PORT, () => console.log("🚀 Server at http://localhost:3000"));
  })
  .catch((err) => console.error("❌ MongoDB error: ", err));