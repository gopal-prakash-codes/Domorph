import express from 'express';
import multer from 'multer';
import { convertScreenshotToCode } from '../controllers/screenshotController.js';
import { modifyWebsite } from '../controllers/modifyWebsite.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { screenshotToCode } from '../controllers/screenshotToCode.js';
import { convertMultipleScreenshotsToCode } from '../controllers/multiPageScreenshotController.js';
import SSE from 'express-sse';

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

// Progress tracking using SSE
const progressTracker = {};

// Route to convert screenshot to code
router.post('/convert', upload.single('screenshot'), async (req, res) => {
  try {
    const screenshotBase64 = req.file.buffer.toString('base64');
    
    // Get custom domain name if provided
    const domainName = req.query.domainName || 'default';
    
    const result = await screenshotToCode(screenshotBase64, domainName);
    
    res.json(result);
  } catch (error) {
    console.error('Error in /convert route:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'An error occurred during conversion'
    });
  }
});

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

// Create an endpoint to handle multiple screenshots to code conversion
router.post('/convert-multi', upload.array('screenshots', 20), async (req, res) => {
  try {
    // Get domain name
    const domainName = req.query.domainName || 'default';
    
    // Initialize a new SSE instance for this domain
    if (!progressTracker[domainName]) {
      progressTracker[domainName] = new SSE();
    }
    
    // Extract file order information from request if it exists
    let fileOrder = [];
    if (req.body.fileOrder) {
      // If fileOrder is submitted as form fields, it will be in req.body
      if (Array.isArray(req.body.fileOrder)) {
        fileOrder = req.body.fileOrder;
      } else if (typeof req.body.fileOrder === 'string') {
        // If sent as a single string value, parse it
        try {
          fileOrder = JSON.parse(req.body.fileOrder);
        } catch (e) {
          // If it's not valid JSON, treat it as a single-item array
          fileOrder = [req.body.fileOrder];
        }
      }
    }
    
    console.log('Received file order:', fileOrder);
    
    // Start the processing in the background
    const processing = convertMultipleScreenshotsToCode({
      files: req.files,
      domainName,
      fileOrder,
      sendUpdate: (data) => {
        // Send SSE update
        if (progressTracker[domainName]) {
          progressTracker[domainName].send(data);
        }
      }
    });
    
    // Send an immediate response
    res.status(202).json({
      success: true,
      message: 'Processing started',
      totalFiles: req.files.length,
      statusUrl: `/api/screenshot/convert-multi/progress?domainName=${domainName}`
    });
    
    // Handle errors in the background process
    processing.catch(error => {
      console.error('Background processing error:', error);
      
      if (progressTracker[domainName]) {
        progressTracker[domainName].send({
          status: 'error',
          message: `Server error: ${error.message}`,
          error: error.toString()
        });
      }
    });
    
  } catch (error) {
    console.error('Error in /convert-multi route:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'An error occurred during multi-file conversion'
    });
  }
});

// Create an endpoint to track progress using Server-Sent Events (SSE)
router.get('/convert-multi/progress', (req, res) => {
  const domainName = req.query.domainName || 'default';
  
  // Initialize a new SSE instance for this domain if it doesn't exist
  if (!progressTracker[domainName]) {
    progressTracker[domainName] = new SSE();
  }
  
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no' // Disable buffering for Nginx
  });
  
  // Connect the client to the SSE stream
  progressTracker[domainName].init(req, res);
  
  // Clean up when the client disconnects
  req.on('close', () => {
    console.log(`Client disconnected from SSE stream for ${domainName}`);
  });
});

export default router; 