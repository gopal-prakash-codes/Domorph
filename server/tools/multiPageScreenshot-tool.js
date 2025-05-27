
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { screenshotToCode } from './screenshotToCode-tool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Process multiple screenshots to code conversion
 * @param {Object} options - Options for processing
 * @param {Array} options.files - Array of files to process
 * @param {string} options.domainName - Domain name for the website
 * @param {Function} options.sendUpdate - Callback for sending SSE updates
 * @param {Array} options.fileOrder - Optional array of indices to determine processing order
 */
export const convertMultipleScreenshotsToCode = async ({ files, domainName, sendUpdate, fileOrder = [] }) => {
  try {
    console.log(`Starting multi-page processing for domain: ${domainName}`);
    console.log(`Files to process: ${files.length}`);
    files.forEach((file, idx) => {
      console.log(`File ${idx + 1}: ${file.originalname}, size: ${file.size} bytes`);
    });
    
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
    
    // Determine the processing order
    let orderedFiles = [...files];
    
    // If fileOrder is provided and valid, use it to order the files
    if (fileOrder && fileOrder.length === files.length) {
      console.log("Using custom file order provided by user");
      // Create a new array with files in the specified order
      orderedFiles = fileOrder.map(index => files[parseInt(index, 10)]);
    } else {
      // Default ordering - put index file first if it exists
      console.log("Using default file order (index.html first)");
      const indexFile = files.find(file => {
        const pageName = path.parse(file.originalname).name.toLowerCase();
        return pageName === 'index';
      });
      
      // Then process all non-index files
      const nonIndexFiles = files.filter(file => {
        const pageName = path.parse(file.originalname).name.toLowerCase();
        return pageName !== 'index';
      });
      
      // Create a combined array with index file first (if it exists)
      orderedFiles = indexFile ? [indexFile, ...nonIndexFiles] : nonIndexFiles;
    }
    
    console.log(`Processing order: ${orderedFiles.map(f => f.originalname).join(', ')}`);
    const allFileNames = orderedFiles.map(f => f.originalname).join(', ');
    console.log(`All file names: ${allFileNames}`);
    
    for (let i = 0; i < orderedFiles.length; i++) {
      const file = orderedFiles[i];
      const originalName = file.originalname;
      const pageName = path.parse(originalName).name.toLowerCase();
      
      console.log(`Processing file ${i + 1}/${orderedFiles.length}: ${originalName}`);
      
      sendUpdate({
        status: 'processing',
        message: `Processing ${originalName}...`,
        currentFile: originalName,
        completedFiles,
        totalFiles: orderedFiles.length
      });
      
      // Convert file buffer to base64
      const screenshotBase64 = file.buffer.toString('base64');
      
      try {
        // Create HTML file with appropriate name
        const outputFileName = pageName === 'index' ? 'index.html' : `${pageName}.html`;
        console.log(`Creating ${outputFileName} from ${originalName}`);
        
        // Call the screenshotToCode function with the custom output file name
        const result = await screenshotToCode(screenshotBase64, domainName, allFileNames,outputFileName);
        
        if (result.success) {
          console.log(`Successfully generated ${outputFileName}`);
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
            totalFiles: orderedFiles.length,
            pageUrl: `/scraped_website/${domainName}/${outputFileName}`
          });
        } else {
          console.error(`Failed to generate ${outputFileName}: ${result.message}`);
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
            totalFiles: orderedFiles.length
          });
        }
      } catch (error) {
        console.error(`Exception while processing ${originalName}: ${error.message}`);
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
          totalFiles: orderedFiles.length
        });
      }
    }
    
    // Final status update
    console.log(`All pages processed for ${domainName}. Total: ${completedFiles.length} files.`);
    sendUpdate({
      status: 'finished',
      message: 'All pages processed',
      completedFiles,
      totalFiles: orderedFiles.length,
      websiteUrl: `/scraped_website/${domainName}/index.html`,
      results: fileResults
    });
    
    return {
      success: true,
      message: 'All pages processed successfully',
      completedFiles,
      totalFiles: orderedFiles.length,
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