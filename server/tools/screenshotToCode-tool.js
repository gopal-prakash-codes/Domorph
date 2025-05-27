import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const screenshotToCode = async (screenshotBase64, domainName, allFileNames,outputFileName = 'index.html') => {
  try {
    // Verify we have the API key
    const v0ApiKey = process.env.V0_API_KEY;
    if (!v0ApiKey) {
      throw new Error('V0_API_KEY environment variable is not set');
    }

    console.log(`🖼️ Converting screenshot to code for ${outputFileName}...`);
    
    // Clean up file names to extract page names
    const availablePages = allFileNames
      .split(",")
      .map(fileName => fileName.trim())
      .filter(fileName => fileName.endsWith('.png'))
      .map(fileName => {
        // Extract just the page name without extension
        const pageName = path.parse(fileName).name.toLowerCase();
        return pageName;
      });
    
    console.log("Available pages for navigation:", availablePages);
    
    // Format the base64 data properly (ensure it has the correct data URI prefix)
    // The v0 API expects base64 data without the data URI prefix
    let formattedBase64 = screenshotBase64;
    if (screenshotBase64.includes(',')) {
      formattedBase64 = screenshotBase64.split(',')[1];
    }
    
    // Create payload for the v0 API
    const payload = {
      model: "v0-1.0-md",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Generate clean, responsive HTML and Tailwind CSS code that recreates this website design exactly as shown in the image. Include all visual elements, layout, colors, fonts, and spacing. Make sure the code is production-ready, responsive, and follows best practices. Only return the complete HTML file with the Tailwind CSS included.

        IMPORTANT NAVIGATION
        - The following pages are available in this website: ${availablePages.join(', ')}
        - When creating anchor tags (<a>) with navigation text, update the href attributes as follows:
          * If the anchor text matches any available page name (case insensitive), set href="/scraped_website/${domainName}/[pagename].html"
          * For example, if the anchor text is "About" and "about" is in available pages, set href="/scraped_website/${domainName}/about.html"
          * If the anchor text is "Home" or "Index", set href="/scraped_website/${domainName}/index.html"
          * For links that don't match available pages, use href="#"
        - Make sure the navigation works correctly across all pages of the website
`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/png;base64,${formattedBase64}`
              }
            }
          ]
        }
      ]
    };

    console.log('📦 Sending request to v0 API...');
    
    // Call the v0 API
    const response = await fetch('https://api.v0.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${v0ApiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error Response:', errorText);
      throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Received response from v0 API');
    
    // Extract the HTML code from the response
    const content = data.choices[0].message.content;
    
    // Extract the HTML code (it might be wrapped in a code block)
    let htmlCode = content;
    
    // Check if the content contains markdown code blocks
    const codeBlockRegex = /```(?:html)?\n([\s\S]*?)```/;
    const match = content.match(codeBlockRegex);
    
    if (match && match[1]) {
      htmlCode = match[1];
    }

    // Ensure the client directory exists
    const clientDir = process.env.CLIENT_DIR_PATH || path.join(__dirname, "..", "..", "client", "public");
    
    // Ensure the website directory exists
    const websitesDir = path.join(clientDir, process.env.WEBSITE_DIR || "scraped_website");
    await fs.mkdir(websitesDir, { recursive: true });
    
    // Ensure the domain directory exists
    const outputDir = path.join(websitesDir, domainName);
    await fs.mkdir(outputDir, { recursive: true });

    // Save the generated code to the specified file
    const outputFilePath = path.join(outputDir, outputFileName);
    await fs.writeFile(outputFilePath, htmlCode);

    console.log(`✅ Generated code saved to ${outputFilePath}`);

    return {
      success: true,
      message: `Website code generated successfully for ${outputFileName}`,
      filePath: outputFilePath,
      htmlCode
    };
  } catch (error) {
    console.error('❌ Error converting screenshot to code:', error);
    return {
      success: false,
      message: `Error converting screenshot to code: ${error.message}`,
      error: error.toString()
    };
  }
}; 