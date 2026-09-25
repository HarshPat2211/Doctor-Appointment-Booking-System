import User from "../models/User.js";
import generateToken from "../utils/generateToken.js";
import { sendEmail } from "../utils/sendEmail.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const pendingUsers = {}; // In-memory store: { email: { name, password, role, age, gender, code } }

// =======================
// @desc   Send verification code
// @route  POST /api/auth/register
// @access Public
// =======================
export const registerUser = async (req, res) => {
  try {
    const { name, age, gender, email, password, role } = req.body;
    const cleanName = (name || "").trim();
    const cleanAge = String(age ?? "").trim();
    const cleanGender = String(gender || "").trim().toLowerCase();
    const cleanEmail = (email || "").trim().toLowerCase();
    // Public registration is exclusively for patients. Doctor onboarding has a
    // separate application workflow and administrator accounts must never be
    // creatable from a public endpoint.
    if (role && role !== "patient") {
      return res.status(403).json({ message: "Public registration is available for patients only" });
    }
    const cleanRole = "patient";

    if (!cleanName && !cleanEmail && !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!cleanName || !cleanEmail || !password) {
      const missingFields = [];
      if (!cleanName) missingFields.push("Full Name");
      if (!cleanEmail) missingFields.push("Email");
      if (!password) missingFields.push("Password");

      return res.status(400).json({
        message: `${missingFields.join(" and ")} ${missingFields.length > 1 ? "are" : "is"} required`,
      });
    }

    if (cleanRole === "patient") {
      const missingFields = [];
      if (!cleanAge) missingFields.push("Age");
      if (!cleanGender) missingFields.push("Gender");

      if (missingFields.length > 0) {
        return res.status(400).json({
          message: `${missingFields.join(" and ")} ${missingFields.length > 1 ? "are" : "is"} required`,
        });
      }
    }

    if (/\d/.test(cleanName)) {
      return res.status(400).json({ message: "Full name must not contain numbers" });
    }

    const nameParts = cleanName.split(/\s+/).filter(Boolean);
    if (nameParts.length < 2) {
      return res.status(400).json({ message: "Please enter at least first name and last name" });
    }

    if (nameParts.some((part) => part.length < 2)) {
      return res.status(400).json({ message: "Each name part should be at least 2 characters" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ message: "Please enter a valid email address" });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    if (cleanRole === "patient") {
      if (!/^\d{1,3}$/.test(cleanAge)) {
        return res.status(400).json({ message: "Age must be entered as a valid number" });
      }

      const ageNumber = Number(cleanAge);
      if (ageNumber < 1 || ageNumber > 120) {
        return res.status(400).json({ message: "Age must be between 1 and 120" });
      }

      if (!["male", "female", "other"].includes(cleanGender)) {
        return res.status(400).json({ message: "Please select a valid gender" });
      }
    }

    // 1️⃣ Check if user exists in DB
    const userExists = await User.findOne({ email: cleanEmail });
    if (userExists) return res.status(400).json({ message: "User already exists" });

    // 2️⃣ Generate 4-digit code
    const code = Math.floor(1000 + Math.random() * 9000).toString();

    // 3️⃣ Store in memory
    pendingUsers[cleanEmail] = {
      name: cleanName,
      email: cleanEmail,
      password,
      role: cleanRole,
      age: cleanRole === "patient" ? cleanAge : "",
      gender: cleanRole === "patient" ? cleanGender : "",
      code,
    };

    // 4️⃣ Send code via email
    const message = `
      <h2>Doctor Appointment System</h2>
      <p>Your verification code is: <strong>${code}</strong></p>
    `;
    await sendEmail(cleanEmail, "Email Verification Code", message);

    res.status(200).json({ message: "Verification code sent to your email" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to send verification code" });
  }
};

// =======================
// @desc   Verify code and create user
// @route  POST /api/auth/verify-email
// @access Public
// =======================
export const verifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body;
    const cleanEmail = (email || "").trim().toLowerCase();

    if (!cleanEmail || !code) {
      return res.status(400).json({ message: "Email and verification code are required" });
    }

    const pending = pendingUsers[cleanEmail];
    if (!pending) return res.status(400).json({ message: "No pending verification found" });

    if (pending.code !== code) return res.status(400).json({ message: "Invalid code" });

    // ✅ Create user in DB
    const user = await User.create({
      name: pending.name,
      email: pending.email,
      password: pending.password,
      role: pending.role,
      age: pending.age,
      gender: pending.gender,
      isVerified: true,
    });

    // ✅ Remove from pending
    delete pendingUsers[cleanEmail];

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      age: user.age,
      gender: user.gender,
      role: user.role,
      token: generateToken(user._id, user.role),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Verification failed" });
  }
};

// =======================
// @desc   Login user
// @route  POST /api/auth/login
// @access Public
// =======================
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanPassword = typeof password === "string" ? password.trim() : "";

    const user = await User.findOne({ email: cleanEmail });
    if (!user) return res.status(401).json({ message: "User not found" });

    // Check password match (including temporary password)
    let isMatch = await user.matchPassword(password);
    if (!isMatch && cleanPassword !== password) {
      isMatch = await user.matchPassword(cleanPassword);
    }
    
    // If regular password doesn't match, check temporary password
    if (!isMatch && user.tempPassword) {
      isMatch = (await bcrypt.compare(password, user.tempPassword)) || (await bcrypt.compare(cleanPassword, user.tempPassword));
    }

    if (!isMatch) return res.status(401).json({ message: "Invalid email or password" });

    if (!user.isVerified) {
      return res.status(401).json({ message: "Please verify your email before logging in." });
    }

    // Check doctor approval status
    if (user.role === "doctor" && !user.isApproved) {
      return res.status(403).json({ 
        message: "Your account is pending approval. Please wait for admin approval." 
      });
    }

    // If user must reset password, return flag
    if (user.mustResetPassword) {
      return res.status(200).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        mustResetPassword: true,
        message: "Please reset your password to continue",
      });
    }

    // Set httpOnly cookie with token
    res.cookie("token", generateToken(user._id, user.role), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Check if this is first login after approval (for doctors)
    const isFirstLogin = user.role === "doctor" && user.isFirstLogin === true;
    
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      age: user.age || "",
      gender: user.gender || "",
      mobileNumber: user.mobileNumber || "",
      residentialAddress: user.residentialAddress || "",
      profileImage: user.profileImage,
      medicalHistory: user.medicalHistory,
      role: user.role,
      token: generateToken(user._id, user.role),
      mustResetPassword: false,
      isFirstLogin: isFirstLogin,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =======================
// @desc   Request forgot password reset link
// @route  POST /api/auth/forgot-password
// @access Public
// =======================
export const forgotPassword = async (req, res) => {
  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      // Avoid exposing whether an email exists in the system.
      return res.status(200).json({ message: "If this email exists, a reset link has been sent" });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpire = new Date(Date.now() + 15 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const resetUrl = `${clientUrl.replace(/\/$/, "")}/reset-password/${rawToken}`;

    const message = `
      <h2>Doctor Appointment System</h2>
      <p>Hello ${user.name},</p>
      <p>You requested to reset your password. Click the button below:</p>
      <p>
        <a href="${resetUrl}" target="_self" style="display:inline-block;padding:10px 16px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">
          Reset Password
        </a>
      </p>
      <p>This link will expire in 15 minutes.</p>
      <p>If you did not request this, please ignore this email.</p>
    `;

    try {
      await sendEmail(user.email, "Password Reset Request", message);
    } catch (emailError) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(500).json({ message: "Failed to send reset email" });
    }

    return res.status(200).json({ message: "If this email exists, a reset link has been sent" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// =======================
// @desc   Reset password using token from email link
// @route  POST /api/auth/reset-password/:token
// @access Public
// =======================
export const resetPasswordWithToken = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword, confirmPassword } = req.body || {};

    if (!token) {
      return res.status(400).json({ message: "Reset token is required" });
    }

    if (!newPassword || !confirmPassword) {
      return res.status(400).json({ message: "New password and confirm password are required" });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    const hashedToken = crypto.createHash("sha256").update(String(token)).digest("hex");
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired reset link" });
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    user.mustResetPassword = false;
    user.tempPassword = undefined;
    await user.save();

    return res.status(200).json({ message: "Password reset successful. Please login." });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// =======================
// @desc   Verify authentication from cookie
// @route  GET /api/auth/verify
// @access Private
// =======================
export const verifyAuth = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      age: user.age || "",
      gender: user.gender || "",
      mobileNumber: user.mobileNumber || "",
      residentialAddress: user.residentialAddress || "",
      profileImage: user.profileImage,
      medicalHistory: user.medicalHistory,
      role: user.role,
      token: generateToken(user._id, user.role),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =======================
// @desc   Reset password (for first login with temporary password)
// @route  POST /api/auth/reset-password
// @access Public (but requires email and temp password verification)
// =======================
export const resetPassword = async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;

    if (!email || !currentPassword || !newPassword) {
      return res.status(400).json({ message: "Email, current password, and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Verify current password (can be regular or temporary)
    let isMatch = await user.matchPassword(currentPassword);
    if (!isMatch && user.tempPassword) {
      isMatch = await bcrypt.compare(currentPassword, user.tempPassword);
    }

    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    // Update password
    user.password = newPassword; // Will be hashed by pre-save hook
    user.mustResetPassword = false;
    user.tempPassword = undefined; // Clear temporary password
    // Set first login flag for doctors (to redirect to profile setup)
    if (user.role === "doctor") {
      user.isFirstLogin = true;
    }

    await user.save();

    // Generate new token
    const token = generateToken(user._id, user.role);

    // Set httpOnly cookie with token
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Set first login flag for doctors (to redirect to profile setup)
    const isFirstLogin = user.role === "doctor" && !user.isFirstLogin;
    if (user.role === "doctor" && !user.isFirstLogin) {
      user.isFirstLogin = true;
      await user.save();
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      profileImage: user.profileImage,
      role: user.role,
      token: token,
      message: "Password reset successfully",
      isFirstLogin: isFirstLogin,
    });
  } catch (error) {
    console.error("Error in resetPassword:", error);
    res.status(500).json({ message: error.message || "Failed to reset password" });
  }
};

// =======================
// @desc   Update logged-in user's profile
// @route  PUT /api/auth/profile
// @access Private
// =======================
export const updateProfile = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Not authenticated" });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const { name, email, password, medicalHistory, profileImage, age, gender, mobileNumber, residentialAddress } = req.body;

    if (user.role === "patient" && email && email !== user.email) {
      return res.status(400).json({ message: "Email cannot be changed from patient profile" });
    }

    if (user.role !== "patient" && email && email !== user.email) {
      const exists = await User.findOne({ email });
      if (exists) return res.status(400).json({ message: "Email already in use" });
      user.email = email;
    }

    if (name) user.name = name;
    if (password) user.password = password; // will be hashed by pre-save hook
    if (typeof profileImage === "string") user.profileImage = profileImage;

    if (user.role === "patient") {
      if (age !== undefined) {
        const cleanAge = String(age || "").trim();
        if (cleanAge && (!/^\d{1,3}$/.test(cleanAge) || Number(cleanAge) < 1 || Number(cleanAge) > 120)) {
          return res.status(400).json({ message: "Age must be between 1 and 120" });
        }
        user.age = cleanAge;
      }

      if (gender !== undefined) {
        const cleanGender = String(gender || "").trim().toLowerCase();
        if (cleanGender && !["male", "female", "other"].includes(cleanGender)) {
          return res.status(400).json({ message: "Please select a valid gender" });
        }
        user.gender = cleanGender;
      }

      if (mobileNumber !== undefined) user.mobileNumber = String(mobileNumber || "").trim();
      if (residentialAddress !== undefined) user.residentialAddress = String(residentialAddress || "").trim();
    }

    if (medicalHistory && user.role === 'patient') {
      user.medicalHistory = { ...user.medicalHistory, ...medicalHistory };
    }

    const updated = await user.save();

    res.json({
      _id: updated._id,
      name: updated.name,
      email: updated.email,
      age: updated.age || "",
      gender: updated.gender || "",
      mobileNumber: updated.mobileNumber || "",
      residentialAddress: updated.residentialAddress || "",
      profileImage: updated.profileImage,
      medicalHistory: updated.medicalHistory,
      role: updated.role,
      token: generateToken(updated._id, updated.role),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =======================
// @desc   Clear first login flag (after profile setup)
// @route  POST /api/auth/clear-first-login
// @access Private
// =======================
export const clearFirstLogin = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Not authenticated" });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.isFirstLogin = false;
    await user.save();

    res.json({ message: "First login flag cleared", isFirstLogin: false });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
