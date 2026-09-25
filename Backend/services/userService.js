import Doctor from "../models/Doctor.js";
import User from "../models/User.js";

export const getUserById = async (userId) => User.findById(userId);

export const getUserByIdOrThrow = async (userId, notFoundMessage = "User not found") => {
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error(notFoundMessage);
    error.statusCode = 404;
    throw error;
  }
  return user;
};

export const getDoctorByUserId = async (userId) => Doctor.findOne({ $or: [{ userId }, { user: userId }] });

export const getDoctorByUserIdOrThrow = async (userId, notFoundMessage = "Doctor profile not found") => {
  const doctor = await Doctor.findOne({ $or: [{ userId }, { user: userId }] });
  if (!doctor) {
    const error = new Error(notFoundMessage);
    error.statusCode = 404;
    throw error;
  }
  return doctor;
};
