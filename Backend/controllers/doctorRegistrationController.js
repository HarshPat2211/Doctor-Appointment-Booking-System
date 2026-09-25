import User from "../models/User.js";
import Doctor from "../models/Doctor.js";

// =======================
// @desc   Step 1: Submit basic details
// @route  POST /api/doctor-registration/step1
// @access Public
// =======================
export const submitBasicDetails = async (req, res) => {
  try {
    const { fullName, age, email, mobileNumber, residentialAddress } = req.body;

    if (!fullName || !age || !email || !mobileNumber || !residentialAddress) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email, role: { $in: ["patient", "admin"] } });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    let user = await User.findOne({ email, role: "doctor" });

    if (!user) {
      user = await User.create({
        name: fullName,
        email,
        password: `pending-${Date.now()}`,
        role: "doctor",
        isVerified: true,
        isApproved: false,
        age: Number(age),
        mobileNumber,
        residentialAddress
      });
    } else {
      if (user.isApproved) {
        return res.status(400).json({ message: "Email already registered" });
      }

      user.name = fullName;
      user.age = Number(age);
      user.mobileNumber = mobileNumber;
      user.residentialAddress = residentialAddress;
      await user.save();
    }

    await Doctor.findOneAndUpdate(
      { $or: [{ userId: user._id }, { user: user._id }] },
      {
        userId: user._id,
        user: user._id,
        status: "pending"
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({
      message: "Basic details saved successfully",
      requestId: user._id
    });
  } catch (error) {
    console.error("Error in submitBasicDetails:", error);
    res.status(500).json({ message: error.message || "Failed to save basic details" });
  }
};

// =======================
// @desc   Step 2: Submit professional details and finalize request
// @route  POST /api/doctor-registration/step2
// @access Public
// =======================
export const submitProfessionalDetails = async (req, res) => {
  try {
    const {
      email,
      medicalQualification,
      specialization,
      medicalRegistrationId,
      yearsOfExperience,
      hospitalClinicName,
      hospitalClinicAddress,
      fees
    } = req.body;

    if (!email || !medicalQualification || !specialization || !medicalRegistrationId ||
      !yearsOfExperience || !hospitalClinicName || !hospitalClinicAddress ||
      fees === undefined) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await User.findOne({ email, role: "doctor", isApproved: false });
    if (!user) {
      return res.status(404).json({ message: "Registration request not found. Please complete step 1 first." });
    }

    const doctor = await Doctor.findOneAndUpdate(
      { $or: [{ userId: user._id }, { user: user._id }] },
      {
        userId: user._id,
        user: user._id,
        medicalQualification,
        specialization,
        medicalRegistrationId,
        yearsOfExperience: Number(yearsOfExperience),
        hospitalClinicName,
        hospitalClinicAddress,
        fees: Number(fees),
        experience: Number(yearsOfExperience),
        location: hospitalClinicAddress,
        status: "pending"
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({
      message: "Your request has been sent to the admin. Please wait for approval.",
      requestId: doctor._id
    });
  } catch (error) {
    console.error("Error in submitProfessionalDetails:", error);
    res.status(500).json({ message: error.message || "Failed to submit request" });
  }
};

// =======================
// @desc   Get registration request status
// @route  GET /api/doctor-registration/status/:email
// @access Public
// =======================
export const getRegistrationStatus = async (req, res) => {
  try {
    const { email } = req.params;
    const user = await User.findOne({ email, role: "doctor" });

    if (!user) {
      return res.status(404).json({ message: "No registration request found" });
    }

    const doctor = await Doctor.findOne({ $or: [{ userId: user._id }, { user: user._id }] });
    const status = user.isApproved ? "approved" : (doctor?.status || "pending");

    res.status(200).json({
      status,
      requestId: doctor?._id || user._id,
      submittedAt: doctor?.updatedAt || user.updatedAt,
      rejectionReason: doctor?.rejectionReason || ""
    });
  } catch (error) {
    console.error("Error in getRegistrationStatus:", error);
    res.status(500).json({ message: error.message || "Failed to get status" });
  }
};
