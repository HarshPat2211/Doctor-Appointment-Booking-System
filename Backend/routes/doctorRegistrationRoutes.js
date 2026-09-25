import express from "express";
import {
  submitBasicDetails,
  submitProfessionalDetails,
  getRegistrationStatus,
} from "../controllers/doctorRegistrationController.js";

const router = express.Router();

router.post("/step1", submitBasicDetails);
router.post("/step2", submitProfessionalDetails);
router.get("/status/:email", getRegistrationStatus);

export default router;
