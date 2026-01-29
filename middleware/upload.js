import cloudinary from "../config/cloudinary.js";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";

// Cloud storage for profile pictures
const storage = new CloudinaryStorage({
  cloudinary,
  params: async () => ({
    folder: "user_profiles",
    format: "png",
  }),
});

// Memory storage for chapter uploads (will be converted to base64 for Cloudinary)
const memoryStorage = multer.memoryStorage();

export const upload = multer({ storage });
export const uploadMemory = multer({ storage: memoryStorage });
