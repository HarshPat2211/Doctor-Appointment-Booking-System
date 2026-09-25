import mongoose from "mongoose";

const doctorAvailabilitySchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
      unique: true,
      index: true
    },
    weekly: {
      type: [
        {
          day: { type: String, required: true },
          isActive: { type: Boolean, default: false },
          startTime: { type: String, default: "" },
          endTime: { type: String, default: "" },
          hasBreak: { type: Boolean, default: false },
          breakStart: { type: String, default: "" },
          breakDuration: { type: Number, default: 0 }
        }
      ],
      default: []
    },
    exceptions: {
      type: [
        {
          date: { type: String, required: true },
          isUnavailable: { type: Boolean, default: false },
          startTime: { type: String, default: "" },
          endTime: { type: String, default: "" },
          hasBreak: { type: Boolean, default: false },
          breakStart: { type: String, default: "" },
          breakDuration: { type: Number, default: 0 }
        }
      ],
      default: []
    },
    consultationDuration: { type: Number, default: 40 },
    bufferTime: { type: Number, default: 10 }
  },
  { timestamps: true, collection: "doctorAvailability" }
);

export default mongoose.model("DoctorAvailability", doctorAvailabilitySchema);
