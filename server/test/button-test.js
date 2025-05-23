import { intelligentHtmlUpdate } from '../controllers/tools.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import assert from 'assert';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test domain name
const TEST_DOMAIN = 'test-domain';

// Create test directory and HTML file
async function setupTest() {
  console.log('Setting up test environment...');
  
  // Create test directory structure
  const baseDir = path.join(process.cwd(), "..", "client", "public", "scraped_website", TEST_DOMAIN);
  await fs.mkdir(baseDir, { recursive: true });
  
  // Create a simple HTML file for testing
  const testHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Button Test Page</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
    .container { max-width: 800px; margin: 0 auto; }
    .btn { 
      display: inline-block;
      padding: 10px 15px;
      background-color: #4285f4;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
    }
    .btn-secondary {
      background-color: #34a853;
    }
    .header { margin-bottom: 20px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Button Test Page</h1>
      <p>This page is used to test button modifications and creation</p>
    </div>
    
    <div class="content">
      <h2>Existing Buttons</h2>
      <div class="button-container">
        <button class="btn">Submit</button>
        <button class="btn btn-secondary">Cancel</button>
        <a href="#" class="btn">Learn More</a>
      </div>
      
      <div class="form-section">
        <h2>Contact Form</h2>
        <form>
          <div>
            <label for="name">Name:</label>
            <input type="text" id="name" name="name">
          </div>
          <div>
            <label for="email">Email:</label>
            <input type="email" id="email" name="email">
          </div>
          <div>
            <label for="message">Message:</label>
            <textarea id="message" name="message"></textarea>
          </div>
          <div class="form-buttons">
            <button type="submit" class="btn">Contact</button>
          </div>
        </form>
      </div>
      
      <div class="login-section">
        <h2>Account Access</h2>
        <div class="auth-buttons">
          <button class="btn">Sign In</button>
          <a href="#" class="btn btn-secondary">Create Account</a>
        </div>
      </div>
    </div>
    
    <div class="footer">
      <p>&copy; 2023 Button Test Page</p>
    </div>
  </div>
</body>
</html>
  `;
  
  const testFilePath = path.join(baseDir, 'index.html');
  await fs.writeFile(testFilePath, testHtml);
  
  console.log(`Test file created at: ${testFilePath}`);
  return testFilePath;
}

// Run tests
async function runTests() {
  try {
    // Setup test environment
    const testFilePath = await setupTest();
    
    console.log('\n----- RUNNING BUTTON TESTS -----\n');
    
    // Test 1: Modify existing button color
    console.log('\nTest 1: Modify button color');
    const test1Result = await intelligentHtmlUpdate('index.html', 'make the Submit button red', TEST_DOMAIN);
    console.log('Result:', test1Result.success ? 'PASS' : 'FAIL', test1Result.message);
    
    // Test 2: Change button text
    console.log('\nTest 2: Change button text');
    const test2Result = await intelligentHtmlUpdate('index.html', 'change the Contact button text to "Send Message"', TEST_DOMAIN);
    console.log('Result:', test2Result.success ? 'PASS' : 'FAIL', test2Result.message);
    
    // Test 3: Make button more prominent
    console.log('\nTest 3: Make button more prominent');
    const test3Result = await intelligentHtmlUpdate('index.html', 'make the Cancel button more prominent', TEST_DOMAIN);
    console.log('Result:', test3Result.success ? 'PASS' : 'FAIL', test3Result.message);
    
    // Test 4: Create a new button
    console.log('\nTest 4: Create a new button');
    const test4Result = await intelligentHtmlUpdate('index.html', 'add a new button that says "Subscribe"', TEST_DOMAIN);
    console.log('Result:', test4Result.success ? 'PASS' : 'FAIL', test4Result.message);
    
    // Test 5: Create a button with specific functionality
    console.log('\nTest 5: Create a button with specific functionality');
    const test5Result = await intelligentHtmlUpdate('index.html', 'add a download button next to the Contact form', TEST_DOMAIN);
    console.log('Result:', test5Result.success ? 'PASS' : 'FAIL', test5Result.message);
    
    // Test 6: Button variation matching (Login should match Sign In)
    console.log('\nTest 6: Button variation matching');
    const test6Result = await intelligentHtmlUpdate('index.html', 'make the Login button green', TEST_DOMAIN);
    console.log('Result:', test6Result.success ? 'PASS' : 'FAIL', test6Result.message);
    
    // Test 7: Update all buttons (no specific button mentioned)
    console.log('\nTest 7: Update all buttons');
    const test7Result = await intelligentHtmlUpdate('index.html', 'make all buttons larger', TEST_DOMAIN);
    console.log('Result:', test7Result.success ? 'PASS' : 'FAIL', test7Result.message);
    
    // Test 8: Create button with inline CSS
    console.log('\nTest 8: Create button with inline CSS');
    const test8Result = await intelligentHtmlUpdate('index.html', 'add a newsletter button with blue background', TEST_DOMAIN);
    console.log('Result:', test8Result.success ? 'PASS' : 'FAIL', test8Result.message);
    
    // Read the final HTML to verify changes
    const updatedHtml = await fs.readFile(testFilePath, 'utf-8');
    console.log('\nFinal HTML verification:');
    console.log('Contains "red" color:', updatedHtml.includes('red'));
    console.log('Contains "Send Message":', updatedHtml.includes('Send Message'));
    console.log('Contains "Subscribe":', updatedHtml.includes('Subscribe'));
    console.log('Contains "download":', updatedHtml.includes('download'));
    console.log('Contains "green" color:', updatedHtml.includes('green'));
    console.log('Contains "newsletter":', updatedHtml.includes('newsletter'));
    console.log('Contains inline style attribute:', updatedHtml.includes('style='));
    
    // Check if Tailwind classes were used (should not be)
    const containsTailwind = updatedHtml.includes('bg-blue') || 
                            updatedHtml.includes('text-white') || 
                            updatedHtml.includes('px-') || 
                            updatedHtml.includes('py-');
    console.log('Contains Tailwind classes (should be false):', containsTailwind);
    
    console.log('\n----- ALL TESTS COMPLETED -----\n');
    
  } catch (error) {
    console.error('Error running tests:', error);
  }
}

// Run the tests
runTests(); 