import mongoose from "mongoose";

const doctorSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  // Professional Details
  medicalQualification: {
    type: String,
    default: "",
  },
  specialization: {
    type: String,
    default: "",
  },
  medicalRegistrationId: {
    type: String,
    default: "",
  },
  yearsOfExperience: {
    type: Number,
    default: 0,
  },
  hospitalClinicName: {
    type: String,
    default: "",
  },
  hospitalClinicAddress: {
    type: String,
    default: "",
  },
  // Legacy fields (for backward compatibility)
  experience: {
    type: Number,
    default: 0,
  },
  fees: {
    type: Number,
    default: 0,
  },
  consultationFeesOnline: {
    type: Number,
    default: 0,
  },
  consultationFeesOffline: {
    type: Number,
    default: 0,
  },
  about: {
    type: String,
    default: "",
  },
  location: {
    type: String,
    default: "",
  },
  profileImage: {
    type: String,
    default: "",
  },
  availability: {
    type: Object,
    default: {},
  },
  // Approval status
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  rejectionReason: {
    type: String,
    default: "",
  },
  reviewedAt: {
    type: Date,
    default: null,
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  createdAt: {  
    type: Date,
    default: Date.now,
  },
}, { collection: "doctors" });

doctorSchema.pre("validate", function (next) {
  if (!this.userId && this.user) this.userId = this.user;
  if (!this.user && this.userId) this.user = this.userId;
  next();
});

export default mongoose.model("Doctor", doctorSchema);
