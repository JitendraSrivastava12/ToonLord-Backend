import express from 'express';
import  adminLogin  from '../controller/adminlogin.controller.js';

const router = express.Router();

// Publicly accessible route, but logically restricted by the controller
router.post('/admin-login', adminLogin);

export default router;