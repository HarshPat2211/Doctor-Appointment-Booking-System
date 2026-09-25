import mongoose from "mongoose";

const medicineSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    dosage: { type: String, required: true, trim: true },
    frequency: { type: String, required: true, trim: true },
    duration: { type: String, required: true, trim: true },
    instructions: { type: String, default: "", trim: true }
  },
  { _id: false }
);

const versionHistorySchema = new mongoose.Schema(
  {
    version: { type: Number, required: true },
    diagnosis: { type: String, required: true },
    medicines: { type: [medicineSchema], default: [] },
    advice: { type: String, default: "" },
    followUpDate: { type: Date, default: null },
    patientSummary: { type: String, default: "" },
    editedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    editedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const prescriptionSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
      unique: true
    },
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      default: null
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      default: null
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },
    diagnosis: { type: String, required: true, minlength: 10, trim: true },
    medicines: {
      type: [medicineSchema],
      validate: {
        validator: (value) => Array.isArray(value) && value.length > 0,
        message: "At least one medicine is required"
      }
    },
    advice: { type: String, default: "", trim: true },
    followUpDate: { type: Date, default: null },
    patientSummary: { type: String, default: "", trim: true },
    safetyCheck: {
      status: { type: String, enum: ["safe", "flagged", "overridden"], default: "safe" },
      conflicts: { type: Array, default: [] },
      checkedAt: { type: Date, default: Date.now }
    },
    safetyOverride: {
      overridden: { type: Boolean, default: false },
      reason: { type: String, default: "" }
    },
    version: { type: Number, default: 1 },
    versionHistory: { type: [versionHistorySchema], default: [] },
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true, collection: "prescriptions" }
);

prescriptionSchema.pre("validate", function (next) {
  if (!this.appointmentId && this.appointment) this.appointmentId = this.appointment;
  if (!this.appointment && this.appointmentId) this.appointment = this.appointmentId;

  if (!this.doctorId && this.doctor) this.doctorId = this.doctor;
  if (!this.doctor && this.doctorId) this.doctor = this.doctorId;

  if (!this.patientId && this.patient) this.patientId = this.patient;
  if (!this.patient && this.patientId) this.patient = this.patientId;

  next();
});

export default mongoose.model("Prescription", prescriptionSchema);
