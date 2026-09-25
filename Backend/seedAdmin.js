import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";

dotenv.config();

const seedAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      retryWrites: true,
      w: 'majority'
    });

    console.log("✅ MongoDB connected");

    const email = "minor789@gmail.com";
    const password = "minor123";

    let admin = await User.findOne({ email });
    if (admin) {
      admin.password = password;
      admin.role = "admin";
      admin.isVerified = true;
      await admin.save();
      console.log("✅ Admin password updated successfully!");
    } else {
      // Remove old admin if present
      await User.deleteOne({ email: "milanrayka03@gmail.com" });

      admin = await User.create({
        name: "Admin",
        email,
        password,
        role: "admin",
        isVerified: true,
      });
      console.log("✅ New admin user created successfully!");
    }

    console.log("Email:", admin.email);
    console.log("Role:", admin.role);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
};

seedAdmin();
