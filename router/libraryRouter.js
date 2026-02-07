// routes/library.js (or wherever your library router is)
import express from "express";
import protect from "../middleware/authMiddleware.js";
import { 
  updateLibraryItem, 
  getLibrary,removeFromLibrary // <--- You need to import your GET controller
} from "../controller/library.js";

const router = express.Router();

// This handles: GET http://localhost:5000/api/library
router.get("/", protect, getLibrary); 

// This handles: POST http://localhost:5000/api/library/update
router.post("/update", protect, updateLibraryItem);
// This handles: POST http://localhost:5000/api/library/remove
router.post("/remove", protect, removeFromLibrary);

export default router;