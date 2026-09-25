import express from "express";
import { getSlots } from "../controllers/slotcontroller.js";
const router = express.Router();

router.get("/:doctorId/:date", getSlots);
export default router;
