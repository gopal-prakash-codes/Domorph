import { screenshotToCode } from './screenshotToCode.js';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Process multiple screenshots to code conversion
 * @param {Object} options - Options for processing
 * @param {Array} options.files - Array of files to process
 * @param {string} options.domainName - Domain name for the website
 * @param {Function} options.sendUpdate - Callback for sending SSE updates
 */
export const convertMultipleScreenshotsToCode = async ({ files, domainName, sendUpdate }) => {
  try {
    // Send initial message
    sendUpdate({
      status: 'started',
      message: 'Starting multi-page website generation',
      currentFile: '',
      completedFiles: [],
      totalFiles: files.length
    });
    
    // Ensure the client directory exists
    const clientDir = process.env.CLIENT_DIR_PATH || path.join(__dirname, "..", "..", "client", "public");
    
    // Ensure the website directory exists
    const websitesDir = path.join(clientDir, process.env.WEBSITE_DIR || "scraped_website");
    await fs.mkdir(websitesDir, { recursive: true });
    
    // Ensure the domain directory exists
    const outputDir = path.join(websitesDir, domainName);
    await fs.mkdir(outputDir, { recursive: true });
    
    // Process each file sequentially
    const completedFiles = [];
    const fileResults = {};
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const originalName = file.originalname;
      const pageName = path.parse(originalName).name.toLowerCase();
      
      // If this is not the first file and it's index.html, skip it (we already have one)
      if (i > 0 && pageName === 'index') {
        sendUpdate({
          status: 'skipped',
          message: `Skipped duplicate index page: ${originalName}`,
          currentFile: originalName,
          completedFiles,
          totalFiles: files.length
        });
        continue;
      }
      
      sendUpdate({
        status: 'processing',
        message: `Processing ${originalName}...`,
        currentFile: originalName,
        completedFiles,
        totalFiles: files.length
      });
      
      // Convert file buffer to base64
      const screenshotBase64 = file.buffer.toString('base64');
      
      try {
        // For non-index pages, we'll create HTML files with their respective names
        const outputFileName = pageName === 'index' ? 'index.html' : `${pageName}.html`;
        
        // Call the screenshotToCode function with the custom output file name
        const result = await screenshotToCode(screenshotBase64, domainName, outputFileName);
        
        if (result.success) {
          fileResults[originalName] = {
            success: true,
            filePath: result.filePath,
            url: `/scraped_website/${domainName}/${outputFileName}`
          };
          
          completedFiles.push({
            name: originalName,
            success: true,
            url: `/scraped_website/${domainName}/${outputFileName}`
          });
          
          sendUpdate({
            status: 'completed',
            message: `${originalName} completed successfully!`,
            currentFile: originalName,
            completedFiles,
            totalFiles: files.length,
            pageUrl: `/scraped_website/${domainName}/${outputFileName}`
          });
        } else {
          fileResults[originalName] = {
            success: false,
            error: result.message
          };
          
          completedFiles.push({
            name: originalName,
            success: false,
            error: result.message
          });
          
          sendUpdate({
            status: 'error',
            message: `Error processing ${originalName}: ${result.message}`,
            currentFile: originalName,
            completedFiles,
            totalFiles: files.length
          });
        }
      } catch (error) {
        fileResults[originalName] = {
          success: false,
          error: error.message
        };
        
        completedFiles.push({
          name: originalName,
          success: false,
          error: error.message
        });
        
        sendUpdate({
          status: 'error',
          message: `Error processing ${originalName}: ${error.message}`,
          currentFile: originalName,
          completedFiles,
          totalFiles: files.length
        });
      }
    }
    
    // Final status update
    sendUpdate({
      status: 'finished',
      message: 'All pages processed',
      completedFiles,
      totalFiles: files.length,
      websiteUrl: `/scraped_website/${domainName}/index.html`,
      results: fileResults
    });
    
    return {
      success: true,
      message: 'All pages processed successfully',
      completedFiles,
      totalFiles: files.length,
      websiteUrl: `/scraped_website/${domainName}/index.html`,
      results: fileResults
    };
    
  } catch (error) {
    console.error('Error in multi-page screenshot controller:', error);
    
    // Send error update
    sendUpdate({
      status: 'error',
      message: `Server error: ${error.message}`,
      error: error.toString()
    });
    
    throw error;
  }
}; 