import express from "express";
import {
  recordVital,
  getMyVitals,
  getPatientVitals,
  getPreConsultBrief,
  deleteVital
} from "../controllers/vitalsController.js";
import { protect, doctorOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// Patient actions
router.post("/", protect, recordVital);
router.get("/my", protect, getMyVitals);
router.delete("/:id", protect, deleteVital);

// Doctor & Clinical actions
router.get("/patient/:patientId", protect, doctorOnly, getPatientVitals);
router.get("/patient/:patientId/pre-consult-brief", protect, doctorOnly, getPreConsultBrief);

export default router;
