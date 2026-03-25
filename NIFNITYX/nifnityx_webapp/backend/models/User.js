import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      "Please fill a valid email address",
    ],
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  role: {
    type: String,
    enum: ["trader", "admin"],
    default: "trader",
  },
  settings: {
    tradingMode: {
      type: String,
      enum: ["paper", "live"],
      default: "paper",
    },
    executionMode: {
      type: String,
      enum: ["manual", "auto"],
      default: "manual",
    },
    // New Strategy Configuration
    strategy: {
      profile: { 
        type: String, 
        enum: ["aggressive", "balanced", "conservative", "sniper"], 
        default: "balanced" 
      },
      direction: { 
        type: String, 
        enum: ["both", "long", "short"], 
        default: "both" 
      }
    },
    theme: {
      type: String,
      default: "dark",
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);

export default User;