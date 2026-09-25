// src/Redux/doctorSlice.js
import { createSlice } from "@reduxjs/toolkit";

const doctorSlice = createSlice({
  name: "doctor",
  initialState: {
    profile: null,
    loading: false,
  },
  reducers: {
    setDoctorProfile: (state, action) => {
      state.profile = action.payload;
    },
    clearDoctorProfile: (state) => {
      state.profile = null;
    },
  },
});

export const { setDoctorProfile, clearDoctorProfile } = doctorSlice.actions;
export default doctorSlice.reducer;
