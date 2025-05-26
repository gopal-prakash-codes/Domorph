import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Modifies a generated website based on user's natural language instructions
 * using Vercel's v0 API
 * 
 * @param {string} domainName - Domain name of the website to modify
 * @param {string} instruction - User's natural language instruction for modifications
 * @param {string} currentCode - Current HTML code of the website
 * @returns {Promise<Object>} - Result of the modification with updated HTML code
 */
export const modifyWebsite = async (domainName, instruction, currentCode) => {
  try {
    // Verify we have the API key
    const v0ApiKey = process.env.V0_API_KEY;
    if (!v0ApiKey) {
      throw new Error('V0_API_KEY environment variable is not set');
    }

    console.log(`🔄 Modifying website for ${domainName} based on user instruction...`);
    
    // Create payload for the v0 API
    const payload = {
      model: "v0-1.0-md",
      messages: [
        {
          role: "system",
          content: "You are an expert web developer. Your task is to modify existing HTML and Tailwind CSS code based on user instructions. Maintain the overall design consistency while implementing the requested changes. Return only the complete updated HTML file with no markdown formatting or explanations."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Here is the current HTML code for a website:\n\n${currentCode}\n\nPlease modify this code according to the following instruction: ${instruction}`
            }
          ]
        }
      ]
    };

    console.log('📦 Sending modification request to v0 API...');
    
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
    console.log('✅ Received modification response from v0 API');
    
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
    
    // Ensure the domain directory exists
    const outputDir = path.join(websitesDir, domainName);
    
    // Create version history directory if it doesn't exist
    const versionHistoryDir = path.join(outputDir, 'versions');
    await fs.mkdir(versionHistoryDir, { recursive: true });
    
    // Save the current version to version history before replacing
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const versionFilePath = path.join(versionHistoryDir, `index-${timestamp}.html`);
    await fs.copyFile(path.join(outputDir, 'index.html'), versionFilePath);
    
    // Save the modified code to the index.html file
    const outputFilePath = path.join(outputDir, 'index.html');
    await fs.writeFile(outputFilePath, htmlCode);

    console.log(`✅ Modified code saved to ${outputFilePath}`);
    console.log(`✅ Previous version backed up to ${versionFilePath}`);

    return {
      success: true,
      message: 'Website modified successfully',
      filePath: outputFilePath,
      versionFilePath,
      htmlCode
    };
  } catch (error) {
    console.error('❌ Error modifying website code:', error);
    return {
      success: false,
      message: `Error modifying website code: ${error.message}`,
      error: error.toString()
    };
  }
}; 