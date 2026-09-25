import mongoose from "mongoose";

const patientVitalSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    systolic: {
      type: Number,
      required: true,
      min: 50,
      max: 260
    },
    diastolic: {
      type: Number,
      required: true,
      min: 30,
      max: 180
    },
    bloodSugar: {
      type: Number,
      default: null,
      min: 20,
      max: 600
    },
    weight: {
      type: Number,
      default: null,
      min: 1,
      max: 400
    },
    pulse: {
      type: Number,
      default: null,
      min: 30,
      max: 250
    },
    notes: {
      type: String,
      default: "",
      trim: true
    },
    recordedBy: {
      type: String,
      enum: ["patient", "doctor", "nurse"],
      default: "patient"
    },
    recordedAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true,
    collection: "patient_vitals"
  }
);

patientVitalSchema.index({ patientId: 1, recordedAt: -1 });

export default mongoose.model("PatientVital", patientVitalSchema);
