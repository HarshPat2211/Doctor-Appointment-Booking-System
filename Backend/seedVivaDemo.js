import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";
import Doctor from "./models/Doctor.js";
import DoctorAvailability from "./models/DoctorAvailability.js";
import Appointment from "./models/Appointment.js";
import Prescription from "./models/Prescription.js";
import AppointmentReview from "./models/AppointmentReview.js";
import PatientVital from "./models/PatientVital.js";

dotenv.config();

const VIVA_DATE = "2026-09-26"; // Saturday

// ── Reusable Medicine Templates ───────────────────────────────────
const M = {
  paracetamol:   { name: "Paracetamol",   dosage: "500mg",  frequency: "Three times daily", duration: "5 days",  instructions: "After meals with warm water" },
  azithromycin:  { name: "Azithromycin",   dosage: "500mg",  frequency: "Once daily",        duration: "3 days",  instructions: "Take 1 hour before meals" },
  cetirizine:    { name: "Cetirizine",     dosage: "10mg",   frequency: "Once daily at night",duration: "7 days",  instructions: "Before sleep" },
  pantoprazole:  { name: "Pantoprazole",   dosage: "40mg",   frequency: "Once daily morning", duration: "14 days", instructions: "30 min before breakfast" },
  amlodipine5:   { name: "Amlodipine",     dosage: "5mg",    frequency: "Once daily morning", duration: "30 days", instructions: "Take with water" },
  amlodipine10:  { name: "Amlodipine",     dosage: "10mg",   frequency: "Once daily morning", duration: "30 days", instructions: "Continue daily" },
  telmisartan:   { name: "Telmisartan",    dosage: "40mg",   frequency: "Once daily",        duration: "30 days", instructions: "Take in the morning" },
  atorvastatin:  { name: "Atorvastatin",   dosage: "10mg",   frequency: "Once daily at night",duration: "30 days", instructions: "After dinner" },
  metronidazole: { name: "Metronidazole",  dosage: "400mg",  frequency: "Three times daily", duration: "5 days",  instructions: "After meals, avoid alcohol" },
  ondansetron:   { name: "Ondansetron",    dosage: "4mg",    frequency: "Twice daily",       duration: "3 days",  instructions: "Before meals for nausea" },
  amoxicillin:   { name: "Amoxicillin",    dosage: "500mg",  frequency: "Three times daily", duration: "7 days",  instructions: "After food with water" },
  tretinoin:     { name: "Tretinoin Cream",dosage: "1g",     frequency: "Once daily at night",duration: "30 days", instructions: "Apply thin layer on affected area" },
  ketoconazole:  { name: "Ketoconazole Shampoo", dosage: "5ml", frequency: "Twice weekly",   duration: "30 days", instructions: "Leave on scalp 5 minutes" },
  hydrocortisone:{ name: "Hydrocortisone Cream", dosage: "1g", frequency: "Twice daily",     duration: "7 days",  instructions: "Apply on affected areas" },
  clopidogrel:   { name: "Clopidogrel",    dosage: "75mg",   frequency: "Once daily",        duration: "30 days", instructions: "After breakfast" },
  metformin:     { name: "Metformin",       dosage: "500mg",  frequency: "Twice daily",       duration: "30 days", instructions: "With meals" },
  omeprazole:    { name: "Omeprazole",     dosage: "20mg",   frequency: "Once daily morning", duration: "14 days", instructions: "Before breakfast" },
  montelukast:   { name: "Montelukast",    dosage: "10mg",   frequency: "Once daily at night",duration: "14 days", instructions: "Before sleep" },
  salbutamolInh: { name: "Salbutamol Inhaler", dosage: "2 mcg", frequency: "As needed",      duration: "30 days", instructions: "2 puffs when breathless" },
  diclofenacGel: { name: "Diclofenac Gel", dosage: "1g",     frequency: "Three times daily", duration: "7 days",  instructions: "Apply on painful area" },
};

// ── Historical Appointment Data ───────────────────────────────────
// [date, timeSlot, doctorKey, patientKey, diagnosis, medicines[], advice, rating, reviewComment]
// doctorKey: sarah|amit|priya|rahul  patientKey: john|priyak|mohit|anita|raj
const HISTORICAL = [
  // ─── June 2026 (5 completed) ───
  ["2026-06-02","09:00 - 09:40","amit","priyak","Acute Viral Fever with Mild Dehydration",[M.paracetamol, M.ondansetron],"Complete bed rest for 3 days. Drink 3L fluids daily.",5,"Very caring and thorough doctor. Explained everything clearly."],
  ["2026-06-09","09:00 - 09:40","rahul","mohit","Dental Cavity in Lower Right Molar",[M.amoxicillin, M.paracetamol],"Avoid hot/cold food for 48 hours. Soft diet recommended.",4,"Quick and painless procedure. Very professional."],
  ["2026-06-16","09:00 - 09:40","priya","raj","Allergic Contact Dermatitis on Forearms",[M.hydrocortisone, M.cetirizine],"Avoid soap on affected area. Use cotton clothing only.",5,"Excellent diagnosis. Rash cleared in 4 days."],
  ["2026-06-23","09:00 - 09:40","sarah","john","Chest Pain Evaluation - Non-Cardiac Origin",[M.pantoprazole, M.paracetamol],"Reduce spicy food. Follow up in 2 weeks if pain persists.",5,"Very reassuring cardiologist. Did thorough examination."],
  ["2026-06-30","09:00 - 09:40","amit","raj","Seasonal Allergic Rhinitis",[M.cetirizine, M.montelukast],"Avoid dusty environments. Use mask outdoors.",4,"Good consultation. Medicines worked well."],
  // ─── July 2026 (7 completed + 1 cancelled) ───
  ["2026-07-01","09:00 - 09:40","sarah","mohit","Heart Palpitations - Anxiety Related",[M.amlodipine5, M.pantoprazole],"Reduce caffeine. Practice deep breathing exercises.",5,"Calm and patient doctor. Took time to explain."],
  ["2026-07-07","09:00 - 09:40","amit","john","Acute Pharyngitis with Tonsillar Inflammation",[M.azithromycin, M.paracetamol],"Warm salt water gargle 3 times daily. Soft diet.",4,"Effective treatment, felt better in 2 days."],
  ["2026-07-10","09:00 - 09:40","priya","anita","Acne Vulgaris Grade II on Face",[M.tretinoin, M.azithromycin],"Wash face twice daily. Avoid oily food. Use sunscreen SPF 50.",5,"Skin cleared significantly after treatment."],
  ["2026-07-14","09:00 - 09:40","rahul","raj","Gingivitis with Mild Gum Bleeding",[M.metronidazole, M.paracetamol],"Use soft bristle brush. Rinse with warm salt water.",4,"Good dental hygiene advice."],
  ["2026-07-18","09:50 - 10:30","sarah","anita","Blood Pressure Monitoring and Review",[M.telmisartan, M.atorvastatin],"Low salt diet. Walk 30 minutes daily. Monitor BP at home.",5,"Very thorough cardiac assessment."],
  ["2026-07-22","09:00 - 09:40","amit","priyak","Chronic Migraine with Aura Episodes",[M.paracetamol, M.pantoprazole],"Maintain regular sleep schedule. Avoid screen time before bed.",4,"Understanding doctor. Good follow-up plan."],
  ["2026-07-28","09:00 - 09:40","priya","priyak","Eczema Flare-up on Both Hands",[M.hydrocortisone, M.cetirizine],"Moisturize 4 times daily. Wear cotton gloves at night.",5,"Skin specialist with excellent advice."],
  // cancelled
  ["2026-07-15","10:40 - 11:20","amit","john","CANCELLED",null,null,0,null],
  // ─── August 2026 (10 completed + 1 cancelled) ───
  ["2026-08-03","09:00 - 09:40","amit","mohit","Acute Gastroenteritis with Dehydration",[M.ondansetron, M.pantoprazole],"ORS solution every 2 hours. BRAT diet for 3 days.",5,"Prompt diagnosis and treatment. Recovered quickly."],
  ["2026-08-04","09:00 - 09:40","sarah","john","Hypertension Follow-up and Medication Adjustment",[M.amlodipine10, M.telmisartan],"Reduce sodium intake. Continue home BP monitoring.",5,"Excellent follow-up. Adjusted dose perfectly."],
  ["2026-08-07","09:00 - 09:40","rahul","anita","Professional Dental Cleaning and Checkup",[M.metronidazole],"Floss daily. Use antiseptic mouthwash twice daily.",4,"Very gentle cleaning. Good experience."],
  ["2026-08-11","09:00 - 09:40","priya","raj","Seborrheic Dermatitis of Scalp",[M.ketoconazole, M.cetirizine],"Avoid hot water on scalp. Pat dry, do not rub.",4,"Effective dandruff treatment. Saw improvement in a week."],
  ["2026-08-14","09:50 - 10:30","amit","raj","Non-specific Lower Back Pain with Muscle Spasm",[M.paracetamol, M.diclofenacGel],"Hot compress twice daily. Avoid lifting heavy objects.",4,"Practical advice and good pain management."],
  ["2026-08-18","09:00 - 09:40","sarah","priyak","Chest Tightness with Mild Dyspnea",[M.salbutamolInh, M.montelukast],"Avoid cold air exposure. Use inhaler before exercise.",5,"Thorough cardiac workup. Very reassuring."],
  ["2026-08-21","09:50 - 10:30","amit","anita","Seasonal Allergy with Nasal Congestion",[M.cetirizine, M.montelukast],"Use air purifier indoors. Steam inhalation before bed.",4,"Quick and effective treatment for allergies."],
  ["2026-08-25","09:00 - 09:40","priya","mohit","Mild Sunburn with First Degree Burns",[M.hydrocortisone, M.paracetamol],"Aloe vera gel every 4 hours. Avoid sun for 1 week.",4,"Good skincare advice for recovery."],
  ["2026-08-27","09:00 - 09:40","rahul","priyak","Impacted Wisdom Tooth Assessment",[M.amoxicillin, M.paracetamol],"Soft food diet. Apply ice pack if swelling. Return in 1 week.",5,"Very skilled dentist. Minimal discomfort."],
  ["2026-08-29","09:50 - 10:30","sarah","mohit","Cardiac Arrhythmia Evaluation and ECG",[M.clopidogrel, M.amlodipine5],"Reduce stress. Avoid heavy exercise temporarily.",5,"Expert cardiologist. ECG results explained well."],
  // cancelled
  ["2026-08-05","10:40 - 11:20","sarah","raj","CANCELLED",null,null,0,null],
  // ─── September 1-15 (5 completed) ───
  ["2026-09-01","09:00 - 09:40","amit","john","Upper Respiratory Tract Infection",[M.azithromycin, M.paracetamol, M.cetirizine],"Steam inhalation thrice daily. Warm fluids only.",4,"Good treatment. Cold resolved in 3 days."],
  ["2026-09-03","09:00 - 09:40","sarah","anita","Heart Murmur Evaluation and Echo Referral",[M.atorvastatin, M.clopidogrel],"Annual echo recommended. Low fat diet mandatory.",5,"Very detailed cardiac examination."],
  ["2026-09-08","09:00 - 09:40","priya","priyak","Contact Dermatitis from Nickel Jewelry",[M.hydrocortisone, M.cetirizine],"Remove nickel jewelry. Hypoallergenic alternatives only.",4,"Accurate diagnosis. Rash healed in 5 days."],
  ["2026-09-10","09:00 - 09:40","rahul","mohit","Root Canal Post-operative Follow-up",[M.amoxicillin, M.paracetamol],"Avoid chewing on treated side for 1 week.",5,"Excellent post-op care and guidance."],
  ["2026-09-15","09:00 - 09:40","amit","raj","Acid Reflux Disease with Esophagitis",[M.pantoprazole, M.omeprazole],"No food 2 hours before bed. Elevate head while sleeping.",4,"Helpful dietary advice included."],
  // ─── Viva Week Sept 21-25 (10 completed) ───
  ["2026-09-21","09:00 - 09:40","sarah","john","Blood Pressure Review and Dose Optimization",[M.amlodipine10, M.telmisartan],"Continue monitoring. Reduce salt. Walk 30min daily.",5,"Excellent BP management. Very attentive doctor."],
  ["2026-09-21","09:00 - 09:40","amit","priyak","Follow-up Fever and Diabetes Check",[M.paracetamol, M.metformin],"Monitor blood sugar twice daily. Light meals only.",4,"Good comprehensive checkup."],
  ["2026-09-22","09:00 - 09:40","sarah","mohit","ECG Review and Cardiac Risk Assessment",[M.clopidogrel, M.atorvastatin],"Annual lipid profile test. Mediterranean diet advised.",5,"Very thorough cardiac review."],
  ["2026-09-22","09:00 - 09:40","priya","anita","Chronic Urticaria and Skin Allergy Panel",[M.cetirizine, M.hydrocortisone],"Avoid known triggers. Cool showers recommended.",4,"Detailed allergy workup and treatment."],
  ["2026-09-23","09:00 - 09:40","amit","raj","Persistent Dry Cough with Post-nasal Drip",[M.cetirizine, M.montelukast, M.azithromycin],"Honey with warm water at bedtime. Avoid cold drinks.",5,"Effective treatment plan."],
  ["2026-09-23","09:00 - 09:40","rahul","john","Routine Dental Checkup and Scaling",[M.metronidazole],"Brush twice daily. Use dental floss after meals.",4,"Professional and thorough dental cleaning."],
  ["2026-09-24","09:00 - 09:40","sarah","priyak","Cardiology Review with Stress Test Referral",[M.amlodipine5, M.atorvastatin],"Avoid heavy exertion. Stress test within 2 weeks.",5,"Comprehensive cardiac follow-up."],
  ["2026-09-24","09:00 - 09:40","amit","mohit","Tension Headache with Cervical Strain",[M.paracetamol, M.diclofenacGel],"Neck stretches every 2 hours. Ergonomic workstation setup.",4,"Practical advice for desk workers."],
  ["2026-09-25","09:00 - 09:40","priya","raj","Psoriasis Evaluation and Treatment Plan",[M.hydrocortisone, M.cetirizine],"Moisturize frequently. Avoid harsh soaps and hot water.",5,"Expert dermatology consultation."],
  ["2026-09-25","09:00 - 09:40","sarah","anita","Annual Cardiac Checkup and Risk Screening",[M.telmisartan, M.atorvastatin, M.clopidogrel],"Low fat, low sodium diet. Daily walking 45 minutes.",5,"Best cardiologist. Very comprehensive annual review."],
];

async function main() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB:", mongoose.connection.name);

    // ═════════════════════════════════════════════════════════════
    // PHASE 1: WIPE ALL TRANSACTIONAL DATA
    // ═════════════════════════════════════════════════════════════
    console.log("\n🗑️  Phase 1: Wiping all existing data...");
    const d = await Promise.all([
      Appointment.deleteMany({}),
      Prescription.deleteMany({}),
      AppointmentReview.deleteMany({}),
      PatientVital.deleteMany({}),
      DoctorAvailability.deleteMany({}),
      Doctor.deleteMany({}),
      User.deleteMany({}),
    ]);
    console.log(`   Deleted: ${d[0].deletedCount} appts, ${d[1].deletedCount} prescriptions, ${d[2].deletedCount} reviews, ${d[3].deletedCount} vitals, ${d[4].deletedCount} availability, ${d[5].deletedCount} doctors, ${d[6].deletedCount} users`);

    // ═════════════════════════════════════════════════════════════
    // PHASE 2: CREATE USERS
    // ═════════════════════════════════════════════════════════════
    console.log("\n👤 Phase 2: Creating users...");

    // Admin
    const admin = await User.create({
      name: "Admin",
      email: "minor789@gmail.com",
      password: "minor123",
      role: "admin",
      isVerified: true,
    });
    console.log("   ✅ Admin:", admin.email);

    // Doctors (User + Doctor + Availability)
    const docDefs = [
      { name: "Dr. Sarah Jenkins", email: "doctor@gmail.com", spec: "Cardiologist", qual: "MBBS, MD (Cardiology)", regId: "MED-REG-84920", exp: 12, hospital: "HeartCare Specialty Hospital", addr: "42 Cardiac Lane, Mumbai", fee: 800, about: "Renowned cardiologist with 12 years of experience in interventional cardiology and preventive cardiac care." },
      { name: "Dr. Amit Patel", email: "amit.doctor@gmail.com", spec: "General Physician", qual: "MBBS, DNB (Family Medicine)", regId: "MED-REG-55310", exp: 8, hospital: "City Health Clinic", addr: "15 Medical Plaza, Pune", fee: 500, about: "Experienced general physician specializing in family medicine and preventive healthcare." },
      { name: "Dr. Priya Sharma", email: "priya.doctor@gmail.com", spec: "Dermatologist", qual: "MBBS, MD (Dermatology)", regId: "MED-REG-67234", exp: 10, hospital: "SkinGlow Derma Center", addr: "78 Beauty Blvd, Delhi", fee: 700, about: "Expert dermatologist specializing in acne treatment, eczema management, and cosmetic dermatology." },
      { name: "Dr. Rahul Mehta", email: "rahul.doctor@gmail.com", spec: "Dentist", qual: "BDS, MDS (Orthodontics)", regId: "MED-REG-91045", exp: 7, hospital: "SmileCare Dental Clinic", addr: "33 Dental Street, Bangalore", fee: 600, about: "Skilled dentist with expertise in root canal treatments, orthodontics, and cosmetic dentistry." },
    ];

    const docs = {}; // key -> { userId, docId }
    for (const dd of docDefs) {
      const u = await User.create({
        name: dd.name, email: dd.email, password: "doctor123",
        role: "doctor", isVerified: true, isApproved: true,
        age: "38", gender: "male", mobileNumber: "9876543210",
      });
      const defaultSlots = [
        "09:00 AM", "09:50 AM", "10:40 AM", "11:30 AM", "12:20 PM",
        "02:00 PM", "02:50 PM", "03:40 PM", "04:30 PM"
      ];

      const weeklySchedule = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"].map(day => ({
        day, isActive: true, startTime: "09:00", endTime: "17:00",
        hasBreak: true, breakStart: "14:00", breakDuration: 60,
      })).concat([{ day: "Sunday", isActive: false, startTime: "", endTime: "", hasBreak: false, breakStart: "", breakDuration: 0 }]);

      const fullAvailability = {
        consultationDuration: 40,
        bufferTime: 10,
        weekly: weeklySchedule,
        exceptions: [],
        monday: defaultSlots,
        tuesday: defaultSlots,
        wednesday: defaultSlots,
        thursday: defaultSlots,
        friday: defaultSlots,
        saturday: defaultSlots,
        sunday: []
      };

      const doc = await Doctor.create({
        userId: u._id, user: u._id,
        specialization: dd.spec, medicalQualification: dd.qual,
        medicalRegistrationId: dd.regId, yearsOfExperience: dd.exp, experience: dd.exp,
        hospitalClinicName: dd.hospital, hospitalClinicAddress: dd.addr, location: dd.addr,
        fees: dd.fee, consultationFeesOffline: dd.fee, consultationFeesOnline: dd.fee,
        status: "approved", about: dd.about, profileImage: "",
        availability: fullAvailability,
      });

      // DoctorAvailability collection record
      await DoctorAvailability.create({
        doctorId: doc._id,
        weekly: weeklySchedule,
        exceptions: [],
        consultationDuration: 40,
        bufferTime: 10,
      });
      const key = dd.email === "doctor@gmail.com" ? "sarah" : dd.email === "amit.doctor@gmail.com" ? "amit" : dd.email === "priya.doctor@gmail.com" ? "priya" : "rahul";
      docs[key] = { userId: u._id, docId: doc._id, fee: dd.fee };
      console.log(`   ✅ Doctor: ${dd.name} (${dd.spec}) → ${dd.email}`);
    }

    // Patients
    const patDefs = [
      { name: "John Doe", email: "patient@gmail.com", age: "32", gender: "male", mob: "9112233001", bg: "O+", alg: "Penicillin, Amoxicillin, Dust", ch: "Essential Hypertension", surg: "None", meds: "Amlodipine 5mg" },
      { name: "Priya Kapoor", email: "priya.patient@gmail.com", age: "28", gender: "female", mob: "9112233002", bg: "B+", alg: "Sulfa drugs", ch: "Type 2 Diabetes", surg: "None", meds: "Metformin 500mg" },
      { name: "Mohit Verma", email: "mohit.patient@gmail.com", age: "35", gender: "male", mob: "9112233003", bg: "A+", alg: "None", ch: "None", surg: "Appendectomy 2020", meds: "Vitamin D3" },
      { name: "Anita Singh", email: "anita.patient@gmail.com", age: "45", gender: "female", mob: "9112233004", bg: "AB+", alg: "Aspirin, NSAIDs", ch: "Mild Coronary Artery Disease", surg: "Angioplasty 2023", meds: "Atorvastatin 20mg" },
      { name: "Raj Kumar", email: "raj.patient@gmail.com", age: "25", gender: "male", mob: "9112233005", bg: "O-", alg: "None", ch: "None", surg: "None", meds: "None" },
    ];

    const pats = {}; // key -> userId
    for (const pd of patDefs) {
      const u = await User.create({
        name: pd.name, email: pd.email, password: "patient123",
        role: "patient", isVerified: true, age: pd.age, gender: pd.gender, mobileNumber: pd.mob,
        medicalHistory: {
          bloodGroup: pd.bg, allergies: pd.alg, chronicDiseases: pd.ch,
          pastSurgeries: pd.surg, currentMedications: pd.meds,
        },
      });
      const key = pd.email === "patient@gmail.com" ? "john" : pd.email === "priya.patient@gmail.com" ? "priyak" : pd.email === "mohit.patient@gmail.com" ? "mohit" : pd.email === "anita.patient@gmail.com" ? "anita" : "raj";
      pats[key] = u._id;
      console.log(`   ✅ Patient: ${pd.name} → ${pd.email}`);
    }

    // ═════════════════════════════════════════════════════════════
    // PHASE 3: HISTORICAL APPOINTMENTS + PRESCRIPTIONS + REVIEWS
    // ═════════════════════════════════════════════════════════════
    console.log("\n📋 Phase 3: Creating historical appointments...");
    let completedCount = 0, cancelledCount = 0;

    for (const row of HISTORICAL) {
      const [date, time, docKey, patKey, diag, meds, advice, rating, comment] = row;
      const isCancelled = diag === "CANCELLED";
      const doc = docs[docKey];
      const patId = pats[patKey];

      const slotStart = new Date(`${date}T${time.split(" - ")[0]}:00`);
      const checkIn = new Date(slotStart.getTime() - 10 * 60000);
      const consultStart = new Date(slotStart.getTime() + 5 * 60000);
      const consultEnd = new Date(consultStart.getTime() + 25 * 60000);

      const apptData = {
        doctorId: doc.docId, doctor: doc.docId,
        patientId: patId, patient: patId,
        date, time, fees: doc.fee,
        status: isCancelled ? "cancelled" : "consultation-completed",
        tokenNumber: 1, queueStatus: isCancelled ? "skipped" : "done",
      };
      if (!isCancelled) {
        apptData.checkInTime = checkIn;
        apptData.consultationStartTime = consultStart;
        apptData.consultationEndTime = consultEnd;
      } else {
        apptData.cancellationReason = "Patient could not attend due to scheduling conflict";
        apptData.cancelledBy = "patient";
        apptData.cancelledAt = new Date(`${date}T08:00:00`);
      }

      try {
        const appt = await Appointment.create(apptData);

        // Fix createdAt to 2 days before appointment date for trend chart
        const bookDate = new Date(new Date(date).getTime() - 2 * 24 * 3600000);
        await Appointment.collection.updateOne(
          { _id: appt._id },
          { $set: { createdAt: bookDate, updatedAt: new Date(date) } }
        );

        if (!isCancelled && meds) {
          // Create Prescription
          const rx = await Prescription.create({
            appointmentId: appt._id, appointment: appt._id,
            doctorId: doc.docId, doctor: doc.docId,
            patientId: patId, patient: patId,
            diagnosis: diag, medicines: meds, advice: advice || "",
            patientSummary: `Take all medicines as prescribed. ${advice || ""}`,
            safetyCheck: { status: "safe", conflicts: [], checkedAt: consultEnd },
          });
          await Prescription.collection.updateOne(
            { _id: rx._id },
            { $set: { createdAt: consultEnd, updatedAt: consultEnd } }
          );

          // Link prescription to appointment
          await Appointment.collection.updateOne(
            { _id: appt._id },
            { $set: { prescription: rx._id } }
          );

          // Create Review
          if (rating > 0) {
            const rev = await AppointmentReview.create({
              appointmentId: appt._id,
              doctorId: doc.docId,
              patientId: patId,
              rating, comment,
            });
            const revDate = new Date(new Date(date).getTime() + 1 * 24 * 3600000);
            await AppointmentReview.collection.updateOne(
              { _id: rev._id },
              { $set: { createdAt: revDate, updatedAt: revDate } }
            );
            await Appointment.collection.updateOne(
              { _id: appt._id },
              { $set: { review: rev._id } }
            );
          }
          completedCount++;
        } else {
          cancelledCount++;
        }
      } catch (err) {
        console.log(`   ⚠️  Skipped ${date} ${docKey}→${patKey}: ${err.message}`);
      }
    }
    console.log(`   ✅ Created ${completedCount} completed + ${cancelledCount} cancelled appointments`);

    // ═════════════════════════════════════════════════════════════
    // PHASE 4: VIVA DAY LIVE QUEUE (Sept 26, 2026: 12:30 PM - 2:00 PM)
    // ═════════════════════════════════════════════════════════════
    console.log("\n🎯 Phase 4: Creating viva day live queue (12:30 PM - 2:00 PM)...");
    const now = new Date();
    const sarahDoc = docs.sarah;

    // Optional morning completed appointment so 'doneCount: 1' shows on dashboard
    const morningCompleted = await Appointment.create({
      doctorId: sarahDoc.docId, doctor: sarahDoc.docId,
      patientId: pats.raj, patient: pats.raj,
      date: VIVA_DATE, time: "11:45 - 12:15", fees: sarahDoc.fee,
      status: "consultation-completed", queueStatus: "done", tokenNumber: 1,
      checkInTime: new Date("2026-09-26T11:35:00"),
      consultationStartTime: new Date("2026-09-26T11:45:00"),
      consultationEndTime: new Date("2026-09-26T12:10:00"),
      type: "in-person", paymentStatus: "completed",
    });
    const morningRx = await Prescription.create({
      appointmentId: morningCompleted._id, appointment: morningCompleted._id,
      doctorId: sarahDoc.docId, doctor: sarahDoc.docId,
      patientId: pats.raj, patient: pats.raj,
      diagnosis: "Mild Heart Murmur - Benign Functional Evaluation",
      medicines: [M.atorvastatin, M.pantoprazole],
      advice: "Maintain regular light exercise. No heavy weightlifting.",
      patientSummary: "Continue medication as prescribed. Re-evaluate in 6 months.",
      safetyCheck: { status: "safe", conflicts: [], checkedAt: new Date("2026-09-26T12:10:00") },
    });
    await Appointment.collection.updateOne({ _id: morningCompleted._id }, { $set: { prescription: morningRx._id } });

    // Live Queue tokens active during the viva session: 12:30 PM to 2:00 PM
    const queueData = [
      { pat: "mohit", time: "12:30 - 13:00", status: "consultation-started", qs: "in-progress", token: 2,
        checkInTime: new Date("2026-09-26T12:20:00"),
        consultationStartTime: new Date("2026-09-26T12:30:00") },
      { pat: "john", time: "13:00 - 13:30", status: "arrived", qs: "waiting", token: 3,
        checkInTime: new Date("2026-09-26T12:35:00") },
      { pat: "anita", time: "13:30 - 14:00", status: "approved", qs: "waiting", token: 4 },
      { pat: "priyak", time: "14:00 - 14:30", status: "pending", qs: "waiting", token: 5 },
    ];

    for (const q of queueData) {
      const apptData = {
        doctorId: sarahDoc.docId, doctor: sarahDoc.docId,
        patientId: pats[q.pat], patient: pats[q.pat],
        date: VIVA_DATE, time: q.time, fees: sarahDoc.fee,
        status: q.status, queueStatus: q.qs, tokenNumber: q.token,
      };
      if (q.checkInTime) apptData.checkInTime = q.checkInTime;
      if (q.consultationStartTime) apptData.consultationStartTime = q.consultationStartTime;

      await Appointment.create(apptData);
      console.log(`   ✅ Token #${q.token}: ${q.pat} → ${q.status} (${q.qs}) [${q.time}]`);
    }

    // ═════════════════════════════════════════════════════════════
    // PHASE 5: PATIENT VITALS (30-day history)
    // ═════════════════════════════════════════════════════════════
    console.log("\n💓 Phase 5: Creating patient vitals...");

    // John Doe: UPWARD BP trend (hypertension worsening) - 8 readings
    const johnVitals = [
      { daysAgo: 28, systolic: 122, diastolic: 78, bloodSugar: 98,  weight: 74.0, pulse: 68, notes: "Morning reading, fasting" },
      { daysAgo: 24, systolic: 126, diastolic: 80, bloodSugar: 102, weight: 74.2, pulse: 70, notes: "After breakfast" },
      { daysAgo: 20, systolic: 130, diastolic: 82, bloodSugar: 108, weight: 74.5, pulse: 72, notes: "Feeling slightly dizzy" },
      { daysAgo: 16, systolic: 134, diastolic: 85, bloodSugar: 112, weight: 75.0, pulse: 74, notes: "Mild headache in morning" },
      { daysAgo: 12, systolic: 138, diastolic: 88, bloodSugar: 116, weight: 75.3, pulse: 78, notes: "Skipped medication yesterday" },
      { daysAgo: 8,  systolic: 140, diastolic: 90, bloodSugar: 120, weight: 75.5, pulse: 80, notes: "After mild exercise" },
      { daysAgo: 4,  systolic: 142, diastolic: 92, bloodSugar: 122, weight: 75.8, pulse: 82, notes: "Stressed from work" },
      { daysAgo: 1,  systolic: 145, diastolic: 94, bloodSugar: 125, weight: 76.0, pulse: 84, notes: "Morning reading, resting" },
    ];
    for (const v of johnVitals) {
      const recordedAt = new Date(now.getTime() - v.daysAgo * 24 * 3600000);
      const vital = await PatientVital.create({
        patientId: pats.john, ...v, recordedBy: "patient", recordedAt,
      });
      delete vital.daysAgo; // cleanup
      await PatientVital.collection.updateOne({ _id: vital._id }, { $set: { createdAt: recordedAt } });
    }
    console.log("   ✅ John Doe: 8 vitals (BP trending UPWARD 122→145)");

    // Anita Singh: DOWNWARD BP trend (treatment working) - 6 readings
    const anitaVitals = [
      { daysAgo: 28, systolic: 155, diastolic: 96, bloodSugar: null, weight: 68.0, pulse: 88, notes: "High BP after stressful week" },
      { daysAgo: 22, systolic: 148, diastolic: 92, bloodSugar: null, weight: 67.8, pulse: 84, notes: "Started new medication" },
      { daysAgo: 16, systolic: 142, diastolic: 88, bloodSugar: null, weight: 67.5, pulse: 80, notes: "Feeling improvement" },
      { daysAgo: 10, systolic: 136, diastolic: 86, bloodSugar: null, weight: 67.2, pulse: 78, notes: "Regular exercise helping" },
      { daysAgo: 5,  systolic: 132, diastolic: 84, bloodSugar: null, weight: 67.0, pulse: 76, notes: "Diet changes showing results" },
      { daysAgo: 1,  systolic: 128, diastolic: 82, bloodSugar: null, weight: 66.8, pulse: 74, notes: "Best reading in months" },
    ];
    for (const v of anitaVitals) {
      const recordedAt = new Date(now.getTime() - v.daysAgo * 24 * 3600000);
      await PatientVital.create({
        patientId: pats.anita, systolic: v.systolic, diastolic: v.diastolic,
        bloodSugar: v.bloodSugar, weight: v.weight, pulse: v.pulse,
        notes: v.notes, recordedBy: "patient", recordedAt,
      });
    }
    console.log("   ✅ Anita Singh: 6 vitals (BP trending DOWNWARD 155→128)");

    // ═════════════════════════════════════════════════════════════
    // PHASE 6: VERIFICATION
    // ═════════════════════════════════════════════════════════════
    console.log("\n🔍 Phase 6: Verification...");

    const usersByRole = await User.aggregate([{ $group: { _id: "$role", count: { $sum: 1 } } }]);
    console.log("   Users by role:", usersByRole.map(r => `${r._id}: ${r.count}`).join(", "));

    const apptsByStatus = await Appointment.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }, { $sort: { count: -1 } }]);
    console.log("   Appointments by status:", apptsByStatus.map(a => `${a._id}: ${a.count}`).join(", "));

    const totalAppts = await Appointment.countDocuments();
    const totalRx = await Prescription.countDocuments();
    const totalRevs = await AppointmentReview.countDocuments();
    const totalVitals = await PatientVital.countDocuments();
    console.log(`   Totals → Appointments: ${totalAppts}, Prescriptions: ${totalRx}, Reviews: ${totalRevs}, Vitals: ${totalVitals}`);

    const avgRating = await AppointmentReview.aggregate([{ $group: { _id: null, avg: { $avg: "$rating" } } }]);
    console.log(`   Average Doctor Rating: ${avgRating[0]?.avg?.toFixed(1) || "N/A"} ⭐`);

    const revenue = await Appointment.aggregate([
      { $match: { status: { $nin: ["cancelled", "rejected", "no-show"] }, fees: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: "$fees" } } }
    ]);
    console.log(`   Total Platform Revenue: ₹${revenue[0]?.total || 0}`);

    // Verify viva queue
    const vivaQueue = await Appointment.find({ date: VIVA_DATE }).sort({ tokenNumber: 1 }).populate("patientId", "name");
    console.log(`\n   📅 Viva Day Queue (${VIVA_DATE}) — Dr. Sarah Jenkins:`);
    vivaQueue.forEach(a => {
      console.log(`      Token #${a.tokenNumber}: ${a.patientId?.name || "?"} → ${a.status} (${a.queueStatus}) [${a.time}]`);
    });

    // ═════════════════════════════════════════════════════════════
    // PHASE 7: CREDENTIALS SUMMARY
    // ═════════════════════════════════════════════════════════════
    console.log("\n" + "═".repeat(60));
    console.log("  🎓 VIVA DEMO CREDENTIALS");
    console.log("═".repeat(60));
    console.table([
      { Role: "👑 Admin",                Email: "minor789@gmail.com",      Password: "minor123" },
      { Role: "🩺 Doctor (Cardiologist)", Email: "doctor@gmail.com",        Password: "doctor123" },
      { Role: "🩺 Doctor (General)",      Email: "amit.doctor@gmail.com",   Password: "doctor123" },
      { Role: "🩺 Doctor (Dermatology)",  Email: "priya.doctor@gmail.com",  Password: "doctor123" },
      { Role: "🩺 Doctor (Dentist)",      Email: "rahul.doctor@gmail.com",  Password: "doctor123" },
      { Role: "🧑 Patient (John Doe)",    Email: "patient@gmail.com",       Password: "patient123" },
      { Role: "🧑 Patient (Priya K)",     Email: "priya.patient@gmail.com", Password: "patient123" },
      { Role: "🧑 Patient (Mohit V)",     Email: "mohit.patient@gmail.com", Password: "patient123" },
      { Role: "🧑 Patient (Anita S)",     Email: "anita.patient@gmail.com", Password: "patient123" },
      { Role: "🧑 Patient (Raj K)",       Email: "raj.patient@gmail.com",   Password: "patient123" },
    ]);
    console.log("═".repeat(60));
    console.log("  📅 VIVA DATE:", VIVA_DATE, "(Saturday) | ⏰ TIME: 12:30 PM - 2:00 PM");
    console.log("  🏥 LIVE QUEUE DOCTOR: Dr. Sarah Jenkins (Cardiologist)");
    console.log("  💊 SAFETY CHECK DEMO: Login as doctor@gmail.com, prescribe");
    console.log("     Amoxicillin to John Doe (allergic to Penicillin/Amoxicillin)");
    console.log("  📈 VITALS DEMO: Login as patient@gmail.com to see BP trend");
    console.log("═".repeat(60));

    console.log("\n✅ Viva demo seeding complete!");
  } catch (error) {
    console.error("\n❌ Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB.");
    process.exit(0);
  }
}

main();
