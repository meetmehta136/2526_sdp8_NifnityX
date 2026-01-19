import jwt from 'jsonwebtoken';
import User from "../models/user.js"

const authenticate = async (req, res, next) => {
  let token;

  token = req.cookies.jwt;

  if (token) {

    try {
      const JWT_SECRET = process.env.JWT_SECRET;

      const decoded = jwt.verify(token, JWT_SECRET);

      req.user = await User.findById(decoded._id).select("-password")

      next();

    } catch (error) {
      console.error(error);
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  }
}

export default authenticate;