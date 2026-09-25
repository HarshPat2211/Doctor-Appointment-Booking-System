import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";
import Doctor from "./models/Doctor.js";
import DoctorAvailability from "./models/DoctorAvailability.js";

dotenv.config();

const seedDummyData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      retryWrites: true,
      w: "majority",
    });

    console.log("✅ MongoDB connected for dummy data seeding");

    // ==========================================
    // 1. ADMIN USER
    // ==========================================
    const adminEmail = "minor789@gmail.com";
    const adminPassword = "minor123";

    let admin = await User.findOne({ email: adminEmail });
    if (admin) {
      admin.password = adminPassword;
      admin.role = "admin";
      admin.isVerified = true;
      await admin.save();
    } else {
      admin = await User.create({
        name: "Master Admin",
        email: adminEmail,
        password: adminPassword,
        role: "admin",
        isVerified: true,
      });
    }
    console.log(`✅ Admin Ready: ${adminEmail} | ${adminPassword}`);

    // ==========================================
    // 2. DUMMY DOCTOR
    // ==========================================
    const docEmail = "doctor@gmail.com";
    const docPassword = "doctor123";

    let docUser = await User.findOne({ email: docEmail });
    if (docUser) {
      docUser.name = "Dr. Sarah Jenkins";
      docUser.password = docPassword;
      docUser.role = "doctor";
      docUser.isVerified = true;
      docUser.isApproved = true;
      docUser.mustResetPassword = false;
      docUser.age = "38";
      docUser.gender = "female";
      docUser.mobileNumber = "9876543210";
      docUser.residentialAddress = "104 Healthcare Avenue, Medical District";
      await docUser.save();
    } else {
      docUser = await User.create({
        name: "Dr. Sarah Jenkins",
        email: docEmail,
        password: docPassword,
        role: "doctor",
        isVerified: true,
        isApproved: true,
        mustResetPassword: false,
        age: "38",
        gender: "female",
        mobileNumber: "9876543210",
        residentialAddress: "104 Healthcare Avenue, Medical District",
      });
    }

    let doctorProfile = await Doctor.findOne({
      $or: [{ userId: docUser._id }, { user: docUser._id }],
    });

    const docDetails = {
      userId: docUser._id,
      user: docUser._id,
      medicalQualification: "MBBS, MD (Cardiology)",
      specialization: "Cardiologist",
      medicalRegistrationId: "MED-REG-84920",
      yearsOfExperience: 10,
      experience: 10,
      hospitalClinicName: "City Heart & Health Care",
      hospitalClinicAddress: "Suite 401, Central Medicare Hub",
      location: "Suite 401, Central Medicare Hub",
      fees: 500,
      status: "approved",
      about: "Senior Cardiologist specializing in preventive heart health and cardiovascular diagnostics.",
    };

    if (doctorProfile) {
      Object.assign(doctorProfile, docDetails);
      await doctorProfile.save();
    } else {
      doctorProfile = await Doctor.create(docDetails);
    }

    // Configure Weekly Availability (Mon - Fri, 09:00 - 17:00 with lunch break)
    const weeklySchedule = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ].map((day) => ({
      day,
      isActive: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].includes(day),
      startTime: "09:00",
      endTime: "17:00",
      hasBreak: true,
      breakStart: "13:00",
      breakDuration: 60,
    }));

    await DoctorAvailability.findOneAndUpdate(
      { doctorId: doctorProfile._id },
      {
        doctorId: doctorProfile._id,
        weekly: weeklySchedule,
        exceptions: [],
        consultationDuration: 40,
        bufferTime: 10,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log(`✅ Doctor Ready: ${docEmail} | ${docPassword} (Specialty: Cardiologist)`);

    // ==========================================
    // 3. DUMMY PATIENT
    // ==========================================
    const patientEmail = "patient@gmail.com";
    const patientPassword = "patient123";

    let patientUser = await User.findOne({ email: patientEmail });
    if (patientUser) {
      patientUser.name = "John Doe";
      patientUser.password = patientPassword;
      patientUser.role = "patient";
      patientUser.isVerified = true;
      patientUser.age = "29";
      patientUser.gender = "male";
      patientUser.mobileNumber = "9123456780";
      patientUser.residentialAddress = "24 Palm Grove Road";
      patientUser.medicalHistory = {
        bloodGroup: "O+",
        allergies: "None",
        chronicDiseases: "None",
        pastSurgeries: "None",
        currentMedications: "Vitamin D3",
      };
      await patientUser.save();
    } else {
      patientUser = await User.create({
        name: "John Doe",
        email: patientEmail,
        password: patientPassword,
        role: "patient",
        isVerified: true,
        age: "29",
        gender: "male",
        mobileNumber: "9123456780",
        residentialAddress: "24 Palm Grove Road",
        medicalHistory: {
          bloodGroup: "O+",
          allergies: "None",
          chronicDiseases: "None",
          pastSurgeries: "None",
          currentMedications: "Vitamin D3",
        },
      });
    }

    console.log(`✅ Patient Ready: ${patientEmail} | ${patientPassword}`);
    console.log("\n🎉 ALL DUMMY ACCOUNTS SEEDED SUCCESSFULLY!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error.message);
    process.exit(1);
  }
};

seedDummyData();
