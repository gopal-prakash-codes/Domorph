import { screenshotToCode } from './screenshotToCode.js';

/**
 * Controller function to handle screenshot to code conversion requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const convertScreenshotToCode = async (req, res) => {
  try {
    // Check if file was provided
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No screenshot file provided'
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
    
    // Convert file buffer to base64
    const screenshotBase64 = req.file.buffer.toString('base64');
    
    console.log(`Processing screenshot for domain: ${domainName}`);
    
    // Call the screenshotToCode function
    const result = await screenshotToCode(screenshotBase64, domainName);
    
    if (result.success) {
      // Create URL path for client to access the generated website
      const urlPath = `/scraped_website/${domainName}/index.html`;
      
      return res.status(200).json({
        success: true,
        message: 'Website code generated successfully',
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
    console.error('Error in screenshot controller:', error);
    return res.status(500).json({
      success: false,
      message: `Server error: ${error.message}`,
      error: error.toString()
    });
  }
}; 