/**
 * triageRoutes.js
 * ───────────────
 * Routes for AI Symptom Triage + Smart Doctor Matching
 */

import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { analyzeSymptoms } from "../controllers/triageController.js";

const router = express.Router();

/**
 * POST /api/triage/analyze
 * Body: { symptoms: string }
 * Protected: accessible to authenticated patients (or any logged-in user)
 */
router.post("/analyze", protect, analyzeSymptoms);

export default router;
