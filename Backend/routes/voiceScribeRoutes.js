/**
 * voiceScribeRoutes.js
 * ────────────────────
 * API routes for AI Voice Scribe prescription drafting.
 */

import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { parseVoicePrescription } from "../controllers/voiceScribeController.js";

const router = express.Router();

// POST /api/prescription/voice-scribe
router.post("/voice-scribe", protect, parseVoicePrescription);

export default router;
