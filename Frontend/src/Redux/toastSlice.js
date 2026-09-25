import { createSlice } from "@reduxjs/toolkit";

const toastSlice = createSlice({
  name: "toast",
  initialState: {
    notifications: [],
  },
  reducers: {
    showToast: (state, action) => {
      const { message, type = "info", duration = 3000 } = action.payload;
      const id = Date.now();
      state.notifications.push({
        id,
        message,
        type, // "success", "error", "info", "warning"
        duration,
      });
    },
    removeToast: (state, action) => {
      state.notifications = state.notifications.filter(
        (notif) => notif.id !== action.payload
      );
    },
    clearAllToasts: (state) => {
      state.notifications = [];
    },
  },
});

export const { showToast, removeToast, clearAllToasts } = toastSlice.actions;
export default toastSlice.reducer;
