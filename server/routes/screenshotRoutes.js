import express from 'express';
import multer from 'multer';
import { convertScreenshotToCode } from '../controllers/screenshotController.js';
import { modifyWebsite } from '../controllers/modifyWebsite.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { 
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  }
});

// Route to convert screenshot to code
router.post('/convert', upload.single('screenshot'), convertScreenshotToCode);

// Route to modify generated website
router.post('/modify', async (req, res) => {
  try {
    const { domainName, instruction } = req.body;
    
    if (!domainName || !instruction) {
      return res.status(400).json({ 
        success: false, 
        message: 'Domain name and instruction are required'
      });
    }
    
    // Get the current HTML file content
    const clientDir = process.env.CLIENT_DIR_PATH || path.join(__dirname, "..", "..", "client", "public");
    const websitesDir = path.join(clientDir, process.env.WEBSITE_DIR || "scraped_website");
    const domainDir = path.join(websitesDir, domainName);
    const htmlFilePath = path.join(domainDir, 'index.html');
    
    // Check if the file exists
    try {
      await fs.access(htmlFilePath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: `Website for domain '${domainName}' not found. Please generate it first.`
      });
    }
    
    // Read current HTML code
    const currentCode = await fs.readFile(htmlFilePath, 'utf-8');
    
    // Call the modify function
    const result = await modifyWebsite(domainName, instruction, currentCode);
    
    if (result.success) {
      // Create URL path for client to access the modified website
      const urlPath = `/scraped_website/${domainName}/index.html`;
      
      return res.status(200).json({
        success: true,
        message: 'Website modified successfully',
        url: urlPath,
        code: result.htmlCode.substring(0, 200) + '...' // Send preview of the code
      });
    } else {
      return res.status(500).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error in modify route:', error);
    return res.status(500).json({
      success: false,
      message: `Server error: ${error.message}`,
      error: error.toString()
    });
  }
});

export default router; 