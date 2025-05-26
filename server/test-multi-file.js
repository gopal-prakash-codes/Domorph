/**
 * Test script to simulate multi-file uploads
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { convertMultipleScreenshotsToCode } from './controllers/multiPageScreenshotController.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Verify required environment variables
if (!process.env.V0_API_KEY) {
  console.error('Error: V0_API_KEY environment variable is not set');
  console.error('Create a .env file with V0_API_KEY=your_key_here');
  process.exit(1);
}

// Create mock files for testing
async function createMockFiles() {
  // Make sure the test directory exists
  const testDir = path.join(__dirname, 'test');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
    
    // Create sample images if they don't exist
    console.log('Creating sample test images...');
    
    // Create a simple 1x1 pixel PNG for testing
    const samplePixelBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
    
    fs.writeFileSync(path.join(testDir, 'index.png'), samplePixelBuffer);
    fs.writeFileSync(path.join(testDir, 'about.png'), samplePixelBuffer);
  }

  // Create a simple array with two mock files
  const files = [
    {
      originalname: 'index.png',
      buffer: fs.readFileSync(path.join(__dirname, 'test', 'index.png')),
      size: fs.statSync(path.join(__dirname, 'test', 'index.png')).size
    },
    {
      originalname: 'about.png',
      buffer: fs.readFileSync(path.join(__dirname, 'test', 'about.png')),
      size: fs.statSync(path.join(__dirname, 'test', 'about.png')).size
    }
  ];
  
  return files;
}

// Test the multi-page controller
async function testMultiPageController() {
  console.log('Starting multi-page controller test...');
  
  try {
    // Create a test domain
    const domainName = 'test-multi-' + Date.now();
    
    // Create mock files
    const files = await createMockFiles();
    
    // Create a mock sendUpdate function
    const sendUpdate = (data) => {
      console.log('Update:', JSON.stringify(data, null, 2));
    };
    
    console.log(`Testing with ${files.length} files for domain: ${domainName}`);
    
    // Run the controller
    const result = await convertMultipleScreenshotsToCode({
      files,
      domainName,
      sendUpdate
    });
    
    console.log('Test completed successfully!');
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testMultiPageController().catch(console.error); 