import Doctor from "../models/Doctor.js";
import User from "../models/User.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import Appointment from "../models/Appointment.js";
import DoctorAvailability from "../models/DoctorAvailability.js";
import { APPOINTMENT_STATUS } from "../utils/appointmentStatus.js";
import AppointmentReview from "../models/AppointmentReview.js";
import { sendEmail } from "../utils/sendEmail.js";

// --- Slot Generation Logic ---

/**
 * Generates available time slots based on doctor's availability rules and existing appointments.
 * @param {Object} availability - The doctor's availability object (weekly + exceptions).
 * @param {string} dateStr - The date to generate slots for (YYYY-MM-DD).
 * @param {Array} existingAppointments - Array of appointments for the date (must have 'time' and 'status').
 * @returns {Array} Array of available time strings (HH:mm).
 */
export const generateSlots = (availability, dateStr, existingAppointments) => {
  // Fixed configuration as per requirements
  const duration = 40;
  const buffer = 10;
  const slotTotal = duration + buffer;

  // Parse date to get day of week
  const dateObj = new Date(dateStr);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = days[dateObj.getDay()];

  // 1. Check for Exceptions (Overrides)
  let rule = null;
  if (availability.exceptions && Array.isArray(availability.exceptions)) {
    const exception = availability.exceptions.find(ex => {
      // Compare YYYY-MM-DD
      // Handle both Date objects and string dates safely
      const d1 = new Date(ex.date).toISOString().split('T')[0];
      const d2 = new Date(dateStr).toISOString().split('T')[0];
      return d1 === d2;
    });
    
    if (exception) {
      if (exception.isUnavailable) return []; // Full day off
      rule = exception;
    }
  }

  // 2. Fallback to Weekly Schedule
  if (!rule && availability.weekly && Array.isArray(availability.weekly)) {
    const weeklyRule = availability.weekly.find(d => d.day === dayName);
    if (weeklyRule && weeklyRule.isActive) {
      rule = weeklyRule;
    }
  }

  // If no rule found or not active, return empty
  if (!rule) return [];

  // 3. Generate Slots
  const slots = [];
  
  const timeToMinutes = (t) => {
    if (!t) return 0;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const minutesToTime = (m) => {
    const h = Math.floor(m / 60).toString().padStart(2, '0');
    const min = (m % 60).toString().padStart(2, '0');
    return `${h}:${min}`;
  };

  const startMin = timeToMinutes(rule.startTime);
  const endMin = timeToMinutes(rule.endTime);
  
  let breakStartMin = -1;
  let breakEndMin = -1;

  if (rule.hasBreak && rule.breakStart && rule.breakDuration) {
    breakStartMin = timeToMinutes(rule.breakStart);
    breakEndMin = breakStartMin + Number(rule.breakDuration); // duration in minutes
  }

  let currentMin = startMin;

  // Loop until the slot end time exceeds the working hours end time
  while (currentMin + duration <= endMin) {
    const slotStart = currentMin;
    const slotEnd = currentMin + duration;

    // Check break overlap
    let overlapsBreak = false;
    if (breakStartMin !== -1) {
      // Overlap if slot starts before break ends AND slot ends after break starts
      if (slotStart < breakEndMin && slotEnd > breakStartMin) {
        overlapsBreak = true;
      }
    }

    if (!overlapsBreak) {
      const timeStr = minutesToTime(slotStart);
      
      // Check existing appointments
      // Filter out cancelled or rejected appointments
      const isBooked = existingAppointments.some(app => app.time === timeStr && !['cancelled', 'rejected'].includes(app.status));

      if (!isBooked) {
        slots.push(timeStr);
      }
    }

    // Move to next slot (Duration + Buffer)
    currentMin += slotTotal;
  }

  return slots;
};

// Create or update doctor profile

// Create or update doctor profile
export const createOrUpdateDoctor = async (req, res) => {
  try {
    console.log("=== Doctor Profile Update ===");
    console.log("User:", req.user);
    console.log("Body:", req.body);
    console.log("File:", req.file ? `${req.file.originalname} (${req.file.size} bytes)` : "No file");

    // Check if user exists
    if (!req.user || !req.user._id) {
      console.error("❌ No user found in request");
      return res.status(401).json({ error: "Unauthorized: No user" });
    }

    // Get User model to update personal info
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Extract all fields from request body
    const {
      // Personal Information
      fullName,
      mobileNumber,
      address,
      
      // Professional Information
      medicalQualification,
      specialization,
      yearsOfExperience,
      hospitalClinicName,
      hospitalClinicAddress,
      consultationFeesOnline,
      consultationFeesOffline,
      
      // Legacy fields (for backward compatibility)
      experience,
      fees,
      availability,
      about,
      location,
    } = req.body;

    let doctor = await Doctor.findOne({ user: req.user._id });

    if (doctor) {
      // Update existing doctor profile
      console.log("📝 Updating existing doctor");
      
      // Update personal information in User model
      if (fullName) user.name = fullName.trim();
      if (mobileNumber !== undefined) user.mobileNumber = mobileNumber.trim();
      if (address !== undefined) user.residentialAddress = address.trim();
      await user.save();

      // Update professional information in Doctor model
      if (medicalQualification !== undefined) doctor.medicalQualification = medicalQualification.trim();
      if (specialization !== undefined) doctor.specialization = typeof specialization === 'string' ? specialization.trim() : specialization;
      if (yearsOfExperience !== undefined) {
        doctor.yearsOfExperience = Number(yearsOfExperience);
        doctor.experience = Number(yearsOfExperience); // Legacy field
      }
      if (hospitalClinicName !== undefined) doctor.hospitalClinicName = hospitalClinicName.trim();
      if (hospitalClinicAddress !== undefined) doctor.hospitalClinicAddress = hospitalClinicAddress.trim();
      if (consultationFeesOnline !== undefined) doctor.consultationFeesOnline = Number(consultationFeesOnline);
      if (consultationFeesOffline !== undefined) {
        doctor.consultationFeesOffline = Number(consultationFeesOffline);
        doctor.fees = Number(consultationFeesOffline); // Legacy field
      }
      
      // Legacy fields
      if (experience !== undefined) {
        doctor.experience = Number(experience);
        doctor.yearsOfExperience = Number(experience);
      }
      if (fees !== undefined) {
        doctor.fees = Number(fees);
        doctor.consultationFeesOffline = Number(fees);
      }
      if (about !== undefined) doctor.about = about;
      if (location !== undefined) {
        doctor.location = location;
        if (!doctor.hospitalClinicAddress) doctor.hospitalClinicAddress = location;
      }
      
      if (availability) {
        try {
          const parsedAvail = typeof availability === "string" ? JSON.parse(availability) : availability;
          // Enforce fixed settings
          parsedAvail.consultationDuration = 40;
          parsedAvail.bufferTime = 10;
          doctor.availability = parsedAvail;

          await DoctorAvailability.findOneAndUpdate(
            { doctorId: doctor._id },
            {
              doctorId: doctor._id,
              weekly: parsedAvail.weekly || [],
              exceptions: parsedAvail.exceptions || [],
              consultationDuration: 40,
              bufferTime: 10
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
        } catch (e) {
          console.log("⚠️  Could not parse availability, skipping");
          doctor.availability = {};
        }
      }

      // Handle image upload if present
      if (req.file) {
        try {
          console.log("📤 Uploading image to Cloudinary...");
          const imageUrl = await uploadToCloudinary(req.file.buffer);
          doctor.profileImage = imageUrl;
          console.log("✅ Image uploaded:", imageUrl);
        } catch (imgErr) {
          console.error("⚠️ Image upload failed:", imgErr.message);
          // Continue without image
        }
      }

      const savedDoctor = await doctor.save();
      console.log("✅ Doctor profile saved");
      
      // Audit log: Profile updated
      console.log(`[AUDIT] Doctor profile updated - User ID: ${req.user._id}, Doctor ID: ${savedDoctor._id}, Timestamp: ${new Date().toISOString()}`);
      
      // Return combined profile data
      const profileData = {
        fullName: user.name,
        email: user.email,
        age: user.age || "",
        mobileNumber: user.mobileNumber || "",
        address: user.residentialAddress || "",
        medicalQualification: savedDoctor.medicalQualification || "",
        specialization: savedDoctor.specialization || "",
        medicalRegistrationId: savedDoctor.medicalRegistrationId || "",
        yearsOfExperience: savedDoctor.yearsOfExperience || 0,
        hospitalClinicName: savedDoctor.hospitalClinicName || "",
        hospitalClinicAddress: savedDoctor.hospitalClinicAddress || "",
        consultationFeesOnline: savedDoctor.consultationFeesOnline || 0,
        consultationFeesOffline: savedDoctor.consultationFeesOffline || 0,
        profileImage: savedDoctor.profileImage || "",
        status: savedDoctor.status || "pending",
        experience: savedDoctor.experience || savedDoctor.yearsOfExperience || 0,
        fees: savedDoctor.fees || savedDoctor.consultationFeesOffline || 0,
        about: savedDoctor.about || "",
        location: savedDoctor.location || savedDoctor.hospitalClinicAddress || "",
        availability: savedDoctor.availability || {},
      };
      
      return res.json({ message: "Doctor profile updated", doctor: profileData });
    } else {
      // Create new doctor profile
      console.log("➕ Creating new doctor profile");
      
      // Update user personal info if provided
      if (fullName) user.name = fullName.trim();
      if (mobileNumber !== undefined) user.mobileNumber = mobileNumber.trim();
      if (address !== undefined) user.residentialAddress = address.trim();
      await user.save();
      
      doctor = new Doctor({
        user: req.user._id,
        medicalQualification: medicalQualification ? medicalQualification.trim() : "",
        specialization: typeof specialization === 'string' ? specialization.trim() : (specialization || ""),
        yearsOfExperience: yearsOfExperience ? Number(yearsOfExperience) : (experience ? Number(experience) : 0),
        hospitalClinicName: hospitalClinicName ? hospitalClinicName.trim() : "",
        hospitalClinicAddress: hospitalClinicAddress ? hospitalClinicAddress.trim() : "",
        consultationFeesOnline: consultationFeesOnline ? Number(consultationFeesOnline) : 0,
        consultationFeesOffline: consultationFeesOffline ? Number(consultationFeesOffline) : (fees ? Number(fees) : 0),
        experience: experience ? Number(experience) : (yearsOfExperience ? Number(yearsOfExperience) : 0),
        fees: fees ? Number(fees) : (consultationFeesOffline ? Number(consultationFeesOffline) : 0),
        about: about || "",
        location: location || (hospitalClinicAddress ? hospitalClinicAddress.trim() : ""),
        availability: {},
      });

      if (availability) {
        try {
          const parsedAvail = typeof availability === "string" ? JSON.parse(availability) : availability;
          parsedAvail.consultationDuration = 40;
          parsedAvail.bufferTime = 10;
          doctor.availability = parsedAvail;

          await DoctorAvailability.findOneAndUpdate(
            { doctorId: doctor._id },
            {
              doctorId: doctor._id,
              weekly: parsedAvail.weekly || [],
              exceptions: parsedAvail.exceptions || [],
              consultationDuration: 40,
              bufferTime: 10
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
        } catch (e) {
          doctor.availability = {};
        }
      }

      // Handle image upload if present
      if (req.file) {
        try {
          console.log("📤 Uploading image to Cloudinary...");
          const imageUrl = await uploadToCloudinary(req.file.buffer);
          doctor.profileImage = imageUrl;
          console.log("✅ Image uploaded:", imageUrl);
        } catch (imgErr) {
          console.error("⚠️ Image upload failed:", imgErr.message);
          // Continue without image
        }
      }

      const savedDoctor = await doctor.save();
      console.log("✅ Doctor profile created");
      
      // Audit log: Profile created
      console.log(`[AUDIT] Doctor profile created - User ID: ${req.user._id}, Doctor ID: ${savedDoctor._id}, Timestamp: ${new Date().toISOString()}`);
      
      // Return combined profile data
      const profileData = {
        fullName: user.name,
        email: user.email,
        age: user.age || "",
        mobileNumber: user.mobileNumber || "",
        address: user.residentialAddress || "",
        medicalQualification: savedDoctor.medicalQualification || "",
        specialization: savedDoctor.specialization || "",
        medicalRegistrationId: savedDoctor.medicalRegistrationId || "",
        yearsOfExperience: savedDoctor.yearsOfExperience || 0,
        hospitalClinicName: savedDoctor.hospitalClinicName || "",
        hospitalClinicAddress: savedDoctor.hospitalClinicAddress || "",
        consultationFeesOnline: savedDoctor.consultationFeesOnline || 0,
        consultationFeesOffline: savedDoctor.consultationFeesOffline || 0,
        profileImage: savedDoctor.profileImage || "",
        status: savedDoctor.status || "pending",
        experience: savedDoctor.experience || savedDoctor.yearsOfExperience || 0,
        fees: savedDoctor.fees || savedDoctor.consultationFeesOffline || 0,
        about: savedDoctor.about || "",
        location: savedDoctor.location || savedDoctor.hospitalClinicAddress || "",
        availability: savedDoctor.availability || {},
      };
      
      return res.json({ message: "Doctor profile created", doctor: profileData });
    }
  } catch (error) {
    console.error("❌ Error in createOrUpdateDoctor:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ error: error.message || "Failed to save doctor profile" });
  }
};

// Update availability
export const updateAvailability = async (req, res) => {
  const { availability } = req.body;
  const userId = req.user._id;

  try {
    // Validate and parse availability
    let availabilityData = availability;
    if (typeof availability === 'string') {
      try {
        availabilityData = JSON.parse(availability);
      } catch (e) {
        return res.status(400).json({ message: "Invalid availability format" });
      }
    }

    // Enforce fixed settings
    availabilityData.consultationDuration = 40;
    availabilityData.bufferTime = 10;

    const doctor = await Doctor.findOneAndUpdate(
      { user: userId },
      { availability: availabilityData },
      { new: true }
    );

    if (!doctor) {
      return res.status(404).json({ message: "Doctor profile not found" });
    }

    await DoctorAvailability.findOneAndUpdate(
      { doctorId: doctor._id },
      {
        doctorId: doctor._id,
        weekly: availabilityData.weekly || [],
        exceptions: availabilityData.exceptions || [],
        consultationDuration: 40,
        bufferTime: 10
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true, availability: doctor.availability });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update availability", error: err.message });
  }
};

// 🚫 Block specific dates or set custom hours
export const manageAvailabilityException = async (req, res) => {
  try {
    const { date, isUnavailable, startTime, endTime } = req.body;
    const userId = req.user._id;

    if (!date) return res.status(400).json({ message: "Date is required" });

    const doctor = await Doctor.findOne({ user: userId });
    if (!doctor) return res.status(404).json({ message: "Doctor profile not found" });

    // Initialize availability structure if needed
    if (!doctor.availability) doctor.availability = {};
    if (!Array.isArray(doctor.availability.exceptions)) doctor.availability.exceptions = [];

    // Remove existing exception for this date to avoid duplicates
    doctor.availability.exceptions = doctor.availability.exceptions.filter(
      (ex) => ex.date !== date
    );

    // Add new exception
    doctor.availability.exceptions.push({
      date,
      isUnavailable: isUnavailable === true,
      startTime,
      endTime,
    });

    // Mark mixed type as modified
    doctor.markModified("availability");
    await doctor.save();

    await DoctorAvailability.findOneAndUpdate(
      { doctorId: doctor._id },
      {
        doctorId: doctor._id,
        weekly: doctor.availability.weekly || [],
        exceptions: doctor.availability.exceptions || [],
        consultationDuration: 40,
        bufferTime: 10
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({
      success: true,
      message: "Availability exception updated",
      availability: doctor.availability,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update exception", error: err.message });
  }
};

// Get slots for doctor (Preview)
export const getDoctorSlots = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ message: "Date is required (YYYY-MM-DD)" });

    const doctor = await Doctor.findOne({ user: req.user._id });
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    // Get appointments for this doctor and date
    const appointments = await Appointment.find({
      doctor: doctor._id,
      date: date,
      status: { $nin: ['cancelled', 'rejected'] }
    }).select('time status');

    const slots = generateSlots(doctor.availability || {}, date, appointments);
    
    res.json({ date, slots });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getDoctorDashboard = async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ user: req.user._id });

    if (!doctor) {
      return res.status(200).json({
        totalEarnings: 0,
        thisMonthEarnings: 0,
        appointmentsCount: 0,
        activePatients: 0,
        recentBookings: [],
        averageRating: "0.0",
        appointmentSuccessRate: 0,
        avgResponseTime: 24
      });
    }

    const appointments = (await Appointment.find({ doctor: doctor._id })
      .populate("patient", "name email")) || [];

    const excludedStatuses = new Set([
      APPOINTMENT_STATUS.CANCELLED,
      APPOINTMENT_STATUS.REJECTED,
      APPOINTMENT_STATUS.NO_SHOW
    ]);

    const earningsAppointments = appointments.filter((a) => !excludedStatuses.has(a?.status));

    const totalEarnings = earningsAppointments.reduce((acc, a) => acc + (a?.fees || 0), 0);

    const currentMonth = new Date().getMonth();
    const thisMonthEarnings = earningsAppointments
      .filter(a => a?.date && !isNaN(new Date(a.date)))
      .filter(a => new Date(a.date).getMonth() === currentMonth)
      .reduce((acc, a) => acc + (a?.fees || 0), 0);

    const appointmentsCount = appointments.length || 0;

    const activePatients = [...new Set(
      appointments.map(a => a?.patient?._id?.toString()).filter(Boolean)
    )].length || 0;

    const recentBookings = appointments
      .sort((a, b) => new Date(b?.date || 0) - new Date(a?.date || 0))
      .slice(0, 5)
      .map(a => ({
        patient: a?.patient?.name || "N/A",
        service: a?.serviceName || "Consultation",
        date: a?.date || "N/A",
        time: a?.time || "N/A",
        status: a?.status || "pending",
        price: a?.fees || 0,
      })) || [];

    const reviews = await AppointmentReview.find({ doctorId: doctor._id }).select("rating").lean();
    const averageRating = reviews.length
      ? reviews.reduce((acc, r) => acc + (r?.rating || 0), 0) / reviews.length
      : 0;

    const successfulStatuses = new Set([
      APPOINTMENT_STATUS.CONSULTATION_COMPLETED,
      APPOINTMENT_STATUS.COMPLETED,
      APPOINTMENT_STATUS.FOLLOW_UP
    ]);

    const appointmentSuccessRate = appointmentsCount
      ? Math.round(
          (appointments.filter(a => successfulStatuses.has(a?.status)).length || 0) / appointmentsCount * 100
        )
      : 0;

    const avgResponseTime = doctor?.avgResponseTime || 24;

    return res.status(200).json({
      totalEarnings,
      thisMonthEarnings,
      appointmentsCount,
      activePatients,
      recentBookings,
      averageRating: averageRating.toFixed(1) || "0.0",
      appointmentSuccessRate,
      avgResponseTime,
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    // return safe defaults instead of 500
    return res.status(200).json({
      totalEarnings: 0,
      thisMonthEarnings: 0,
      appointmentsCount: 0,
      activePatients: 0,
      recentBookings: [],
      averageRating: "0.0",
      appointmentSuccessRate: 0,
      avgResponseTime: 24
    });
  }
};

export const sendDoctorMessage = async (req, res) => {
  try {
    const { appointmentId, subject, message } = req.body || {};

    if (!appointmentId) {
      return res.status(400).json({ message: "Appointment is required" });
    }
    if (!message || !String(message).trim()) {
      return res.status(400).json({ message: "Message is required" });
    }

    const doctor = await Doctor.findOne({ user: req.user._id });
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    const appointment = await Appointment.findOne({ _id: appointmentId, doctor: doctor._id })
      .populate("patient", "name email")
      .lean();

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    const patientEmail = appointment.patient?.email;
    if (!patientEmail) {
      return res.status(400).json({ message: "Patient email not available" });
    }

    const doctorName = req.user?.name || "Doctor";
    const safeSubject = (subject && String(subject).trim()) || `Message from Dr. ${doctorName}`;
    const safeMessage = String(message).trim();
    const apptDate = appointment.date ? new Date(appointment.date).toDateString() : "";

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">${safeSubject}</h2>
        <p>Hi ${appointment.patient?.name || "Patient"},</p>
        <p>${safeMessage.replace(/\n/g, "<br/>")}</p>
        ${apptDate ? `<p><strong>Appointment:</strong> ${apptDate} at ${appointment.time || ""}</p>` : ""}
        <p>Regards,<br/>Dr. ${doctorName}</p>
      </div>
    `;

    await sendEmail(patientEmail, safeSubject, html);

    res.json({ message: "Message sent successfully" });
  } catch (error) {
    console.error("sendDoctorMessage error:", error);
    res.status(500).json({ message: "Failed to send message" });
  }
};







// Get all approved doctors
export const getAllDoctors = async (req, res) => {
  try {
    // Only return approved doctors with approved users
    const doctors = await Doctor.find({ status: "approved" })
      .populate({
        path: "user",
        match: { isApproved: true, isVerified: true },
        select: "name email"
      });
    
    // Filter out doctors where user is null (not approved)
    const approvedDoctors = doctors.filter(doc => doc.user !== null);
    
    res.json(approvedDoctors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getDoctorReviews = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id).select("_id");
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    const reviews = await AppointmentReview.find({ doctorId: doctor._id })
      .populate("patientId", "name")
      .sort({ createdAt: -1 });

    const totalReviews = reviews.length;
    const averageRating = totalReviews
      ? Number((reviews.reduce((sum, item) => sum + Number(item.rating || 0), 0) / totalReviews).toFixed(1))
      : 0;

    res.json({
      doctorId: doctor._id,
      averageRating,
      totalReviews,
      reviews: reviews.map((item) => ({
        _id: item._id,
        rating: item.rating,
        comment: item.comment || "",
        patientName: item.patientId?.name || "Anonymous",
        createdAt: item.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get doctor by ID
export const getDoctorById = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id).populate("user", "name email age");
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });
    res.json(doctor);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get complete doctor profile (for profile page)
export const getDoctorProfile = async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ user: req.user._id }).populate("user", "name email age mobileNumber residentialAddress");
    
    if (!doctor) {
      return res.status(404).json({ message: "Doctor profile not found" });
    }

    // Combine User and Doctor data
    const profileData = {
      // Personal Information (from User)
      fullName: doctor.user.name,
      email: doctor.user.email,
      age: doctor.user.age || "",
      mobileNumber: doctor.user.mobileNumber || "",
      address: doctor.user.residentialAddress || "",
      
      // Professional Information (from Doctor)
      medicalQualification: doctor.medicalQualification || "",
      specialization: doctor.specialization || "",
      medicalRegistrationId: doctor.medicalRegistrationId || "",
      yearsOfExperience: doctor.yearsOfExperience || 0,
      hospitalClinicName: doctor.hospitalClinicName || "",
      hospitalClinicAddress: doctor.hospitalClinicAddress || "",
      consultationFeesOnline: doctor.consultationFeesOnline || 0,
      consultationFeesOffline: doctor.consultationFeesOffline || 0,
      
      // Profile Image
      profileImage: doctor.profileImage || "",
      
      // Status
      status: doctor.status || "pending",
      
      // Legacy fields for backward compatibility
      experience: doctor.experience || doctor.yearsOfExperience || 0,
      fees: doctor.fees || doctor.consultationFeesOffline || 0,
      about: doctor.about || "",
      location: doctor.location || doctor.hospitalClinicAddress || "",
      availability: doctor.availability || {},
    };

    res.json(profileData);
  } catch (error) {
    console.error("Error in getDoctorProfile:", error);
    res.status(500).json({ error: error.message || "Failed to fetch doctor profile" });
  }
};
