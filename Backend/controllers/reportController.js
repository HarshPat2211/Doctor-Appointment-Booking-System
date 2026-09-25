import mongoose from "mongoose";
import Appointment from "../models/Appointment.js";
import Doctor from "../models/Doctor.js";

const ALLOWED_REPORT_TYPES = new Set(["revenue", "appointments", "doctor-wise"]);
const ALLOWED_PERIODS = new Set(["daily", "weekly", "monthly", "yearly"]);

const REVENUE_EXCLUDED_STATUSES = new Set(["cancelled", "rejected", "no-show"]);
const COMPLETED_STATUSES = new Set(["completed", "consultation-completed"]);

const toDateAtStartOfDay = (value) => {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setHours(0, 0, 0, 0);
  return parsed;
};

const getDateWindowForPeriod = (period, { periodDate, periodMonth, periodYear, periodDay } = {}) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  if (period === "daily") {
    const exactDate = toDateAtStartOfDay(periodDate);
    if (exactDate) {
      const endDate = new Date(exactDate);
      endDate.setHours(23, 59, 59, 999);
      return { startDate: exactDate, endDate };
    }

    const parsedDay = Number.parseInt(periodDay, 10);
    const validDay = Number.isInteger(parsedDay) && parsedDay >= 1 && parsedDay <= 31 ? parsedDay : now.getDate();
    let startDate = new Date(currentYear, currentMonth, validDay, 0, 0, 0, 0);

    // Guard against overflow dates such as 31-Feb.
    if (startDate.getMonth() !== currentMonth || startDate.getDate() !== validDay) {
      startDate = new Date(currentYear, currentMonth, now.getDate(), 0, 0, 0, 0);
    }

    const endDate = new Date(startDate);
    endDate.setHours(23, 59, 59, 999);
    return { startDate, endDate };
  }

  if (period === "weekly") {
    const endDate = toDateAtStartOfDay(periodDate) || new Date(currentYear, currentMonth, now.getDate(), 0, 0, 0, 0);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 7);
    endDate.setHours(23, 59, 59, 999);
    return { startDate, endDate };
  }

  if (period === "yearly") {
    const parsedYear = Number.parseInt(periodYear, 10);
    const year = Number.isInteger(parsedYear) && parsedYear >= 1000 && parsedYear <= 9999 ? parsedYear : currentYear;
    const startDate = new Date(year, 0, 1, 0, 0, 0, 0);
    const endDate = new Date(year, 11, 31, 23, 59, 59, 999);
    return { startDate, endDate };
  }

  const parsedMonthMatch = String(periodMonth || "").match(/^(\d{4})-(\d{2})$/);
  const monthYear = parsedMonthMatch ? Number.parseInt(parsedMonthMatch[1], 10) : currentYear;
  const monthIndex = parsedMonthMatch ? Number.parseInt(parsedMonthMatch[2], 10) - 1 : currentMonth;
  const validMonthIndex = monthIndex >= 0 && monthIndex <= 11 ? monthIndex : currentMonth;

  if (!Number.isInteger(monthYear) || monthYear < 1000 || monthYear > 9999) {
    const startDate = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0);
    const endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);
    return { startDate, endDate };
  }

  const startDate = new Date(monthYear, validMonthIndex, 1, 0, 0, 0, 0);
  const endDate = new Date(monthYear, validMonthIndex + 1, 0, 23, 59, 59, 999);
  return { startDate, endDate };
};

const toReportDate = (appointment) => {
  const fromDateField = appointment?.date ? new Date(appointment.date) : null;
  if (fromDateField && !Number.isNaN(fromDateField.getTime())) {
    return fromDateField.toISOString().split("T")[0];
  }

  const fromCreatedAt = appointment?.createdAt ? new Date(appointment.createdAt) : null;
  if (fromCreatedAt && !Number.isNaN(fromCreatedAt.getTime())) {
    return fromCreatedAt.toISOString().split("T")[0];
  }

  return "-";
};

const toTimeLabelFromDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};

const normalizeStatus = (status) => String(status || "pending").toLowerCase();

const toAppointmentTime = (appointment) => {
  const explicitTime = String(appointment?.time || "").trim();
  if (explicitTime) return explicitTime;

  const slotToken = String(appointment?.slotId || "");
  if (slotToken.includes("|")) {
    const parts = slotToken.split("|");
    if (parts[2] && String(parts[2]).trim()) {
      return String(parts[2]).trim();
    }
  }

  const createdAtTime = toTimeLabelFromDate(appointment?.createdAt);
  if (createdAtTime) return createdAtTime;

  return "Not Available";
};

export const getAdminReport = async (req, res) => {
  try {
    const reportType = String(req.query.reportType || "revenue").toLowerCase();
    const doctor = String(req.query.doctor || "all");
    const period = String(req.query.period || "monthly").toLowerCase();
    const periodDate = String(req.query.periodDate || "").trim();
    const periodMonth = String(req.query.periodMonth || "").trim();
    const periodYear = String(req.query.periodYear || "").trim();
    const periodDay = String(req.query.periodDay || "").trim();

    if (!ALLOWED_REPORT_TYPES.has(reportType)) {
      return res.status(400).json({ message: "Invalid reportType. Use revenue, appointments, or doctor-wise" });
    }

    if (!ALLOWED_PERIODS.has(period)) {
      return res.status(400).json({ message: "Invalid period. Use daily, weekly, monthly, or yearly" });
    }

    const { startDate, endDate } = getDateWindowForPeriod(period, {
      periodDate,
      periodMonth,
      periodYear,
      periodDay,
    });

    const query = {
      createdAt: { $gte: startDate, $lte: endDate },
    };

    if (doctor !== "all") {
      if (!mongoose.Types.ObjectId.isValid(doctor)) {
        return res.status(400).json({ message: "Invalid doctor id" });
      }

      const doctorObjectId = new mongoose.Types.ObjectId(doctor);
      query.$or = [{ doctorId: doctorObjectId }, { doctor: doctorObjectId }];
    }

    const appointments = await Appointment.find(query)
      .populate({ path: "doctorId", select: "specialization fees user", populate: { path: "user", select: "name" } })
      .populate({ path: "doctor", select: "specialization fees user", populate: { path: "user", select: "name" } })
      .populate("patientId", "name")
      .populate("patient", "name")
      .sort({ createdAt: -1 })
      .lean();

    const doctorIds = Array.from(new Set(
      appointments
        .map((appointment) => {
          const rawDoctorId = appointment?.doctorId?._id || appointment?.doctorId || appointment?.doctor?._id || appointment?.doctor;
          const doctorId = rawDoctorId ? String(rawDoctorId) : "";
          return mongoose.Types.ObjectId.isValid(doctorId) ? doctorId : null;
        })
        .filter(Boolean)
    ));

    const doctorFeeMap = new Map();
    if (doctorIds.length > 0) {
      const doctorDocs = await Doctor.find(
        { _id: { $in: doctorIds } },
        { fees: 1 }
      ).lean();

      doctorDocs.forEach((doc) => {
        doctorFeeMap.set(String(doc._id), Number(doc?.fees || 0));
      });
    }

    const appointmentRows = appointments.map((appointment) => {
      const doctorRef = appointment.doctorId || appointment.doctor;
      const patientRef = appointment.patientId || appointment.patient;
      const status = normalizeStatus(appointment.status);
      const displayStatus = status === "no-show" ? "cancelled" : status;
      const doctorObjectId = String(doctorRef?._id || appointment?.doctorId || appointment?.doctor || "");
      const profileFee = doctorFeeMap.get(doctorObjectId) || 0;
      const fees = Number(appointment?.fees || doctorRef?.fees || profileFee || 0);

      return {
        doctorObjectId,
        date: toReportDate(appointment),
        patientName: patientRef?.name || "N/A",
        doctorName: doctorRef?.user?.name || "N/A",
        specialization: doctorRef?.specialization || "General",
        appointmentStatus: displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1),
        fees,
        appointmentTime: toAppointmentTime(appointment),
      };
    });

    const doctorStatsMap = new Map();

    appointmentRows.forEach((row) => {
      const key = row.doctorObjectId || `${row.doctorName}-${row.specialization}`;
      if (!doctorStatsMap.has(key)) {
        doctorStatsMap.set(key, {
          doctorName: row.doctorName,
          specialization: row.specialization,
          totalAppointments: 0,
          completedAppointments: 0,
          completedRevenue: 0,
          doctorFee: 0,
          cancelledAppointments: 0,
          rejectedAppointments: 0,
          consideredAppointments: 0,
          totalRevenue: 0,
        });
      }

      const entry = doctorStatsMap.get(key);
      const status = normalizeStatus(row.appointmentStatus);
      const fees = Number(row.fees || 0);

      if (!entry.doctorFee && fees > 0) {
        entry.doctorFee = fees;
      }

      entry.totalAppointments += 1;

      if (COMPLETED_STATUSES.has(status)) {
        entry.completedAppointments += 1;
        entry.completedRevenue += fees;
      }

      if (status === "cancelled") {
        entry.cancelledAppointments += 1;
      }

      if (status === "rejected") {
        entry.rejectedAppointments += 1;
      }

      if (!REVENUE_EXCLUDED_STATUSES.has(status)) {
        entry.consideredAppointments += 1;
        entry.totalRevenue += fees;
      }
    });

    const totalRevenue = appointmentRows.reduce((sum, row) => {
      const status = normalizeStatus(row.appointmentStatus);
      if (!COMPLETED_STATUSES.has(status)) return sum;
      return sum + Number(row.fees || 0);
    }, 0);

    const completedAppointments = appointmentRows.filter((row) =>
      COMPLETED_STATUSES.has(normalizeStatus(row.appointmentStatus))
    ).length;

    const cancelledAppointments = appointmentRows.filter((row) =>
      normalizeStatus(row.appointmentStatus) === "cancelled"
    ).length;

    const rejectedAppointments = appointmentRows.filter((row) =>
      normalizeStatus(row.appointmentStatus) === "rejected"
    ).length;

    const doctorWiseRows = Array.from(doctorStatsMap.values())
      .sort((a, b) => b.totalAppointments - a.totalAppointments)
      .map((entry) => ({
        consultationFee: entry.doctorFee
          || (entry.consideredAppointments
            ? Math.round(entry.totalRevenue / entry.consideredAppointments)
            : 0),
        doctorName: entry.doctorName,
        specialization: entry.specialization,
        totalAppointments: entry.totalAppointments,
        completedAppointments: entry.completedAppointments,
        cancelledAppointments: entry.cancelledAppointments,
        completionRate: entry.totalAppointments
          ? Math.round((entry.completedAppointments / entry.totalAppointments) * 100)
          : 0,
      }));

    const revenueRows = Array.from(doctorStatsMap.values())
      .sort((a, b) => b.completedRevenue - a.completedRevenue)
      .map((entry) => ({
        doctorName: entry.doctorName,
        specialization: entry.specialization,
        totalAppointments: entry.totalAppointments,
        completedAppointments: entry.completedAppointments,
        consideredAppointments: entry.completedAppointments,
        totalRevenue: entry.completedRevenue,
        appointmentFee: entry.doctorFee,
        avgFeePerAppointment: entry.completedAppointments
          ? Math.round(entry.completedRevenue / entry.completedAppointments)
          : entry.doctorFee,
      }));

    let data = appointmentRows;

    if (reportType === "doctor-wise") {
      data = doctorWiseRows;
    } else if (reportType === "revenue") {
      data = revenueRows;
    }

    return res.json({
      totalRevenue,
      totalAppointments: appointmentRows.length,
      completedAppointments,
      cancelledAppointments,
      rejectedAppointments,
      reportType,
      period,
      rangeStart: startDate.toISOString(),
      rangeEnd: endDate.toISOString(),
      data,
    });
  } catch (error) {
    console.error("Report API error:", error);
    return res.status(500).json({ message: "Failed to generate report" });
  }
};
