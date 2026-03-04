import User from "../models/User.js";
import Strategy from "../models/Strategy.js";
import axios from "axios";
import generateToken from "../utils/generateToken.js";

// @desc    Register a new user
// @route   POST /api/auth/register
const registerUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const user = await User.create({
      email,
      password,
    });

    if (user) {
      generateToken(res, user._id);
      res.status(201).json({
        _id: user._id,
        email: user.email,
        role: user.role,
        settings: user.settings,
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      generateToken(res, user._id);
      res.json({
        _id: user._id,
        email: user.email,
        role: user.role,
        settings: user.settings,
      });
    } else {
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
const logoutUser = (req, res) => {
  res.cookie("jwt", "", {
    httpOnly: true,
    expires: new Date(0),
  });
  res.status(200).json({ message: "Logged out successfully" });
};

// @desc    Get user profile
// @route   GET /api/auth/me
const getUserProfile = async (req, res) => {
  const user = {
    _id: req.user._id,
    email: req.user.email,
    role: req.user.role,
    settings: req.user.settings,
  };
  res.status(200).json(user);
};

// @desc    Update Strategy Configuration
// @route   PUT /api/auth/strategy
// @access  Private
const updateStrategySettings = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      const { executionMode, profile, direction } = req.body;

      // Update fields if they exist in the request
      if (executionMode) user.settings.executionMode = executionMode;
      if (profile) user.settings.strategy.profile = profile;
      if (direction) user.settings.strategy.direction = direction;

      const updatedUser = await user.save();

      // ── HOT-SWAP SYNC WITH PYTHON ENGINE ──
      const pythonUrl = process.env.PYTHON_EXECUTION_URL || "http://localhost:8000";
      const pythonBase = (() => { try { return new URL(pythonUrl).origin; } catch { return "http://localhost:8000"; } })();

      // If executionMode changed, sync to Python
      if (executionMode) {
        axios.post(`${pythonBase}/set_mode`, { mode: executionMode }, { timeout: 5000 })
          .then(() => console.log(`⚙️  Pushed execution mode (${executionMode}) to Python`))
          .catch(err => console.warn("Mode sync failed:", err.message));
      }

      // If profile changed, also sync to Strategy model + Python engine
      if (profile) {
        try {
          await Strategy.findOneAndUpdate(
            { user: req.user._id },
            { active_strategy: profile, execution_mode: executionMode || user.settings.executionMode },
            { upsert: true }
          );
          axios.post(`${pythonBase}/set_strategy`, { strategy: profile }, { timeout: 5000 })
            .then(() => console.log(`🔄 Pushed active strategy (${profile}) to Python`))
            .catch(err => console.warn("Strategy sync warning:", err.message));
        } catch (syncErr) {
          console.warn("DB Strategy sync warning:", syncErr.message);
        }
      }

      res.json({
        settings: updatedUser.settings,
        message: "Strategy updated successfully"
      });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update Trading Capital
// @route   PUT /api/auth/capital
// @access  Private
const updateCapital = async (req, res) => {
  try {
    const { capital } = req.body;
    const user = await User.findById(req.user._id);

    if (user) {
      user.settings.initial_capital = Number(capital);
      await user.save();

      // Webhook to Python Engine
      const pythonUrl = process.env.PYTHON_EXECUTION_URL;
      if (pythonUrl) {
        try {
          // Fire and forget - don't block response
          axios.post(pythonUrl, {
            action: "UPDATE_CAPITAL",
            amount: Number(capital),
            user_id: user._id,
          });
        } catch (e) {
          console.error("Failed to sync capital with Python:", e.message);
        }
      }

      res.json({
        message: "Capital updated successfully",
        settings: user.settings,
      });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export { registerUser, loginUser, logoutUser, getUserProfile, updateStrategySettings, updateCapital };