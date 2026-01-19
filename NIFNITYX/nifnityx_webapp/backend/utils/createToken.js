import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "yourSuperStrongSecretKeyHere";

const generateToken = (res, _id) => {
  if (!_id) {
    throw new Error("User ID is required to generate token");
  }

  const token = jwt.sign({ _id }, JWT_SECRET, {
    expiresIn: "30d",
  });

  // res.cookie("jwt", token, {
  //   httpOnly: true,
  //   sameSite: "lax",
  //   secure: false,
  //   maxAge: 30 * 24 * 60 * 60 * 1000
  // });

  // for production ready
  // res.cookie("jwt", token, {
  //   httpOnly: true,
  //   sameSite: "none",   // cross-site
  //   secure: true,       // REQUIRED with sameSite:none
  //   maxAge: 30 * 24 * 60 * 60 * 1000
  // });

  res.cookie("jwt", token, {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  return token;
};

export default generateToken;