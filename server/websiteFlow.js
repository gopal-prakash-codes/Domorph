import { Anthropic } from '@anthropic-ai/sdk';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { screenshotSaver } from './tools/screenshotSaver-tool.js';
import { convertMultipleScreenshotsToCode } from './tools/multiPageScreenshot-tool.js';
import { modifyWebsite } from './tools/modifyWebsite-tool.js';
import { EventEmitter } from 'events';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_URL = process.env.CLIENT_URL;
// Initialize Anthropic client
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || 'missing-api-key',
});

// Create EventEmitter for SSE updates
const progressEmitter = new EventEmitter();

// Tool definitions
const tools = [
  {
    name: 'take_screenshots',
    description: 'Takes screenshots of a website using the provided URL',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The URL of the website to take screenshots of'
        }
      },
      required: ['url']
    }
  },
  {
    name: 'convert_screenshots_to_code',
    description: 'Converts screenshots to website code',
    parameters: {
      type: 'object',
      properties: {
        domainName: {
          type: 'string',
          description: 'The domain name of the website'
        },
        files: {
          type: 'array',
          items: {
            type: 'object'
          },
          description: 'Array of screenshot files to convert'
        }
      },
      required: ['domainName', 'files']
    }
  },
  {
    name: 'modify_website',
    description: 'Modifies a website based on natural language instructions',
    parameters: {
      type: 'object',
      properties: {
        domainName: {
          type: 'string',
          description: 'The domain name of the website'
        },
        instruction: {
          type: 'string',
          description: 'Natural language instruction for the modification'
        },
        targetFileName: {
          type: 'string',
          description: 'Name of the file to modify (default: index.html)'
        }
      },
      required: ['domainName', 'instruction']
    }
  }
];

// State interface and session storage
class State {
  constructor() {
    this.domainName = null;
    this.messages = [];
    this.screenshots = [];
    this.websiteCreated = false;
    this.sessionId = null;
  }
}

// In-memory session storage
const sessions = {};

// Function to extract domain name from URL
const extractDomainName = (url) => {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, '');
  } catch (error) {
    console.error('Error extracting domain:', error);
    return 'unknown-domain';
  }
};

// Function to process user message
export async function processUserMessage(userMessage, sessionId) {
  console.log(`📩 Processing message for session ${sessionId}: ${userMessage}`);
  
  // Initialize or retrieve state
  let state = sessions[sessionId] || new State();
  state.sessionId = sessionId;
  
  // Add user message to state
  state.messages.push({
    role: 'user',
    content: userMessage
  });
  
  // Check if input is a URL
  const urlPattern = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;
  const isUrl = urlPattern.test(userMessage);

  try {
    let result;
    
    if (isUrl) {
      // URL detected - proceed with screenshot and code generation flow
      console.log('🔗 URL detected:', userMessage);
      result = await handleUrlInput(state, userMessage);
    } else if (state.websiteCreated) {
      // Website exists - handle modification request
      console.log('🛠️ Modification instruction detected');
      result = await handleModificationRequest(state, userMessage);
    } else {
      // General query - use Claude to respond
      console.log('💬 Handling general query');
      result = await handleGeneralQuery(state);
    }
    
    // Save state to session storage
    sessions[sessionId] = result;
    return result;
  } catch (error) {
    console.error('Error processing message:', error);
    state.messages.push({
      role: 'assistant',
      content: `I encountered an error: ${error.message}`
    });
    sessions[sessionId] = state;
    return state;
  }
}

// Function to handle URL input
async function handleUrlInput(state, url) {
  try {
    // Extract domain name
    const domainName = extractDomainName(url);
    state.domainName = domainName;
    
    // Step 1: Take screenshots
    console.log('📸 Taking screenshots...');
    
    // Create sendUpdate function for SSE
    const sendUpdate = (data) => {
      console.log('Screenshot progress:', data);
      progressEmitter.emit(`progress_${state.sessionId}`, data);
    };
    
    // Call the screenshotSaver tool
    await screenshotSaver(url);
    
    // Notify user
    state.messages.push({
      role: 'assistant',
      content: `I've analyzed the full design layout, including sections, colors, and fonts of ${url}. Now I'll convert it into code.`
    });
    
    // Step 2: Convert screenshots to code
    console.log('🔄 Converting screenshots to code...');
    
    // Get screenshots directory path
    const clientDir = process.env.CLIENT_DIR_PATH || path.join(__dirname, '..', 'client', 'public');
    const screenshotsDir = path.join(clientDir, 'screenshots', domainName);
    
    // Read the screenshot files
    const files = await fs.readdir(screenshotsDir);
    const screenshotFiles = files.filter(file => file.endsWith('.png'));
    
    console.log(`📸 Found ${screenshotFiles.length} screenshots`);
    
    // Prepare file objects
    const screenshots = await Promise.all(screenshotFiles.map(async (filename) => {
      const filePath = path.join(screenshotsDir, filename);
      const buffer = await fs.readFile(filePath);
      
      return {
        originalname: filename,
        buffer,
        size: buffer.length
      };
    }));
    
    // Call the convertMultipleScreenshotsToCode tool
    const result = await convertMultipleScreenshotsToCode({
      files: screenshots,
      domainName,
      sendUpdate
    });
    
    console.log('🔄 Conversion result:', result.success ? 'Success' : 'Failed');
    
    // Store website creation status
    state.websiteCreated = result.success;
    if (result.success) {
      // Store domain name in state for future interactions
      state.domainName = domainName;
    }
    // Final response
    state.messages.push({
      role: 'assistant',
      content: result.success 
        ? `I've successfully created your website! You can view it at ${FRONTEND_URL}/scraped_website/${domainName}/index.html Feel free to tell me if you'd like to make any modifications.` 
        : `I encountered an error while converting screenshots to code: ${result.message}`
    });
    
    return state;
  } catch (error) {
    console.error('Error in URL handling flow:', error);
    
    // Error response
    state.messages.push({
      role: 'assistant',
      content: `I encountered an error while processing your URL: ${error.message}`
    });
    
    return state;
  }
}

// Function to handle modification request
async function handleModificationRequest(state, instruction) {
  try {
    // Get domain name from state
    const domainName = state.domainName;
    
    console.log('✏️ Modifying website for domain:', domainName);
    
    // Get the current HTML code
    const clientDir = process.env.CLIENT_DIR_PATH || path.join(__dirname, '..', 'client', 'public');
    const websiteDir = path.join(clientDir, 'scraped_website', domainName);
    const targetFileName = 'index.html'; // Default to index.html
    const filePath = path.join(websiteDir, targetFileName);
    
    const currentCode = await fs.readFile(filePath, 'utf-8');
    
    // Call the modifyWebsite tool
    const result = await modifyWebsite(
      domainName,
      instruction,
      currentCode,
      targetFileName
    );
    
    console.log('✏️ Modification result:', result.success ? 'Success' : 'Failed');
    // Response to user
    state.messages.push({
      role: 'assistant',
      content: result.success 
        ? `I've updated your website based on your instructions. You can view the updated version at ${FRONTEND_URL}/scraped_website/${domainName}/${targetFileName} Is there anything else you'd like to change?` 
        : `I encountered an error while modifying the website: ${result.message}`
    });
    
    return state;
  } catch (error) {
    console.error('Error in modification flow:', error);
    
    // Error response
    state.messages.push({
      role: 'assistant',
      content: `I encountered an error while modifying the website: ${error.message}`
    });
    
    return state;
  }
}

// Function to handle general queries using Claude
async function handleGeneralQuery(state) {
  try {
    console.log('💬 Handling general query with Claude');
    
    // Use Claude to generate a response
    const response = await client.messages.create({
      model: 'claude-3-7-sonnet-20240307',
      max_tokens: 1000,
      messages: [
        {
          role: 'system',
          content: `You are Domorph, a helpful website building assistant. You help users build websites by cloning existing websites or making modifications to created websites.

To create a website, a user can provide a URL, and you will take screenshots and convert them to code.
After creating a website, you can modify it based on the user's instructions.

IMPORTANT: For URLs, tell the user you'll create a website based on that URL.
For modification requests after a website has been created, tell the user you'll implement their changes.
For general questions, be helpful and focus on web development topics.`
        },
        ...state.messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      ]
    });
    
    // Add Claude's response to state
    state.messages.push({
      role: 'assistant',
      content: response.content[0].text
    });
    
    return state;
  } catch (error) {
    console.error('Error in general query flow:', error);
    
    // Error response
    state.messages.push({
      role: 'assistant',
      content: `I'm sorry, but I encountered an error while processing your request. Please try again.`
    });
    
    return state;
  }
}

// Function to subscribe to progress updates
export function subscribeToProgress(sessionId, callback) {
  const eventName = `progress_${sessionId}`;
  progressEmitter.on(eventName, callback);
  
  return () => {
    progressEmitter.off(eventName, callback);
  };
}
