import User from "../models/User.js";
import Doctor from "../models/Doctor.js";
import Appointment from "../models/Appointment.js";
import AppointmentReview from "../models/AppointmentReview.js";
import Prescription from "../models/Prescription.js";
import { sendEmail } from "../utils/sendEmail.js";
import { APPOINTMENT_STATUS } from "../utils/appointmentStatus.js";
import bcrypt from "bcryptjs";
import PDFDocument from "pdfkit";

const sendDeletionEmail = async ({ email, name, role }) => {
  if (!email) return;

  const roleTitle = role === "doctor" ? "Doctor" : "Patient";
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc2626;">Account Removed by Admin</h2>
      <p>Dear ${name || roleTitle},</p>
      <p>Your ${roleTitle.toLowerCase()} account has been removed by the admin team.</p>
      <p>If you believe this action was made in error, please contact support.</p>
      <p>Best regards,<br/>Doctor Appointment System Admin</p>
    </div>
  `;

  await sendEmail(email, `${roleTitle} Account Deleted`, html);
};

const deleteRelatedAppointments = async (query) => {
  const appointments = await Appointment.find(query).select("_id").lean();
  const appointmentIds = appointments.map((appointment) => appointment._id);
  if (!appointmentIds.length) return;

  await Promise.all([
    Prescription.deleteMany({ appointmentId: { $in: appointmentIds } }),
    AppointmentReview.deleteMany({ appointmentId: { $in: appointmentIds } }),
    Appointment.deleteMany({ _id: { $in: appointmentIds } })
  ]);
};

export const getAllDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.find().populate("user", "name email role");
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteDoctor = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id).populate("user", "name email _id");
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    const linkedUserId = doctor.user?._id || doctor.user || doctor.userId;
    const linkedUser = linkedUserId ? await User.findById(linkedUserId).select("name email") : null;

    try {
      await sendDeletionEmail({
        email: linkedUser?.email || doctor.user?.email,
        name: linkedUser?.name || doctor.user?.name,
        role: "doctor"
      });
    } catch (emailError) {
      console.error("Failed to send doctor deletion email:", emailError.message);
    }

    await deleteRelatedAppointments({ $or: [{ doctor: doctor._id }, { doctorId: doctor._id }] });
    await doctor.deleteOne();

    if (linkedUserId) {
      await User.deleteOne({ _id: linkedUserId });
    }

    if (req.io && linkedUserId) {
      req.io.emit("adminAccountDeleted", {
        role: "doctor",
        userId: linkedUserId,
        message: "Doctor account deleted by admin"
      });
    }

    res.json({ message: "Doctor deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getAllPatients = async (req, res) => {
  try {
    const patients = await User.find({ role: "patient" }).select("-password");
    res.json(patients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getPatientById = async (req, res) => {
  try {
    const patient = await User.findById(req.params.id).select("-password");
    if (!patient) return res.status(404).json({ message: "Patient not found" });

    let lastAppointment = null;
    let medications = [];

    try {
      const latestAppointment = await Appointment.findOne({
        $or: [{ patient: patient._id }, { patientId: patient._id }],
      })
        .sort({ createdAt: -1 })
        .lean();

      if (latestAppointment) {
        let doctorName = "N/A";
        let specialization = "N/A";

        const doctorId = latestAppointment.doctor || latestAppointment.doctorId;
        if (doctorId) {
          const doctor = await Doctor.findById(doctorId)
            .populate("user", "name email")
            .select("specialization user")
            .lean();

          doctorName = doctor?.user?.name || "N/A";
          specialization = doctor?.specialization || "N/A";
        }

        let prescription = null;
        if (latestAppointment.prescription) {
          prescription = await Prescription.findById(latestAppointment.prescription)
            .select("diagnosis medicines advice followUpDate")
            .lean();
        }

        if (!prescription) {
          prescription = await Prescription.findOne({ appointmentId: latestAppointment._id, deletedAt: null })
            .select("diagnosis medicines advice followUpDate")
            .lean();
        }

        medications = Array.isArray(prescription?.medicines) ? prescription.medicines : [];

        lastAppointment = {
          _id: latestAppointment._id,
          date: latestAppointment.date || null,
          time: latestAppointment.time || null,
          status: latestAppointment.status || null,
          fees: latestAppointment.fees || 0,
          createdAt: latestAppointment.createdAt,
          doctorName,
          specialization,
          diagnosis: prescription?.diagnosis || latestAppointment.medicalReport?.diagnosis || "",
          advice: prescription?.advice || "",
          followUpDate: prescription?.followUpDate || latestAppointment.medicalReport?.followUpDate || null,
          prescriptionNotes: latestAppointment.medicalReport?.prescription || "",
        };
      }
    } catch (innerError) {
      console.error("getPatientById enrichment error:", innerError.message);
    }

    res.json({
      patient,
      lastAppointment,
      medications,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deletePatient = async (req, res) => {
  try {
    const patient = await User.findById(req.params.id).select("name email role");
    if (!patient) return res.status(404).json({ message: "Patient not found" });

    try {
      await sendDeletionEmail({
        email: patient.email,
        name: patient.name,
        role: "patient"
      });
    } catch (emailError) {
      console.error("Failed to send patient deletion email:", emailError.message);
    }

    await deleteRelatedAppointments({ $or: [{ patient: patient._id }, { patientId: patient._id }] });
    await patient.deleteOne();

    if (req.io) {
      req.io.emit("adminAccountDeleted", {
        role: "patient",
        userId: req.params.id,
        message: "Patient account deleted by admin"
      });
    }

    res.json({ message: "Patient deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getPendingDoctorRequests = async (req, res) => {
  try {
    const requests = await Doctor.find({ status: "pending" })
      .populate("user", "name email age mobileNumber residentialAddress")
      .sort({ updatedAt: -1 });

    const response = requests.map((doctor) => ({
      _id: doctor._id,
      fullName: doctor.user?.name || "",
      age: doctor.user?.age || 0,
      email: doctor.user?.email || "",
      mobileNumber: doctor.user?.mobileNumber || "",
      residentialAddress: doctor.user?.residentialAddress || "",
      medicalQualification: doctor.medicalQualification || "",
      specialization: doctor.specialization || "",
      medicalRegistrationId: doctor.medicalRegistrationId || "",
      yearsOfExperience: doctor.yearsOfExperience || 0,
      hospitalClinicName: doctor.hospitalClinicName || "",
      hospitalClinicAddress: doctor.hospitalClinicAddress || "",
      fees: doctor.fees || 0,
      status: doctor.status,
      submittedAt: doctor.updatedAt,
      rejectionReason: doctor.rejectionReason || ""
    }));

    res.status(200).json(response);
  } catch (error) {
    console.error("Error in getPendingDoctorRequests:", error);
    res.status(500).json({ error: error.message || "Failed to fetch requests" });
  }
};

export const getDoctorRequestById = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id)
      .populate("user", "name email age mobileNumber residentialAddress");

    if (!doctor) {
      return res.status(404).json({ message: "Request not found" });
    }

    res.status(200).json({
      _id: doctor._id,
      fullName: doctor.user?.name || "",
      age: doctor.user?.age || 0,
      email: doctor.user?.email || "",
      mobileNumber: doctor.user?.mobileNumber || "",
      residentialAddress: doctor.user?.residentialAddress || "",
      medicalQualification: doctor.medicalQualification || "",
      specialization: doctor.specialization || "",
      medicalRegistrationId: doctor.medicalRegistrationId || "",
      yearsOfExperience: doctor.yearsOfExperience || 0,
      hospitalClinicName: doctor.hospitalClinicName || "",
      hospitalClinicAddress: doctor.hospitalClinicAddress || "",
      fees: doctor.fees || 0,
      status: doctor.status,
      submittedAt: doctor.updatedAt,
      rejectionReason: doctor.rejectionReason || ""
    });
  } catch (error) {
    console.error("Error in getDoctorRequestById:", error);
    res.status(500).json({ error: error.message || "Failed to fetch request" });
  }
};

export const approveDoctorRequest = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id).populate("user");

    if (!doctor) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (doctor.status !== "pending") {
      return res.status(400).json({ message: "Request is not pending" });
    }

    const user = doctor.user;
    if (!user) {
      return res.status(404).json({ message: "Linked user not found" });
    }

    const tempPassword = Math.random().toString(36).slice(-8);
    const hashedTempPassword = await bcrypt.hash(tempPassword, 10);

    user.password = hashedTempPassword;
    user.role = "doctor";
    user.isVerified = true;
    user.isApproved = true;
    user.mustResetPassword = true;
    user.tempPassword = hashedTempPassword;
    user.isFirstLogin = false;
    await user.save();

    doctor.status = "approved";
    doctor.reviewedAt = new Date();
    doctor.reviewedBy = req.user._id;
    doctor.rejectionReason = "";
    await doctor.save();

    const loginUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/login`;
    const approvalEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4CAF50;">Doctor Account Approved</h2>
        <p>Dear ${user.name},</p>
        <p>Congratulations! Your doctor registration request has been approved.</p>
        <p>Your account has been created. Please use the following credentials to log in:</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Email:</strong> ${user.email}</p>
          <p><strong>Temporary Password:</strong> <code style="background-color: #fff; padding: 5px 10px; border-radius: 3px;">${tempPassword}</code></p>
        </div>
        <p><strong>Important:</strong> You will be required to reset your password on first login.</p>
        <p>
          <a href="${loginUrl}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 20px;">
            Login to Your Account
          </a>
        </p>
        <p>If you have any questions, please contact our support team.</p>
        <p>Best regards,<br>Doctor Appointment System Admin</p>
      </div>
    `;

    try {
      await sendEmail(user.email, "Doctor Account Approved", approvalEmailHtml);
    } catch (emailError) {
      console.error("Failed to send approval email:", emailError);
    }

    res.status(200).json({
      message: "Doctor approved successfully",
      doctor: {
        _id: doctor._id,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email
        }
      }
    });
  } catch (error) {
    console.error("Error in approveDoctorRequest:", error);
    res.status(500).json({ error: error.message || "Failed to approve doctor" });
  }
};

export const getDashboard = async (req, res) => {
  try {
    let totalDoctors = await Doctor.countDocuments();
    const totalPatients = await User.countDocuments({ role: "patient" });

    // Fallback: if Doctor collection is empty but users exist with role 'doctor', count those
    if (!totalDoctors) {
      const doctorUsers = await User.countDocuments({ role: "doctor" });
      if (doctorUsers) totalDoctors = doctorUsers;
    }

    // Robust todays appointments: match by appointment.date string OR createdAt within today
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    const appointmentsToday = await Appointment.countDocuments({
      $or: [
        { date: startOfDay.toISOString().split("T")[0] },
        { createdAt: { $gte: startOfDay, $lt: endOfDay } }
      ]
    });

    const revenueAgg = await Appointment.aggregate([
      {
        $match: {
          fees: { $gt: 0 },
          status: {
            $nin: [APPOINTMENT_STATUS.CANCELLED, APPOINTMENT_STATUS.REJECTED, APPOINTMENT_STATUS.NO_SHOW]
          }
        }
      },
      { $group: { _id: null, total: { $sum: "$fees" } } }
    ]);
    const monthlyRevenue = (revenueAgg[0] && revenueAgg[0].total) ? revenueAgg[0].total : 0;

    const yearStart = new Date(new Date().getFullYear(), 0, 1);
    const now = new Date();
    const trendAgg = await Appointment.aggregate([
      {
        $addFields: {
          trendDate: {
            $ifNull: [
              "$createdAt",
              {
                $dateFromString: {
                  dateString: "$date",
                  format: "%Y-%m-%d",
                  onError: null,
                  onNull: null,
                },
              },
            ],
          },
        },
      },
      { $match: { trendDate: { $gte: yearStart, $lte: now } } },
      { $group: { _id: { $month: "$trendDate" }, count: { $sum: 1 } } }
    ]);

    const trendCounts = Array.from({ length: 12 }).map((_, idx) => {
      const month = idx + 1;
      const found = trendAgg.find(t => t._id === month);
      return found ? found.count : 0;
    });

    const recentAppointments = await Appointment.find().sort({ createdAt: -1 }).limit(6).populate("patient", "name").populate("doctor", "user");
    const recentDoctors = await Doctor.find().sort({ createdAt: -1 }).limit(6).populate("user", "name");
    const recentPatients = await User.find({ role: "patient" }).sort({ createdAt: -1 }).limit(6);

    const relativeTime = (d) => {
      const diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
      if (diff < 60) return `${diff} seconds ago`;
      const mins = Math.floor(diff / 60);
      if (mins < 60) return `${mins} minutes ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs} hours ago`;
      const days = Math.floor(hrs / 24);
      if (days < 30) return `${days} days ago`;
      const months = Math.floor(days / 30);
      if (months < 12) return `${months} months ago`;
      const years = Math.floor(months / 12);
      return `${years} years ago`;
    };

    const activities = [];

    recentDoctors.forEach(d => activities.push({ emoji: "✅", bg: "#f0fdf4", text: `New doctor <b>${d.user?.name || 'Doctor'}</b> added`, time: relativeTime(d.createdAt), createdAt: d.createdAt }));
    recentAppointments.forEach(a => activities.push({ emoji: "📅", bg: "var(--ad-blue-50)", text: `Appointment booked by <b>${a.patient?.name || 'Unknown'}</b>`, time: relativeTime(a.createdAt), createdAt: a.createdAt }));
    recentPatients.forEach(p => activities.push({ emoji: "👤", bg: "#fff7ed", text: `New patient <b>${p.name}</b> registered`, time: relativeTime(p.createdAt), createdAt: p.createdAt }));

    activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      stats: { totalDoctors, totalPatients, appointmentsToday, monthlyRevenue },
      trendCounts,
      activities: activities.slice(0, 6).map(a => ({ emoji: a.emoji, bg: a.bg, text: a.text, time: a.time }))
    });
  } catch (error) {
    console.error("getDashboard error:", error);
    res.status(500).json({ error: error.message });
  }
};

export const rejectDoctorRequest = async (req, res) => {
  try {
    const { rejectionReason } = req.body;

    if (!rejectionReason || rejectionReason.trim() === "") {
      return res.status(400).json({ message: "Rejection reason is required" });
    }

    const doctor = await Doctor.findById(req.params.id).populate("user");

    if (!doctor) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (doctor.status !== "pending") {
      return res.status(400).json({ message: "Request is not pending" });
    }

    doctor.status = "rejected";
    doctor.rejectionReason = rejectionReason;
    doctor.reviewedAt = new Date();
    doctor.reviewedBy = req.user._id;
    await doctor.save();

    const rejectionEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f44336;">Doctor Registration Request Update</h2>
        <p>Dear ${doctor.user?.name || "Doctor"},</p>
        <p>We regret to inform you that your doctor registration request has been reviewed and unfortunately, we are unable to approve it at this time.</p>
        <div style="background-color: #ffebee; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #f44336;">
          <p><strong>Reason for Rejection:</strong></p>
          <p>${rejectionReason}</p>
        </div>
        <p>We apologize for any inconvenience this may cause. If you believe this is an error or would like to provide additional information, please feel free to contact our support team.</p>
        <p>Thank you for your interest in joining our platform.</p>
        <p>Best regards,<br>Doctor Appointment System Admin</p>
      </div>
    `;

    try {
      if (doctor.user?.email) {
        await sendEmail(doctor.user.email, "Doctor Registration Request Update", rejectionEmailHtml);
      }
    } catch (emailError) {
      console.error("Failed to send rejection email:", emailError);
    }

    res.status(200).json({
      message: "Doctor request rejected successfully",
      requestId: doctor._id
    });
  } catch (error) {
    console.error("Error in rejectDoctorRequest:", error);
    res.status(500).json({ error: error.message || "Failed to reject doctor request" });
  }
};

export const sendTestEmail = async (req, res) => {
  try {
    const { email, siteName } = req.body || {};
    const cleanEmail = (email || "").trim();
    const cleanSiteName = (siteName || "Doctor Appointment System").trim();

    if (!cleanEmail) {
      return res.status(400).json({ message: "Support email is required" });
    }

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);
    if (!emailOk) {
      return res.status(400).json({ message: "Please provide a valid email" });
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">${cleanSiteName} - Site Name Updated</h2>
        <p>An admin has updated the site name in your Doctor Appointment System.</p>
        <p>If this change was not expected, please review your admin settings.</p>
      </div>
    `;

    await sendEmail(cleanEmail, `${cleanSiteName} Site Name Updated`, html);

    res.json({ message: "Test email sent successfully" });
  } catch (error) {
    console.error("Test email error:", error);
    res.status(500).json({ message: "Failed to send test email" });
  }
};

export const generateReport = async (req, res) => {
  try {
    const { type } = req.query; // weekly, monthly, yearly
    const now = new Date();

    let startDate = new Date();
    if (type === "daily") {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (type === "weekly") {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (type === "monthly") {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    } else if (type === "yearly") {
      startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    } else {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // default 30 days
    }

    // Fetch appointments in period with doctor and patient populated
    const appointments = await Appointment.find({ createdAt: { $gte: startDate } })
      .populate({ path: 'doctorId', populate: { path: 'user', select: 'name' } })
      .populate('patientId', 'name age mobileNumber')
      .lean();

    const totalAppointments = appointments.length;
    const completedAppointments = appointments.filter(a => ['completed', 'consultation-completed'].includes(String(a.status).toLowerCase())).length;
    const cancelledAppointments = appointments.filter(a => String(a.status).toLowerCase() === 'cancelled').length;
    const noShowAppointments = appointments.filter(a => String(a.status).toLowerCase() === 'no-show').length;

    // Doctor counts
    const doctorMap = new Map();
    appointments.forEach(a => {
      const docRef = a.doctorId;
      const id = docRef?._id ? String(docRef._id) : (a.doctorId ? String(a.doctorId) : 'unknown');
      const name = docRef?.user?.name || docRef?.userName || (docRef?._id ? String(docRef._id) : 'Unknown');
      const specialization = docRef?.specialization || docRef?.speciality || 'General';
      const entry = doctorMap.get(id) || { id, name, specialization, count: 0 };
      entry.count += 1;
      doctorMap.set(id, entry);
    });

    const doctorsList = Array.from(doctorMap.values()).sort((a,b) => b.count - a.count);

    const mostConsulted = doctorsList[0] || null;

    // Build PDF (improved layout)
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    // meta - merge into existing info to preserve required fields (CreationDate)
    doc.info = Object.assign({}, doc.info || {}, { Title: 'Appointment Report', Author: 'Admin' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="appointment_report_${type || 'period'}.pdf"`);

    doc.pipe(res);

    // layout helpers
    const left = 50;
    const right = doc.page.width - 50;
    let page = 1;

    const addHeader = () => {
      doc.fillColor('#0b3d91').font('Helvetica-Bold').fontSize(16).text('Doctor Appointment Booking System', left, doc.y);
      const headerY = doc.y;
      doc.font('Helvetica').fontSize(10).fillColor('gray');
      const periodLabel = `${startDate.toLocaleDateString()} - ${now.toLocaleDateString()} (${type || 'custom'})`;
      const generatedBy = req.user?.name ? `${req.user.name} (${req.user._id})` : (req.user?._id || 'Admin');
      doc.text(`Generated: ${now.toLocaleString()}`, { align: 'right' });
      doc.text(`Period: ${periodLabel}`, { align: 'right' });
      doc.text(`Generated by: ${generatedBy}`, { align: 'right' });
      doc.moveDown(0.5);
      doc.moveTo(left, doc.y).lineTo(right, doc.y).strokeColor('#e6eefc').lineWidth(1).stroke();
      doc.moveDown(0.8);
    };

    const addFooter = () => {
      const bottom = doc.page.height - 40;
      doc.fontSize(8).fillColor('gray');
      doc.text(`Page ${page}`, left, bottom, { align: 'left' });
      doc.text('Confidential - For internal use only', 0, bottom, { align: 'center' });
      const remarks = req.query.remarks ? String(req.query.remarks).slice(0, 200) : '';
      if (remarks) doc.text(`Admin remarks: ${remarks}`, left, bottom + 10, { align: 'left' });
    };

    const newPageIfNeeded = (needed = 80) => {
      // debug: log current y and needed space to trace blank page issues
      try { console.log(`PDF: page=${page} y=${Math.round(doc.y)} needed=${needed}`); } catch (e) {}
      if (doc.y + needed > doc.page.height - 100) {
        addFooter();
        doc.addPage();
        page += 1;
        // reset graphic state and colors on new page to avoid bleed/black pages
        try { doc.save(); doc.fillColor('#000000').strokeColor('#000000'); doc.restore(); } catch (e) {}
        addHeader();
      }
    };

    // initial header
    addHeader();

    // Big centered report title
    doc.moveDown(0.5);
    doc.font('Helvetica-Bold').fontSize(26).fillColor('#0b3d91').text('Admin Report', { align: 'center' });
    doc.moveDown(0.4);

    // Summary cards row (4 cards)
    const cardWidth = (right - left - 30) / 4; // spacing
    const cardHeight = 60;
    const cardY = doc.y;
    const cardBg = '#f1f6fb';
    const cardTextColor = '#0b3d91';

    const cards = [
      { title: 'Total Appointments', value: totalAppointments },
      { title: 'Completed Appointments', value: completedAppointments },
      { title: 'Cancelled Appointments', value: cancelledAppointments },
      { title: 'Pending Appointments', value: Math.max(0, totalAppointments - completedAppointments - cancelledAppointments - noShowAppointments) }
    ];

    cards.forEach((c, i) => {
      const x = left + i * (cardWidth + 10);
      try { doc.save(); doc.roundedRect(x, cardY, cardWidth, cardHeight, 4).fill(cardBg); doc.restore(); } catch (e) { try { doc.rect(x, cardY, cardWidth, cardHeight).fill(cardBg); } catch (e2) {} }
      doc.fillColor(cardTextColor).font('Helvetica-Bold').fontSize(12).text(String(c.value), x + 8, cardY + 12);
      doc.fillColor('#334155').font('Helvetica').fontSize(9).text(c.title, x + 8, cardY + 32, { width: cardWidth - 16 });
    });

    doc.moveDown(4.2);

    // Appointment Overview (bulleted)
    newPageIfNeeded(100);
    doc.font('Helvetica-Bold').fontSize(14).fillColor('#0b3d91').text('Appointment Overview');
    doc.moveDown(0.4);
    doc.font('Helvetica').fontSize(11).fillColor('#223');
    const overviewBullets = [];
    overviewBullets.push(`Most Booked Doctor: ${mostConsulted ? mostConsulted.name : 'N/A'}`);
    // department and slot derivations (best-effort)
    try {
      const deptCounts = {};
      const slotCounts = {};
      appointments.forEach(a => {
        const spec = a.doctorId?.specialization || a.doctorId?.speciality || 'General';
        deptCounts[spec] = (deptCounts[spec] || 0) + 1;
        const slot = `${a.time || 'N/A'}`;
        slotCounts[slot] = (slotCounts[slot] || 0) + 1;
      });
      const topDept = Object.keys(deptCounts).sort((a,b)=>deptCounts[b]-deptCounts[a])[0] || 'N/A';
      const topSlot = Object.keys(slotCounts).sort((a,b)=>slotCounts[b]-slotCounts[a])[0] || 'N/A';
      overviewBullets.push(`Most Common Department: ${topDept}`);
      overviewBullets.push(`Most Popular Time Slot: ${topSlot}`);
    } catch (e) {
      overviewBullets.push('Most Common Department: N/A');
      overviewBullets.push('Most Popular Time Slot: N/A');
    }

    overviewBullets.forEach(b => { newPageIfNeeded(18); doc.circle(left+6, doc.y+6, 2).fill('#0b3d91'); doc.fillColor('#223').text('  ' + b, left+12, doc.y - 6); doc.moveDown(0.6); });

    doc.moveDown(0.6);

    // Top Doctors
    newPageIfNeeded(140);
    doc.font('Helvetica-Bold').fontSize(14).fillColor('#0b3d91').text('Top Doctors');
    doc.moveDown(0.4);
    doc.font('Helvetica').fontSize(11).fillColor('#223');
    if (doctorsList.length === 0) {
      doc.text('No doctors with appointments in this period.');
    } else {
      doctorsList.slice(0, 6).forEach((d, idx) => { newPageIfNeeded(18); doc.text(`${idx+1}. ${d.name} – ${d.count} Appointments`); doc.moveDown(0.4); });
    }

    doc.moveDown(0.8);

    // Department Statistics and Appointment Status Breakdown side-by-side
    newPageIfNeeded(140);
    const halfWidth = (right - left) / 2 - 10;
    const leftColX = left;
    const rightColX = left + halfWidth + 20;

    // Department Stats
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#0b3d91').text('Department Statistics', leftColX, doc.y);
    doc.moveDown(0.4);
    doc.font('Helvetica').fontSize(11).fillColor('#223');
    const deptEntries = Object.entries((() => { const m={}; appointments.forEach(a=>{ const k=a.doctorId?.specialization||a.doctorId?.speciality||'General'; m[k]=(m[k]||0)+1; }); return m; })());
    if (deptEntries.length===0) { doc.text('No data available', leftColX); } else { deptEntries.slice(0,6).forEach(([k,v]) => { doc.text(`• ${k}: ${v} Appointments`, leftColX); doc.moveDown(0.2); }); }

    // Appointment Status Breakdown
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#0b3d91').text('Appointment Status Breakdown', rightColX, cardY + 110);
    doc.font('Helvetica').fontSize(11).fillColor('#223');
    const statuses = [{k:'Completed',v:completedAppointments},{k:'Cancelled',v:cancelledAppointments},{k:'Pending',v:Math.max(0,totalAppointments-completedAppointments-cancelledAppointments-noShowAppointments)}];
    statuses.forEach((s,i)=>{ doc.text(`• ${s.k}: ${s.v}`, rightColX); doc.moveDown(0.2); });

    doc.moveDown(1.0);

    // Patient Demographics
    newPageIfNeeded(120);
    doc.font('Helvetica-Bold').fontSize(14).fillColor('#0b3d91').text('Patient Demographics');
    doc.moveDown(0.4);
    doc.font('Helvetica').fontSize(11).fillColor('#223');
    try {
      const male = appointments.filter(a=> (a.patientId?.gender||'').toLowerCase()==='male').length;
      const female = appointments.filter(a=> (a.patientId?.gender||'').toLowerCase()==='female').length;
      const avgAge = (()=>{
        const ages = appointments
          .map(a => Number(a.patientId?.age))
          .filter(age => Number.isFinite(age) && age > 0);
        if (ages.length === 0) return 'N/A';
        return Math.round(ages.reduce((sum, current) => sum + current, 0) / ages.length);
      })();
      const totalKnown = male+female || 1;
      doc.text(`• Male: ${Math.round((male/totalKnown)*100)}%`);
      doc.text(`• Female: ${Math.round((female/totalKnown)*100)}%`);
      doc.text(`• Average Age: ${avgAge} Years`);
    } catch (e) {
      doc.text('No demographic data available');
    }

    doc.moveDown(0.8);

    // Upcoming Appointments (list 5)
    newPageIfNeeded(140);
    doc.font('Helvetica-Bold').fontSize(14).fillColor('#0b3d91').text('Upcoming Appointments');
    doc.moveDown(0.4);
    doc.font('Helvetica').fontSize(11).fillColor('#223');
    const upcoming = appointments.filter(a=> new Date(a.date) >= now).slice(0,5);
    if (upcoming.length===0) {
      doc.text('No upcoming appointments');
    } else {
      upcoming.forEach(a => { newPageIfNeeded(22); const dt = a.date ? `${a.date} ${a.time||''}` : (a.createdAt?new Date(a.createdAt).toLocaleString():'N/A'); const docName = a.doctorId?.user?.name || 'Unknown'; const pat = a.patientId?.name || 'Unknown'; doc.text(`• ${pat} – ${docName} – ${dt}`); doc.moveDown(0.3); });
    }

    doc.moveDown(0.8);

    // Small italic note centered
    newPageIfNeeded(60);
    doc.font('Helvetica-Oblique').fontSize(10).fillColor('#556').text('Note: jitni chize project mai hai utan hi add karo.', { align: 'center' });

    // continue to Appointment Details table (existing code follows)

    // Appointment Details table
    doc.font('Helvetica-Bold').fontSize(14).fillColor('#0b3d91').text('Appointment Details');
    doc.moveDown(0.4);

    // table columns
    const colPositions = [left, left + 60, left + 180, left + 300, left + 420, left + 500];
    const colWidths = [50, 120, 120, 100, 60, 60];

    // header row background (use save/restore to avoid persistent fill state)
    const hdrY = doc.y;
    try {
      doc.save();
      doc.fillColor('#eef6ff');
      doc.rect(left - 4, hdrY - 2, right - left + 8, 20).fill();
      doc.restore();
    } catch (e) {
      // fall back silently
      try { doc.rect(left - 4, hdrY - 2, right - left + 8, 20).fill('#eef6ff'); } catch (e2) {}
    }
    doc.fillColor('#0b3d91').font('Helvetica-Bold').fontSize(10);
    ['ID', 'Date / Time', 'Doctor', 'Patient', 'Status', 'Mode'].forEach((t, i) => {
      doc.text(t, colPositions[i], hdrY, { width: colWidths[i], align: 'left' });
    });
    doc.moveDown(1.2);

    // rows
    let rowIndex = 0;
    doc.font('Helvetica').fontSize(9).fillColor('#111');
    for (const a of appointments) {
      newPageIfNeeded(26);
      const rowY = doc.y;
      // alternating background (safe fill)
      if (rowIndex % 2 === 0) {
        try {
          doc.save();
          doc.fillColor('#fbfdff');
          doc.rect(left - 4, rowY - 2, right - left + 8, 18).fill();
          doc.restore();
          doc.fillColor('#111');
        } catch (e) {
          try { doc.rect(left - 4, rowY - 2, right - left + 8, 18).fill('#fbfdff'); doc.fillColor('#111'); } catch (e2) {}
        }
      }

      const id = a._id ? String(a._id).slice(-6) : 'N/A';
      const dt = a.date ? `${a.date} ${a.time || ''}` : (a.createdAt ? new Date(a.createdAt).toLocaleString() : 'N/A');
      const doctorName = a.doctorId?.user?.name || a.doctorId?.userName || 'Unknown';
      const patientName = a.patientId?.name || 'Unknown';
      const status = a.status || 'N/A';
      const mode = a.mode || (a.slotId ? 'Offline' : 'Offline');

      doc.fillColor('#111');
      doc.text(id, colPositions[0], rowY, { width: colWidths[0] });
      doc.text(dt, colPositions[1], rowY, { width: colWidths[1] });
      doc.text(doctorName, colPositions[2], rowY, { width: colWidths[2] });
      doc.text(patientName, colPositions[3], rowY, { width: colWidths[3] });
      doc.text(status, colPositions[4], rowY, { width: colWidths[4] });
      doc.text(mode, colPositions[5], rowY, { width: colWidths[5] });

      doc.moveDown(1.0);
      rowIndex += 1;
    }

    newPageIfNeeded(120);

    // Patient Details
    doc.font('Helvetica-Bold').fontSize(14).fillColor('#0b3d91').text('Patient Details');
    doc.moveDown(0.4);
    doc.font('Helvetica').fontSize(11).fillColor('#223');
    const patientMap = new Map();
    appointments.forEach(a => {
      const p = a.patientId;
      if (!p) return;
      const id = String(p._id || p.patientId || 'unknown');
      if (!patientMap.has(id)) {
        patientMap.set(id, { id, name: p.name || 'Unknown', age: p.age || 'N/A', mobile: p.mobileNumber || 'N/A' });
      }
    });

    if (patientMap.size === 0) {
      doc.text('No patient data available for this period.');
    } else {
      for (const p of patientMap.values()) {
        newPageIfNeeded(40);
        doc.font('Helvetica-Bold').fontSize(11).text(p.name);
        doc.font('Helvetica').fontSize(10).text(`Patient ID: ${p.id}`);
        doc.text(`Age: ${p.age}   Contact: ${p.mobile}`);
        doc.moveDown(0.5);
      }
    }

    // Footer on last page
    addFooter();

    doc.end();

  } catch (error) {
    console.error("Error generating report:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: "Failed to generate report" });
    }
  }
};

// Unauthenticated sample PDF for quick testing
export const generateSampleReport = async (req, res) => {
  try {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    doc.info = Object.assign({}, doc.info || {}, { Title: 'Sample Appointment Report', Author: 'System' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="sample_report.pdf"');

    doc.pipe(res);

    // Simple header
    doc.font('Helvetica-Bold').fontSize(18).fillColor('#0b3d91').text('Admin Report (Sample)', { align: 'center' });
    doc.moveDown(0.6);

    // Sample summary row
    const left = 50;
    const right = doc.page.width - 50;
    const cardWidth = (right - left - 30) / 3;
    const cardY = doc.y;
    const sampleCards = [
      { title: 'Total', value: 12 },
      { title: 'Completed', value: 10 },
      { title: 'Cancelled', value: 2 }
    ];
    sampleCards.forEach((c, i) => {
      const x = left + i * (cardWidth + 10);
      try { doc.save(); doc.rect(x, cardY, cardWidth, 50).fill('#f1f6fb'); doc.restore(); } catch (e) { try { doc.rect(x, cardY, cardWidth, 50).fill('#f1f6fb'); } catch (e2) {} }
      doc.fillColor('#0b3d91').font('Helvetica-Bold').fontSize(14).text(String(c.value), x + 8, cardY + 10);
      doc.fillColor('#334155').font('Helvetica').fontSize(9).text(c.title, x + 8, cardY + 30);
    });

    doc.moveDown(4);

    doc.font('Helvetica').fontSize(11).fillColor('#223').text('This is a generated sample PDF to verify PDF rendering and layout.');

    // Footer
    const bottom = doc.page.height - 40;
    doc.fontSize(8).fillColor('gray');
    doc.text('Page 1', left, bottom, { align: 'left' });
    doc.text('Confidential - Sample', 0, bottom, { align: 'center' });

    doc.end();
  } catch (error) {
    console.error('sample report error:', error);
    if (!res.headersSent) res.status(500).json({ message: 'Failed to generate sample report' });
  }
};
