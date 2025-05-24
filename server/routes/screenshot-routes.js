import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { screenshotToCode } from '../controllers/screenshotToCode.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for handling file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Route to convert screenshot to code
router.post('/convert', upload.single('screenshot'), async (req, res) => {
  try {
    // Check if domain name is provided
    const { domainName } = req.query;
    if (!domainName) {
      return res.status(400).json({
        error: true,
        message: "Domain name is required in query parameters"
      });
    }

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        error: true,
        message: "No screenshot file uploaded"
      });
    }

    console.log(`📷 Processing screenshot upload: ${req.file.originalname}, Size: ${req.file.size} bytes, Type: ${req.file.mimetype}`);

    // Convert file buffer to base64 with proper data URI prefix
    const mimeType = req.file.mimetype;
    const base64Data = req.file.buffer.toString('base64');
    const screenshotBase64 = `data:${mimeType};base64,${base64Data}`;

    // Call the screenshot to code conversion function
    const result = await screenshotToCode(screenshotBase64, domainName);

    if (result.success) {
      // Generate URL path for the client
      const websiteBasePath = process.env.WEBSITE_BASE_PATH || '/scraped_website';
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      const websiteUrl = `${clientUrl}${websiteBasePath}/${domainName}/index.html`;

      res.json({
        success: true,
        message: result.message,
        filePath: result.filePath,
        code: result.htmlCode,
        url: websiteUrl
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }
  } catch (error) {
    console.error('❌ Error processing screenshot:', error);
    res.status(500).json({
      error: true,
      message: `Error processing screenshot: ${error.message}`
    });
  }
});

export default router; 