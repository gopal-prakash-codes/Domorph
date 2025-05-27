import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import searchRoutes from './routes/search.js';
import agentRoutes from "./routes/agent-routes.js"
import screenshotRoutes from "./routes/screenshot-routes.js";
import screenshotAgentRoutes from "./routes/screenshoot-agent-route.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();
const app = express();
app.use(express.json());

// Initialize connections for SSE (Server-Sent Events)
app.locals.connections = {};

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
  
  // Directory for storing generated websites
  const scrapedWebsiteDir = path.join(clientDir, process.env.WEBSITE_DIR || 'scraped_website');
  
  try {
    await fs.mkdir(screenshotDir, { recursive: true });
    console.log(`Ensured directory exists: ${screenshotDir}`);
    
    await fs.mkdir(scrapedWebsiteDir, { recursive: true });
    console.log(`Ensured directory exists: ${scrapedWebsiteDir}`);
  } catch (err) {
    console.error(`Error creating directory: ${err.message}`);
  }
};

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});


// Set up routes
app.use('/api', searchRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/screenshot', screenshotRoutes);
app.use('/api/website', screenshotAgentRoutes);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, '..', 'client', 'public')));
app.get('/', (req, res) => {
  res.send('Server is running properly');
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`API Base URL: http://localhost:${PORT}`);
  console.log(`  - POST /api/agent/chat - Send a message to the agent`);
  console.log(`  - POST /api/screenshot/convert - Convert screenshot to code`);
  console.log(`  - POST /api/screenshot/convert-multi - Convert multiple screenshots to multi-page website`);
  console.log(`  - GET /api/screenshot/convert-multi/progress?domainName={domain} - SSE endpoint for progress updates`);
  console.log(`  - GET /api/screenshot/website-screenshots - Take screenshots of a website`);
  console.log(`  - GET /api/screenshot/list-pages?domainName={domain} - List pages in a domain`);
  console.log(`  - POST /api/website/chat - Send a message to the website agent`);
  console.log(`  - GET /api/website/progress/:sessionId - SSE endpoint for website progress updates`);
  
  // Ensure directories exist after server starts
  await ensureDirectoriesExist();
});



