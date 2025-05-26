import express from 'express';
import multer from 'multer';
import { convertScreenshotToCode, websiteScreenshots } from '../controllers/screenshotController.js';
import { convertMultipleScreenshotsToCode } from '../controllers/multiPageScreenshotController.js';
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

// Create a map to store the SSE connections by domain name
const domainConnections = new Map();

// Route to convert screenshot to code
router.post('/convert', upload.single('screenshot'), convertScreenshotToCode);

// Route to convert multiple screenshots to code
router.post('/convert-multi', upload.array('screenshots', 10), async (req, res) => {
  try {
    // Check if files were provided
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No screenshot files provided'
      });
    }
    
    // Get domain name from query params
    const { domainName } = req.query;
    
    if (!domainName) {
      return res.status(400).json({
        success: false,
        message: 'Domain name is required'
      });
    }
    
    // Validate domain name (only alphanumeric and hyphens)
    if (!/^[a-z0-9-]+$/.test(domainName)) {
      return res.status(400).json({
        success: false,
        message: 'Domain name must contain only lowercase letters, numbers, and hyphens'
      });
    }
    
    // Start the conversion process in the background
    const files = req.files;
    
    // If we have a connection waiting, use it to send updates
    process.nextTick(async () => {
      try {
        // Process the files and send updates through SSE
        await convertMultipleScreenshotsToCode({
          files,
          domainName,
          sendUpdate: (data) => {
            const connections = domainConnections.get(domainName);
            if (connections && connections.length > 0) {
              connections.forEach(conn => {
                conn.write(`data: ${JSON.stringify(data)}\n\n`);
              });
            }
          }
        });
      } catch (error) {
        console.error('Background processing error:', error);
        const connections = domainConnections.get(domainName);
        if (connections && connections.length > 0) {
          connections.forEach(conn => {
            conn.write(`data: ${JSON.stringify({
              status: 'error',
              message: `Server error: ${error.message}`,
              error: error.toString()
            })}\n\n`);
            
            // Close connections on error
            conn.end();
          });
          domainConnections.delete(domainName);
        }
      }
    });
    
    // Return success response immediately
    return res.status(200).json({
      success: true,
      message: 'Processing started. Connect to progress endpoint for updates.'
    });
    
  } catch (error) {
    console.error('Error in multi-screenshot upload:', error);
    return res.status(500).json({
      success: false,
      message: `Server error: ${error.message}`,
      error: error.toString()
    });
  }
});

// Route for SSE progress updates
router.get('/convert-multi/progress', (req, res) => {
  try {
    const { domainName } = req.query;
    
    if (!domainName) {
      return res.status(400).json({
        success: false,
        message: 'Domain name is required'
      });
    }
    
    // Set up SSE connection
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    
    // Send initial message
    res.write(`data: ${JSON.stringify({
      status: 'connected',
      message: 'Waiting for processing to start',
      domainName
    })}\n\n`);
    
    // Store the connection for this domain
    if (!domainConnections.has(domainName)) {
      domainConnections.set(domainName, []);
    }
    domainConnections.get(domainName).push(res);
    
    // Handle client disconnect
    req.on('close', () => {
      const connections = domainConnections.get(domainName);
      if (connections) {
        const index = connections.indexOf(res);
        if (index !== -1) {
          connections.splice(index, 1);
        }
        if (connections.length === 0) {
          domainConnections.delete(domainName);
        }
      }
      res.end();
    });
    
  } catch (error) {
    console.error('Error setting up SSE:', error);
    return res.status(500).json({
      success: false,
      message: `Server error: ${error.message}`,
      error: error.toString()
    });
  }
});

// Route to take screenshots of a website
router.get('/website-screenshots', websiteScreenshots);

// Route to modify generated website
router.post('/modify', async (req, res) => {
  try {
    const { domainName, instruction, fileName } = req.body;
    
    if (!domainName || !instruction) {
      return res.status(400).json({ 
        success: false, 
        message: 'Domain name and instruction are required'
      });
    }
    
    // Use fileName if provided, or default to index.html
    const targetFileName = fileName || 'index.html';
    
    // Get the current HTML file content
    const clientDir = process.env.CLIENT_DIR_PATH || path.join(__dirname, "..", "..", "client", "public");
    const websitesDir = path.join(clientDir, process.env.WEBSITE_DIR || "scraped_website");
    const domainDir = path.join(websitesDir, domainName);
    const htmlFilePath = path.join(domainDir, targetFileName);
    
    // Check if the file exists
    try {
      await fs.access(htmlFilePath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: `File '${targetFileName}' for domain '${domainName}' not found. Please generate it first.`
      });
    }
    
    // Read current HTML code
    const currentCode = await fs.readFile(htmlFilePath, 'utf-8');
    
    // Call the modify function
    const result = await modifyWebsite(domainName, instruction, currentCode, targetFileName);
    
    if (result.success) {
      // Create URL path for client to access the modified website
      const urlPath = `/scraped_website/${domainName}/${targetFileName}`;
      
      return res.status(200).json({
        success: true,
        message: `Website page ${targetFileName} modified successfully`,
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

// Route to list pages in a domain directory
router.get('/list-pages', async (req, res) => {
  try {
    const { domainName } = req.query;
    
    if (!domainName) {
      return res.status(400).json({
        success: false,
        message: 'Domain name is required'
      });
    }
    
    // Get the domain directory
    const clientDir = process.env.CLIENT_DIR_PATH || path.join(__dirname, "..", "..", "client", "public");
    const websitesDir = path.join(clientDir, process.env.WEBSITE_DIR || "scraped_website");
    const domainDir = path.join(websitesDir, domainName);
    
    // Check if the directory exists
    try {
      await fs.access(domainDir);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: `Domain '${domainName}' not found`
      });
    }
    
    // List files in the directory
    const files = await fs.readdir(domainDir);
    
    // Filter for HTML files only and exclude the versions directory
    const htmlFiles = files
      .filter(file => file.endsWith('.html') || (file !== 'versions' && !file.includes('.')))
      .map(file => {
        // Format the display name based on the filename
        let pageName = path.parse(file).name;
        if (pageName === 'index') {
          pageName = 'Home';
        } else {
          // Convert kebab-case to Title Case
          pageName = pageName
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        }
        
        return {
          name: pageName,
          path: file.endsWith('.html') ? file : `${file}.html`
        };
      });
    
    return res.status(200).json({
      success: true,
      pages: htmlFiles
    });
  } catch (error) {
    console.error('Error listing domain pages:', error);
    return res.status(500).json({
      success: false,
      message: `Server error: ${error.message}`,
      error: error.toString()
    });
  }
});

export default router; 