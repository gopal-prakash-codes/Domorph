import express from 'express';
import { webScraping } from '../controllers/webScraping.js';
// import { newPromptToLlm } from '../controllers/newPromptToLlm.js';
import { uiModifierAgent } from '../controllers/uiModifierAgent.js';
import { downloadZip } from '../controllers/downloadZip.js';
import { webEnhance } from '../controllers/webEnhance.js';

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
router.post('/modify-ui', uiModifierAgent);
router.post('/webenhance', webEnhance);
router.get('/download-zip', downloadZip);

export default router;
