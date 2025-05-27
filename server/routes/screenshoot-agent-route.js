import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { processUserMessage, subscribeToProgress } from '../websiteFlow.js';

const router = express.Router();

// Store active SSE connections
const connections = {};

// API endpoint for sending messages to the agent
router.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // Generate a session ID if not provided
    const sessionId = req.body.sessionId || uuidv4();
    console.log(`Processing message for session ${sessionId}: ${message}`);
    
    // Process the message through our website flow
    const result = await processUserMessage(message, sessionId);
    
    // Return the result
    res.json({
      sessionId,
      messages: result.messages
    });
  } catch (error) {
    console.error('Error processing message:', error);
    res.status(500).json({ error: 'Failed to process message: ' + error.message });
  }
});

// SSE endpoint for progress updates
router.get('/progress/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  
  if (!sessionId) {
    return res.status(400).json({ error: 'Session ID is required' });
  }
  
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', sessionId })}\n\n`);
  
  // Store the connection
  connections[sessionId] = res;
  
  // Function to send updates to this client
  const sendUpdate = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };
  
  // Subscribe to progress updates for this session
  const unsubscribe = subscribeToProgress(sessionId, sendUpdate);
  
  // Handle client disconnect
  req.on('close', () => {
    unsubscribe();
    delete connections[sessionId];
    console.log(`Client disconnected: ${sessionId}`);
  });
});

export default router;
