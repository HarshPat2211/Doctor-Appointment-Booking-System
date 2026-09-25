import express from "express";
import { getAdminReport } from "../controllers/reportController.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/report", protect, adminOnly, getAdminReport);

export default router;
