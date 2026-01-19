import bcrypt from "bcrypt";
import User from "../models/user.js";
import generateToken from "../utils/createToken.js";

// LOGIN
export const login = async (req, res) => {
  const { email, password } = req.body;
  console.log(email, password);

  try {
    const existingUser = await User.findOne({ email });

    if (!existingUser) {
      return res.status(400).json({ msg: "User not found" });
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      existingUser.password
    );

    if (!isPasswordValid) {
      return res.status(400).json({ msg: "Invalid password" });
    }

    generateToken(res, existingUser._id);

    return res.status(200).json({
      email: existingUser.email,
      username: existingUser.username,
      _id: existingUser._id,
    });
  } catch (error) {
    res.status(400).json({ msg: "Error occurred: " + error.message });
  }
};

// SIGNUP
export const signup = async (req, res) => {
  const { email, password, username } = req.body;
  console.log(email, password, username);

  try {
    if (!username || !email || !password) {
      return res.status(400).json({ msg: "Fill all the details" });
    }

    // check username
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ msg: "User already exists" });
    }

    // check email
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ msg: "Email already registered" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      email,
      password: hashedPassword,
      username,
    });

    generateToken(res, newUser._id);

    return res.status(200).json({
      email: newUser.email,
      username: newUser.username,
      _id: newUser._id,
    });
  } catch (error) {
    res.status(400).json({ msg: "Error occurred: " + error.message });
  }
};

// LOGOUT
export const logout = (req, res) => {
  res.cookie("jwt", "", {
    httpOnly: true,
    expires: new Date(0),
  });

  res.status(200).json({ msg: "Logged out successfully" });
};
