import express from 'express';
import { webScraping } from '../controllers/webScraping.js';
const router = express.Router();

router.post('/webScrape', webScraping);

export default router;
