import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import searchRoutes from './routes/search.js';
import agentRoutes from "./routes/agent-routes.js"
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

app.use('/api', searchRoutes);
app.use('/api/agent', agentRoutes);
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
  res.send('Server is running properly');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`  - POST /api/agent/chat - Send a message to the agent`);
});



