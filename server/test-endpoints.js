/**
 * Simple test script to verify endpoints are working correctly
 * 
 * Run with Node.js:
 * node test-endpoints.js
 */

import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';

const API_BASE_URL = 'http://localhost:5002'; // Change this to match your server port

// Simple function to test if an endpoint is available
async function testEndpoint(method, endpoint) {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    console.log(`Testing ${method} ${url}...`);
    
    const response = await fetch(url, { method });
    const status = response.status;
    
    if (status === 200) {
      console.log(`✅ ${method} ${endpoint} - OK (${status})`);
    } else {
      console.log(`❌ ${method} ${endpoint} - Failed (${status})`);
      const text = await response.text();
      console.log(`Response: ${text.substring(0, 200)}...`);
    }
  } catch (error) {
    console.log(`❌ ${method} ${endpoint} - Error: ${error.message}`);
  }
}

// Test all endpoints
async function runTests() {
  // Test server root
  await testEndpoint('GET', '/');
  
  // Test list-pages endpoint
  await testEndpoint('GET', '/api/screenshot/list-pages?domainName=test');
  
  // Test convert-multi progress endpoint
  await testEndpoint('GET', '/api/screenshot/convert-multi/progress?domainName=test');
  
  console.log('\nAll tests completed.');
}

runTests().catch(console.error); 