import Doctor from "../models/Doctor.js";
import Appointment from "../models/Appointment.js";
import { generateSlots } from "./doctorController.js";
import DoctorAvailability from "../models/DoctorAvailability.js";

// @desc   Get all approved doctors (browse/search)
export const getAllDoctors = async (req, res) => {
  try {
    const { specialization, location } = req.query;

    let query = { status: "approved" };
    if (specialization) query.specialization = specialization;
    if (location) query.location = location;

    const doctors = await Doctor.find(query).populate("user", "name email");
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc   Get doctor details
export const getDoctorById = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id).populate("user", "name email age");
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });
    res.json(doctor);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc   Get available slots for a doctor on a specific date
export const getDoctorAvailableSlots = async (req, res) => {
  try {
    const { doctorId, date } = req.query;
    
    if (!doctorId || !date) {
        return res.status(400).json({ message: "Doctor ID and Date are required" });
    }

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    const availability = await DoctorAvailability.findOne({ doctorId });
    const appointments = await Appointment.find({
      doctorId,
      date,
      status: { $nin: ["cancelled", "rejected", "no-show"] }
    }).select("time status");

    let timeStrings = [];
    if (availability) {
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const dayName = days[new Date(date).getDay()];
      const exception = (availability.exceptions || []).find((entry) => entry.date === date);

      if (exception) {
        if (!exception.isUnavailable) {
          timeStrings = generateSlots(
            {
              weekly: [],
              exceptions: [
                {
                  date,
                  isUnavailable: false,
                  startTime: exception.startTime,
                  endTime: exception.endTime,
                  hasBreak: exception.hasBreak,
                  breakStart: exception.breakStart,
                  breakDuration: exception.breakDuration
                }
              ]
            },
            date,
            appointments
          );
        }
      } else {
        timeStrings = generateSlots(
          {
            weekly: (availability.weekly || []).filter((item) => item.day === dayName),
            exceptions: []
          },
          date,
          appointments
        );
      }
    } else {
      timeStrings = generateSlots(doctor.availability || {}, date, appointments);
    }

    let availableSlots = timeStrings.map((time) => ({
      _id: `${doctorId}|${date}|${time}`,
      doctorId,
      date,
      startTime: time,
      isBooked: false
    }));

    // Filter out past slots
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    if (date < todayStr) {
        availableSlots = [];
    } else if (date === todayStr) {
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        availableSlots = availableSlots.filter(slot => {
            const [h, m] = slot.startTime.split(':').map(Number);
            return (h * 60 + m) > currentMinutes;
        });
    }

    res.json({ date, slots: availableSlots });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc   Get logged-in patient’s appointments
export const getMyAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({ patient: req.user._id })
      .populate("doctor", "specialization location fees")
      .populate("patient", "name email");
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
