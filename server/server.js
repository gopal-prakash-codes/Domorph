import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import searchRoutes from './routes/search.js';
import agentRoutes from "./routes/agent-routes.js"
import screenshotRoutes from "./routes/screenshot-routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();
const app = express();
app.use(express.json());


app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Ensure required directories exist
const ensureDirectoriesExist = async () => {
  const clientDir = process.env.CLIENT_DIR_PATH || path.join(__dirname, '..', 'client', 'public');
  
  // Directory for storing website screenshots
  const screenshotDir = path.join(clientDir, 'screenshot_website');
  
  try {
    await fs.mkdir(screenshotDir, { recursive: true });
    console.log(`Ensured directory exists: ${screenshotDir}`);
  } catch (err) {
    console.error(`Error creating directory: ${err.message}`);
  }
};

// Set up routes
app.use('/api', searchRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/screenshot', screenshotRoutes);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
  res.send('Server is running properly');
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`  - POST /api/agent/chat - Send a message to the agent`);
  console.log(`  - POST /api/screenshot/convert - Convert screenshot to code`);
  console.log(`  - GET /api/screenshot/website-screenshots - Take screenshots of a website`);
  
  // Ensure directories exist after server starts
  await ensureDirectoriesExist();
});



