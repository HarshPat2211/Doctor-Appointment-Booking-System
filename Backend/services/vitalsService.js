import mongoose from "mongoose";
import dotenv from "dotenv";
import PatientVital from "../models/PatientVital.js";

dotenv.config();

/**
 * Calculate 30-day vitals averages and historical trends for a patient
 */
export async function calculatePatientVitalsTrend(patientId) {
  const patientObjectId = new mongoose.Types.ObjectId(patientId);
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  // Fetch all vitals for this patient up to 60 days back (or all available)
  const allVitals = await PatientVital.find({ patientId: patientObjectId })
    .sort({ recordedAt: -1 })
    .lean();

  if (!allVitals || allVitals.length === 0) {
    return {
      hasData: false,
      totalReadings: 0,
      metrics: null,
      summary: "No historical vitals recorded yet for this patient."
    };
  }

  const latestReading = allVitals[0];

  // Divide into recent (last 30 days) and baseline (previous 30-60 days)
  let recentVitals = allVitals.filter((v) => new Date(v.recordedAt) >= thirtyDaysAgo);
  let baselineVitals = allVitals.filter((v) => {
    const d = new Date(v.recordedAt);
    return d >= sixtyDaysAgo && d < thirtyDaysAgo;
  });

  // If patient only has recent readings, split available readings into newer half and older half
  if (recentVitals.length >= 2 && baselineVitals.length === 0) {
    const midpoint = Math.floor(recentVitals.length / 2);
    baselineVitals = recentVitals.slice(midpoint);
    recentVitals = recentVitals.slice(0, midpoint);
  } else if (recentVitals.length === 0) {
    recentVitals = allVitals.slice(0, 10);
  }

  const computeAvg = (arr, key) => {
    const valid = arr.map((item) => Number(item[key])).filter((val) => !isNaN(val) && val > 0);
    if (valid.length === 0) return null;
    const sum = valid.reduce((a, b) => a + b, 0);
    return Math.round((sum / valid.length) * 10) / 10;
  };

  const avgSystolic = computeAvg(recentVitals, "systolic") || latestReading.systolic;
  const avgDiastolic = computeAvg(recentVitals, "diastolic") || latestReading.diastolic;
  const avgSugar = computeAvg(recentVitals, "bloodSugar");
  const avgWeight = computeAvg(recentVitals, "weight");
  const avgPulse = computeAvg(recentVitals, "pulse");

  const baselineSystolic = computeAvg(baselineVitals, "systolic");
  const baselineDiastolic = computeAvg(baselineVitals, "diastolic");

  let systolicTrendPercent = 0;
  let diastolicTrendPercent = 0;
  let trendDirection = "stable";

  if (baselineSystolic && baselineSystolic > 0) {
    systolicTrendPercent = Math.round(((avgSystolic - baselineSystolic) / baselineSystolic) * 1000) / 10;
    if (systolicTrendPercent >= 3) trendDirection = "upward";
    else if (systolicTrendPercent <= -3) trendDirection = "downward";
  }

  if (baselineDiastolic && baselineDiastolic > 0) {
    diastolicTrendPercent = Math.round(((avgDiastolic - baselineDiastolic) / baselineDiastolic) * 1000) / 10;
  }

  return {
    hasData: true,
    totalReadings: allVitals.length,
    metrics: {
      avgSystolic,
      avgDiastolic,
      systolicTrendPercent,
      diastolicTrendPercent,
      trendDirection,
      avgSugar,
      avgWeight,
      avgPulse,
      latest: {
        systolic: latestReading.systolic,
        diastolic: latestReading.diastolic,
        bloodSugar: latestReading.bloodSugar,
        weight: latestReading.weight,
        pulse: latestReading.pulse,
        notes: latestReading.notes || "",
        recordedAt: latestReading.recordedAt
      }
    }
  };
}

/**
 * Generate Pre-Consult AI Brief using Gemini 3.1 Flash-Lite
 */
export async function generatePreConsultAIBrief({ patientName = "Patient", trendData, chronicDiseases = "" }) {
  if (!trendData || !trendData.hasData || !trendData.metrics) {
    return "No vitals recorded by the patient yet. Recommend measuring baseline BP and weight during this consultation.";
  }

  const { metrics } = trendData;
  const { avgSystolic, avgDiastolic, systolicTrendPercent, trendDirection, avgSugar, avgWeight, latest } = metrics;

  // Local rule-based fallback summary (deterministic & instant)
  let fallbackBrief = "";
  if (Math.abs(systolicTrendPercent) >= 3) {
    const dir = systolicTrendPercent > 0 ? "upward" : "downward";
    fallbackBrief = `${patientName}'s systolic BP has trended ${dir} by ${Math.abs(systolicTrendPercent)}% over the last month, currently averaging ${Math.round(avgSystolic)}/${Math.round(avgDiastolic)} mmHg.`;
  } else {
    fallbackBrief = `${patientName}'s blood pressure has remained stable over the last month, averaging ${Math.round(avgSystolic)}/${Math.round(avgDiastolic)} mmHg.`;
  }

  if (avgSugar) {
    fallbackBrief += ` Blood sugar has averaged ${Math.round(avgSugar)} mg/dL.`;
  } else if (avgWeight) {
    fallbackBrief += ` Weight is currently tracking at ${avgWeight} kg.`;
  } else {
    fallbackBrief += ` Most recent reading was ${latest.systolic}/${latest.diastolic} mmHg.`;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    return fallbackBrief;
  }

  const prompt = `You are an expert clinical AI assistant writing a pre-consultation summary for a doctor.
Summarize the patient's recent vitals trend into exactly 2 concise, medically professional sentences before the doctor begins the appointment.

PATIENT VITALS DATA:
- Patient Name: ${patientName}
- 30-Day Average BP: ${avgSystolic}/${avgDiastolic} mmHg
- Systolic BP Trend: ${systolicTrendPercent > 0 ? "+" : ""}${systolicTrendPercent}% (${trendDirection}) compared to previous baseline
- Most Recent Reading: ${latest.systolic}/${latest.diastolic} mmHg (logged on ${new Date(latest.recordedAt).toLocaleDateString()})
- Average Blood Sugar: ${avgSugar ? avgSugar + " mg/dL" : "Not logged"}
- Current Weight: ${avgWeight ? avgWeight + " kg" : "Not logged"}
- Documented Chronic Conditions: ${chronicDiseases || "None"}

REQUIREMENTS:
1. Output EXACTLY 2 clear, authoritative, clinical sentences.
2. Highlight the BP average and the percentage trend (e.g., "Patient's systolic BP has trended upward by 10% over the last month, currently averaging 140/90 mmHg.").
3. Mention latest reading or blood sugar if notable.
4. Output plain text only (NO markdown asterisks, NO quotes, NO bullet points).`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3800);

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 150
        }
      })
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText && rawText.trim().length > 20) {
        return rawText.trim().replace(/^["']|["']$/g, "").replace(/\*\*/g, "");
      }
    }
  } catch (err) {
    console.warn("Gemini vitals brief generation timed out or failed, using clinical fallback:", err.message);
  }

  return fallbackBrief;
}
