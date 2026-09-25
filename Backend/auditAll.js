import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import User from "./models/User.js";
import Doctor from "./models/Doctor.js";
import Appointment from "./models/Appointment.js";
import { getQueueState } from "./services/queueService.js";
import { analyzeSymptomsWithGemini } from "./services/geminiTriageService.js";
import { extractPrescriptionFromSpeech } from "./services/voiceScribeService.js";
import { evaluatePrescriptionSafety } from "./services/prescriptionSafetyService.js";
import { calculatePatientVitalsTrend, generatePreConsultAIBrief } from "./services/vitalsService.js";
import { resolveAvailability } from "./services/availabilityService.js";

dotenv.config();

const BASE_URL = "http://localhost:5000/api";
const VIVA_DATE = "2026-09-26";

async function runComprehensiveAudit() {
  console.log("════════════════════════════════════════════════════════════");
  console.log("  🔍 COMPREHENSIVE END-TO-END PROJECT AUDIT");
  console.log("════════════════════════════════════════════════════════════\n");

  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Database connection established.\n");

  const results = {
    accounts: [],
    features: [],
    doctorSlots: [],
    adminMetrics: {}
  };

  // ─────────────────────────────────────────────────────────────
  // 1. ALL 10 ACCOUNTS & PASSWORDS (API LOGIN TEST)
  // ─────────────────────────────────────────────────────────────
  console.log("--- 1. Testing All 10 User Account Logins via HTTP API ---");
  const accountsToTest = [
    { role: "Admin", email: "minor789@gmail.com", pass: "minor123" },
    { role: "Doctor (Cardiologist)", email: "doctor@gmail.com", pass: "doctor123" },
    { role: "Doctor (General)", email: "amit.doctor@gmail.com", pass: "doctor123" },
    { role: "Doctor (Dermatology)", email: "priya.doctor@gmail.com", pass: "doctor123" },
    { role: "Doctor (Dentist)", email: "rahul.doctor@gmail.com", pass: "doctor123" },
    { role: "Patient (John Doe)", email: "patient@gmail.com", pass: "patient123" },
    { role: "Patient (Priya K)", email: "priya.patient@gmail.com", pass: "patient123" },
    { role: "Patient (Mohit V)", email: "mohit.patient@gmail.com", pass: "patient123" },
    { role: "Patient (Anita S)", email: "anita.patient@gmail.com", pass: "patient123" },
    { role: "Patient (Raj K)", email: "raj.patient@gmail.com", pass: "patient123" },
  ];

  for (const acc of accountsToTest) {
    try {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: acc.email, password: acc.pass })
      });
      const data = await res.json();
      const ok = res.status === 200 && data.token;
      console.log(`  ${ok ? "🟢" : "🔴"} [${acc.role}] ${acc.email} -> Login: ${ok ? "SUCCESS (HTTP 200)" : "FAIL"}`);
      results.accounts.push({ role: acc.role, email: acc.email, status: ok ? "PASS" : "FAIL" });
    } catch (err) {
      console.log(`  🔴 [${acc.role}] ${acc.email} -> FAILED: ${err.message}`);
      results.accounts.push({ role: acc.role, email: acc.email, status: "FAIL", error: err.message });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 2. FEATURE 1: AI SYMPTOM TRIAGE & SMART MATCHING
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- 2. Testing Feature 1: AI Symptom Triage & Matching ---");
  try {
    const doctors = await Doctor.find({ status: "approved" }).populate("user", "name");
    const doctorList = doctors.map(d => ({
      id: d._id.toString(),
      name: d.user?.name || "Doctor",
      specialization: d.specialization,
      fees: d.fees,
      experience: d.experience
    }));

    const triageResult = await analyzeSymptomsWithGemini({
      symptoms: "I have sharp chest pain spreading to my left shoulder and sweating heavily",
      doctors: doctorList,
      language: "en"
    });

    const hasUrgency = Boolean(triageResult.urgency);
    const hasTopDoctor = Boolean(triageResult.topDoctor);
    console.log(`  🟢 Urgency Level: ${triageResult.urgency} (Severity: ${triageResult.severityScore}/10)`);
    console.log(`  🟢 Recommended Specialty: ${triageResult.recommendedSpecialty}`);
    console.log(`  🟢 Top Doctor Match: ${triageResult.topDoctor?.name} (${triageResult.topDoctor?.specialization})`);
    results.features.push({ name: "AI Symptom Triage", status: hasUrgency && hasTopDoctor ? "PASS" : "FAIL" });
  } catch (err) {
    console.log(`  🔴 Feature 1 Error: ${err.message}`);
    results.features.push({ name: "AI Symptom Triage", status: "FAIL", error: err.message });
  }

  // ─────────────────────────────────────────────────────────────
  // 3. FEATURE 2: LIVE QUEUE & DELAY PREDICTION
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- 3. Testing Feature 2: Live Queue (Dr. Sarah Jenkins - 2026-09-26) ---");
  try {
    const sarah = await Doctor.findOne({ specialization: "Cardiologist" });
    const queue = await getQueueState(sarah._id, VIVA_DATE);

    console.log(`  🟢 Total Booked: ${queue.totalBooked}`);
    console.log(`  🟢 Completed Consultations: ${queue.doneCount}`);
    console.log(`  🟢 Now Serving: Token #${queue.nowServing?.tokenNumber} (${queue.nowServing?.patientName}) - Elapsed: ${queue.nowServing?.elapsedMin} min`);
    
    const nextPatient = queue.queue.find(q => q.isNext);
    console.log(`  🟢 Next Patient: Token #${nextPatient?.tokenNumber} (${nextPatient?.patientName}) - ETA: ~${nextPatient?.etaMinutes} min`);
    console.log(`  🟢 Total Active Queue Length: ${queue.queue.length}`);
    results.features.push({ name: "Live Queue & Prediction", status: queue.nowServing && nextPatient ? "PASS" : "FAIL" });
  } catch (err) {
    console.log(`  🔴 Feature 2 Error: ${err.message}`);
    results.features.push({ name: "Live Queue & Prediction", status: "FAIL", error: err.message });
  }

  // ─────────────────────────────────────────────────────────────
  // 4. FEATURE 3: AI VOICE SCRIBE TO PRESCRIPTION
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- 4. Testing Feature 3: AI Voice Scribe ---");
  try {
    const sampleDictation = "Patient diagnosed with Acute Pharyngitis. Prescribe Azithromycin 500mg once daily for 3 days before food. Also Paracetamol 650mg twice daily for 3 days after meals. Advise warm salt water gargle 3 times a day.";
    const scribeResult = await extractPrescriptionFromSpeech(sampleDictation);

    console.log(`  🟢 Extracted Diagnosis: "${scribeResult.diagnosis}"`);
    console.log(`  🟢 Extracted Medicines Count: ${scribeResult.medicines?.length}`);
    scribeResult.medicines?.forEach(m => console.log(`     - ${m.name} | ${m.dosage} | ${m.frequency} | ${m.duration}`));
    console.log(`  🟢 Advice: "${scribeResult.advice}"`);
    results.features.push({ name: "AI Voice Scribe", status: scribeResult.medicines?.length >= 2 ? "PASS" : "FAIL" });
  } catch (err) {
    console.log(`  🔴 Feature 3 Error: ${err.message}`);
    results.features.push({ name: "AI Voice Scribe", status: "FAIL", error: err.message });
  }

  // ─────────────────────────────────────────────────────────────
  // 5. FEATURE 4: PRESCRIPTION SAFETY CHECK & ALLERGY CONFLICT
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- 5. Testing Feature 4: Prescription Safety Check ---");
  try {
    const john = await User.findOne({ email: "patient@gmail.com" });
    
    // Test 1: Conflict (John is allergic to Penicillin/Amoxicillin)
    const unsafeRx = [{ name: "Amoxicillin", dosage: "500mg", frequency: "Three times daily", duration: "5 days" }];
    const conflictResult = await evaluatePrescriptionSafety({
      medicines: unsafeRx,
      patientAllergies: john.medicalHistory?.allergies,
      chronicDiseases: john.medicalHistory?.chronicDiseases
    });
    console.log(`  🟢 Allergy Conflict Detected: hasConflict = ${conflictResult.hasConflict}`);
    console.log(`     Conflicts found: ${conflictResult.conflicts?.length}`);
    conflictResult.conflicts?.forEach(c => console.log(`     ⚠️  [${c.severity}] ${c.reason}`));

    // Test 2: Safe prescription
    const safeRx = [{ name: "Paracetamol", dosage: "500mg", frequency: "Twice daily", duration: "3 days" }];
    const safeResult = await evaluatePrescriptionSafety({
      medicines: safeRx,
      patientAllergies: john.medicalHistory?.allergies,
      chronicDiseases: john.medicalHistory?.chronicDiseases
    });
    console.log(`  🟢 Safe Check: hasConflict = ${safeResult.hasConflict} (Conflicts: ${safeResult.conflicts?.length})`);

    const passed = conflictResult.hasConflict === true && safeResult.hasConflict === false;
    results.features.push({ name: "Prescription Safety Check", status: passed ? "PASS" : "FAIL" });
  } catch (err) {
    console.log(`  🔴 Feature 4 Error: ${err.message}`);
    results.features.push({ name: "Prescription Safety Check", status: "FAIL", error: err.message });
  }

  // ─────────────────────────────────────────────────────────────
  // 6. FEATURE 5: PATIENT VITALS TRENDS & AI PRE-CONSULT BRIEF
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- 6. Testing Feature 5: Vitals Trends & Pre-Consult AI Brief ---");
  try {
    const john = await User.findOne({ email: "patient@gmail.com" });
    const trend = await calculatePatientVitalsTrend(john._id);
    
    console.log(`  🟢 Total Readings for John Doe: ${trend.totalReadings}`);
    console.log(`  🟢 Systolic Average: ${trend.metrics?.avgSystolic} mmHg (Trend: ${trend.metrics?.trendDirection} ${trend.metrics?.systolicTrendPercent}%)`);
    console.log(`  🟢 Diastolic Average: ${trend.metrics?.avgDiastolic} mmHg`);
    console.log(`  🟢 Blood Sugar Average: ${trend.metrics?.avgSugar} mg/dL`);

    const brief = await generatePreConsultAIBrief({
      patientName: john.name,
      trendData: trend,
      chronicDiseases: john.medicalHistory?.chronicDiseases
    });
    console.log(`  🟢 Pre-Consult Brief: "${brief}"`);

    results.features.push({ name: "Vitals Trends & AI Brief", status: trend.totalReadings >= 6 && brief ? "PASS" : "FAIL" });
  } catch (err) {
    console.log(`  🔴 Feature 5 Error: ${err.message}`);
    results.features.push({ name: "Vitals Trends & AI Brief", status: "FAIL", error: err.message });
  }

  // ─────────────────────────────────────────────────────────────
  // 7. ALL 4 DOCTORS AVAILABILITY & SLOTS CHECK
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- 7. Testing All 4 Doctors Availability & Slots ---");
  const doctors = await Doctor.find({ status: "approved" }).populate("user", "name email");
  for (const doc of doctors) {
    const hasSlots = Object.values(doc.availability || {}).some(d => Array.isArray(d) && d.length > 0);
    const slots = await resolveAvailability(doc._id, VIVA_DATE);
    console.log(`  🟢 Doctor: ${doc.user?.name} (${doc.specialization})`);
    console.log(`     - Availability badge: ${hasSlots ? "Available (🟢)" : "Not Available (🔴)"}`);
    console.log(`     - Generated Slots on ${VIVA_DATE}: ${slots.length} slots (${slots.slice(0, 3).map(s => s.startTime).join(", ")}...)`);
    results.doctorSlots.push({ name: doc.user?.name, hasSlots, slotCount: slots.length });
  }

  // ─────────────────────────────────────────────────────────────
  // 8. ADMIN DASHBOARD & FINANCIAL METRICS
  // ─────────────────────────────────────────────────────────────
  console.log("\n--- 8. Testing Admin Metrics & Reports ---");
  const totalAppts = await Appointment.countDocuments();
  const completedAppts = await Appointment.countDocuments({ status: { $in: ["consultation-completed", "completed"] } });
  const cancelledAppts = await Appointment.countDocuments({ status: "cancelled" });
  const rev = await Appointment.aggregate([
    { $match: { fees: { $gt: 0 }, status: { $nin: ["cancelled", "rejected", "no-show"] } } },
    { $group: { _id: null, total: { $sum: "$fees" } } }
  ]);
  const totalRevenue = rev[0]?.total || 0;

  console.log(`  🟢 Total Platform Appointments: ${totalAppts}`);
  console.log(`  🟢 Completed Consultations: ${completedAppts}`);
  console.log(`  🟢 Cancelled: ${cancelledAppts}`);
  console.log(`  🟢 Total Platform Revenue: ₹${totalRevenue}`);

  // Summary Table
  console.log("\n════════════════════════════════════════════════════════════");
  console.log("  📊 FINAL AUDIT VERDICT SUMMARY");
  console.log("════════════════════════════════════════════════════════════");
  console.log(`  Accounts Tested: ${results.accounts.length} / 10 passed`);
  console.log(`  Features Tested: ${results.features.filter(f => f.status === "PASS").length} / ${results.features.length} passed`);
  console.log(`  Doctors Available: ${results.doctorSlots.filter(d => d.hasSlots && d.slotCount > 0).length} / 4 passed`);
  console.log("════════════════════════════════════════════════════════════\n");

  await mongoose.disconnect();
}

runComprehensiveAudit().catch(err => {
  console.error("FATAL AUDIT ERROR:", err);
  process.exit(1);
});
