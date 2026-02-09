import mongoose from "mongoose";

const brokerSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  brokerName: {
    type: String,
    enum: ["AngelOne", "Upstox"],
    required: true,
  },
  // Client ID / User ID (e.g., A123456)
  clientCode: {
    type: String,
    required: true,
  },
  // Login Password / PIN (Encrypted)
  password: {
    type: String,
    required: true,
  },
  // API Key (Encrypted)
  apiKey: {
    type: String,
    required: true,
  },
  // Secret Key (Encrypted)
  secretKey: {
    type: String,
    required: true,
  },
  // TOTP Secret (Encrypted)
  totpSecret: {
    type: String,
    required: true, 
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lastVerifiedAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

brokerSchema.index({ user: 1, brokerName: 1 }, { unique: true });

const Broker = mongoose.model("Broker", brokerSchema);

export default Broker;