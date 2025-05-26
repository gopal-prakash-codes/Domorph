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
 * @param {string} targetFileName - Name of the file to modify (default: index.html)
 * @returns {Promise<Object>} - Result of the modification with updated HTML code
 */
export const modifyWebsite = async (domainName, instruction, currentCode, targetFileName = 'index.html') => {
  try {
    // Verify we have the API key
    const v0ApiKey = process.env.V0_API_KEY;
    if (!v0ApiKey) {
      throw new Error('V0_API_KEY environment variable is not set');
    }

    console.log(`🔄 Modifying website page ${targetFileName} for ${domainName} based on user instruction...`);
    
    // Create payload for the v0 API with improved system prompt
    const payload = {
      model: "v0-1.0-md",
      messages: [
        {
          role: "system",
          content: "You are an expert web developer. Your task is to modify existing HTML and Tailwind CSS code based on user instructions. Maintain the overall design consistency while implementing the requested changes. Return only the complete, valid HTML code with absolutely no explanations, comments about your changes, markdown formatting, or thinking process. Never include <Thinking> tags or any instructional text in your response. Do not wrap your response in code blocks or any other markdown formatting."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Here is the current HTML code for a website page (${targetFileName}):\n\n${currentCode}\n\nPlease modify this code according to the following instruction: ${instruction}`
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

    // Remove any <Thinking> blocks or similar instruction text
    htmlCode = htmlCode.replace(/<Thinking>[\s\S]*?<\/Thinking>/gi, '');
    
    // Remove any instruction paragraphs that may have been included
    const instructionRegex = /(I need to modify[\s\S]*?design\.)/i;
    htmlCode = htmlCode.replace(instructionRegex, '');
    
    // Check if HTML starts with proper doctype or html tag
    if (!htmlCode.trim().toLowerCase().startsWith('<!doctype') && 
        !htmlCode.trim().toLowerCase().startsWith('<html')) {
      // If not, it might be commentary or explanation - extract only the HTML portion
      const htmlStartIndex = htmlCode.indexOf('<!DOCTYPE') !== -1 ? 
                             htmlCode.indexOf('<!DOCTYPE') : 
                             htmlCode.indexOf('<html');
      
      if (htmlStartIndex !== -1) {
        htmlCode = htmlCode.substring(htmlStartIndex);
      }
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
    const fileNameWithoutExt = targetFileName.replace(/\.html$/, '');
    const versionFilePath = path.join(versionHistoryDir, `${fileNameWithoutExt}-${timestamp}.html`);
    
    // Copy the current file to version history
    try {
      await fs.copyFile(path.join(outputDir, targetFileName), versionFilePath);
    } catch (err) {
      console.warn(`Could not create backup of ${targetFileName}: ${err.message}`);
    }
    
    // Save the modified code to the target file
    const outputFilePath = path.join(outputDir, targetFileName);
    await fs.writeFile(outputFilePath, htmlCode);

    console.log(`✅ Modified code saved to ${outputFilePath}`);
    console.log(`✅ Previous version backed up to ${versionFilePath}`);

    return {
      success: true,
      message: `Website page ${targetFileName} modified successfully`,
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