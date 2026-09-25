// src/Redux/patientSlice.js
import { createSlice } from "@reduxjs/toolkit";

const patientSlice = createSlice({
  name: "patient",
  initialState: {
    data: null,
  },
  reducers: {
    setPatientData: (state, action) => {
      state.data = action.payload;
    },
  },
});

export const { setPatientData } = patientSlice.actions;
export default patientSlice.reducer;
