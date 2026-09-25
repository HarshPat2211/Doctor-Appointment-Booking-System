import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  let token;
  try {
    // 1) Try Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    // 2) If not in header, try cookie (token set as httpOnly cookie)
    if (!token && req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ message: "Not authorized, no token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");

    if (!req.user) {
      return res.status(401).json({ message: "User not found" });
    }

    next();
  } catch (error) {
    return res.status(401).json({ message: "Not authorized, token failed" });
  }
};

// ✅ Only admins can access
export const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ message: "Access denied. Admins only." });
  }
};

// ✅ Only doctors can access
export const doctorOnly = (req, res, next) => {
  if (req.user && req.user.role === "doctor") {
    next();
  } else {
    res.status(403).json({ message: "Access denied. Doctors only." });
  }
};

// ✅ Only patients can access
export const patientOnly = (req, res, next) => {
  if (req.user && req.user.role === "patient") {
    next();
  } else {
    res.status(403).json({ message: "Access denied. Patients only." });
  }
};
