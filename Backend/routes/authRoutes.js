import express from "express";
import {
	registerUser,
	loginUser,
	verifyEmail,
	verifyAuth,
	updateProfile,
	resetPassword,
	clearFirstLogin,
	forgotPassword,
	resetPasswordWithToken
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/verify-email", verifyEmail);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/reset-password/:token", resetPasswordWithToken);

// Verify authentication from cookie
router.get("/verify", protect, verifyAuth);

// Update profile
router.put("/profile", protect, updateProfile);

// Clear first login flag
router.post("/clear-first-login", protect, clearFirstLogin);

// Logout endpoint
router.post("/logout", (req, res) => {
	res.clearCookie("token");
	res.json({ message: "Logged out successfully" });
});

export default router;
