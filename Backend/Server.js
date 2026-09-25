import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import connectDB from "./config/db.js";
import app from "./app.js";
import {
  processAppointmentReminders,
  processExpiredUnarrivedAppointments
} from "./services/reminderService.js";

dotenv.config();

const PORT = process.env.PORT || 5000;

console.log("📧 ENV CHECK:", process.env.EMAIL_USER, process.env.EMAIL_PASS ? "PASS FOUND" : "NO PASS");

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true
  }
});

app.set("io", io);

io.on("connection", (socket) => {
  console.log("✅ Client connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
  });
});

app.use((req, res, next) => {
  req.io = io;
  next();
});

connectDB();

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log("🔴 Socket.io enabled");

  setInterval(async () => {
    try {
      await processExpiredUnarrivedAppointments(io);
    } catch (error) {
      console.error("Auto-cancel worker failed:", error.message);
    }
  }, 60 * 1000);

  setInterval(async () => {
    try {
      await processAppointmentReminders();
    } catch (error) {
      console.error("Reminder worker failed:", error.message);
    }
  }, 15 * 60 * 1000);
});
