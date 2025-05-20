import express from 'express';
import { webScraping } from '../controllers/webScraping.js';
import { promptToLlm } from '../controllers/promptToLlm.js';
const router = express.Router();


router.get('/test-cors', (req, res) => {
    res.json({
        message: 'CORS test endpoint is working',
        headers: req.headers,
        origin: req.headers.origin || 'No origin header',
        host: req.headers.host,
        method: req.method
    });
});

router.get('/webScrape', webScraping);
router.post('/prompttollm', promptToLlm);

export default router;
