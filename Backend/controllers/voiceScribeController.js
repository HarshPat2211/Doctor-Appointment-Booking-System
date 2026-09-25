/**
 * voiceScribeController.js
 * ─────────────────────────
 * Controller for AI Voice Scribe prescription drafting.
 */

import { extractPrescriptionFromSpeech } from "../services/voiceScribeService.js";

export const parseVoicePrescription = async (req, res) => {
  try {
    const { transcript } = req.body;

    if (!transcript || typeof transcript !== "string" || transcript.trim().length < 5) {
      return res.status(400).json({
        message: "Please speak or enter your consultation notes in detail (at least 5 characters)."
      });
    }

    const prescription = await extractPrescriptionFromSpeech(transcript.trim());

    res.json({
      success: true,
      transcript: transcript.trim(),
      prescription
    });
  } catch (error) {
    console.error("[voiceScribeController] Error:", error.message);
    res.status(500).json({
      message: "Failed to transcribe voice notes into prescription",
      error: error.message
    });
  }
};
