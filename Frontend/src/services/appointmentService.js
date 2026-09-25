import api from "./api";

export const getDoctorAppointments = async () => {
  const { data } = await api.get("/appointments/doctor");
  return data;
};

export const getPatientAppointments = async () => {
  const { data } = await api.get("/appointments/my");
  return data;
};

export const updateAppointmentStatus = async (appointmentId, status) => {
  const { data } = await api.put(`/appointments/${appointmentId}`, { status });
  return data;
};
