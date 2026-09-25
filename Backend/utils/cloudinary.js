import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ✅ Upload image buffer to Cloudinary
export const uploadToCloudinary = async (buffer) => {
  return new Promise((resolve, reject) => {
    if (!buffer) {
      return reject(new Error("No buffer provided"));
    }

    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "doctor-profiles",
        resource_type: "auto",
      },
      (error, result) => {
        if (error) {
          console.error("Cloudinary error details:", error);
          return reject(new Error(`Cloudinary upload failed: ${error.message}`));
        }
        resolve(result.secure_url);
      }
    );

    stream.on("error", (error) => {
      reject(new Error(`Stream error: ${error.message}`));
    });

    stream.end(buffer);
  });
};

// ✅ Optional: Export the configured instance if you ever need it
export default cloudinary;
