import express from 'express';
import { webScraping } from '../controllers/webScraping.js';
import { promptToLlm } from '../controllers/promptToLlm.js';
const router = express.Router();

router.get('/webScrape', webScraping);
router.post('/prompttollm', promptToLlm);

export default router;
