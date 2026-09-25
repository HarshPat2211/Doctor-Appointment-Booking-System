import multer from "multer";
import path from "path";

// Use memory storage since we’ll upload to Cloudinary directly
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (![".jpg", ".jpeg", ".png"].includes(ext)) {
      return cb(new Error("Only JPG, JPEG, and PNG files are allowed"));
    }
    cb(null, true);
  },
});
