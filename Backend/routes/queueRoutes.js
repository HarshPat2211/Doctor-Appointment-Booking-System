import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { getQueueState } from "../services/queueService.js";

const router = express.Router();

/**
 * GET /api/queue/:doctorId/:date
 * Returns the live queue state for a doctor on a given date.
 * Accessible to any authenticated user (patient, doctor, admin).
 */
router.get("/:doctorId/:date", protect, async (req, res) => {
  try {
    const { doctorId, date } = req.params;

    if (!doctorId || !date) {
      return res.status(400).json({ message: "doctorId and date are required" });
    }

    const state = await getQueueState(doctorId, date);
    res.json(state);
  } catch (error) {
    console.error("[queueRoutes] GET queue state error:", error.message);
    res.status(500).json({ message: error.message || "Failed to get queue state" });
  }
});

export default router;
