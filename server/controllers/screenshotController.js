import { screenshotToCode } from './screenshotToCode.js';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import pLimit from 'p-limit';

puppeteer.use(StealthPlugin());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Concurrency limit for screenshots
const CONCURRENCY_LIMIT = process.env.CONCURRENCY_LIMIT ? parseInt(process.env.CONCURRENCY_LIMIT) : 3;
const limit = pLimit(CONCURRENCY_LIMIT);

/**
 * Controller function to handle screenshot to code conversion requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const convertScreenshotToCode = async (req, res) => {
  try {
    // Check if file was provided
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No screenshot file provided'
      });
    }
    
    // Get domain name from query params
    const { domainName } = req.query;
    
    if (!domainName) {
      return res.status(400).json({
        success: false,
        message: 'Domain name is required'
      });
    }
    
    // Validate domain name (only alphanumeric and hyphens)
    if (!/^[a-z0-9-]+$/.test(domainName)) {
      return res.status(400).json({
        success: false,
        message: 'Domain name must contain only lowercase letters, numbers, and hyphens'
      });
    }
    
    // Convert file buffer to base64
    const screenshotBase64 = req.file.buffer.toString('base64');
    
    console.log(`Processing screenshot for domain: ${domainName}`);
    
    // Call the screenshotToCode function
    const result = await screenshotToCode(screenshotBase64, domainName);
    
    if (result.success) {
      // Create URL path for client to access the generated website
      const urlPath = `/scraped_website/${domainName}/index.html`;
      
      return res.status(200).json({
        success: true,
        message: 'Website code generated successfully',
        url: urlPath,
        code: result.htmlCode.substring(0, 200) + '...' // Send preview of the code
      });
    } else {
      return res.status(500).json({
        success: false,
        message: result.message,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error in screenshot controller:', error);
    return res.status(500).json({
      success: false,
      message: `Server error: ${error.message}`,
      error: error.toString()
    });
  }
}; 

/**
 * Extract domain name from URL
 * @param {string} url - The URL to extract domain from
 * @returns {string} - The extracted domain name
 */
const extractDomainName = (url) => {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, '');
  } catch (error) {
    console.error("Error extracting domain:", error);
    return "unknown-domain";
  }
};

/**
 * Normalize URL by removing hash and search params
 * @param {string} rawUrl - The URL to normalize
 * @returns {string|null} - Normalized URL or null if invalid
 */
const normalizeUrl = (rawUrl) => {
  try {
    const url = new URL(rawUrl);
    url.hash = "";
    url.search = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
};

/**
 * Extract internal links from page
 * @param {Page} page - Puppeteer page object
 * @param {string} baseUrl - Base URL for the website
 * @returns {Array<string>} - Array of internal links
 */
const extractInternalLinks = async (page, baseUrl) => {
  const origin = new URL(baseUrl).origin;
  const links = await page.$$eval("a[href]", (anchors) =>
    anchors.map((a) => a.href)
  );
  const uniqueLinks = Array.from(
    new Set(
      links
        .map((link) => {
          try {
            const u = new URL(link, origin);
            return u.origin === origin ? u.href : null;
          } catch {
            return null;
          }
        })
        .filter(Boolean)
        .map(normalizeUrl)
        .filter(Boolean)
    )
  );
  return uniqueLinks;
};

/**
 * Auto-scroll page to ensure all lazy-loaded content is visible
 * @param {Page} page - Puppeteer page object
 */
const autoScroll = async (page) => {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
};

/**
 * Takes screenshot of a page and identifies sections
 * @param {Browser} browser - Puppeteer browser instance
 * @param {string} url - URL to take screenshot of
 * @param {string} baseDir - Base directory to save screenshots
 * @param {Set} visited - Set of visited URLs
 * @param {Array} queue - Queue of URLs to visit
 * @param {string} domainName - Domain name for folder structure
 * @param {Function} onPageScreenshot - Callback for screenshot saved event
 */
async function screenshotPage(browser, url, baseDir, visited, queue, domainName, onPageScreenshot) {
  const normalizedUrl = normalizeUrl(url);
  if (!normalizedUrl || visited.has(normalizedUrl)) return;
  visited.add(normalizedUrl);
  
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto(normalizedUrl, { waitUntil: "networkidle2", timeout: 30000 });
    await autoScroll(page);
    
    // Create path for screenshot
    const urlObj = new URL(normalizedUrl);
    let pagePath = urlObj.pathname.replace(/\/$/, "") || "/index";
    const pageDir = path.join(baseDir, pagePath);
    await fs.mkdir(pageDir, { recursive: true });
    
    // Take full page screenshot
    const screenshotPath = path.join(pageDir, 'full.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    
    // Identify and screenshot main sections
    const sections = await page.evaluate(() => {
      // Common section selectors
      const sectionSelectors = [
        'header', 'nav', 'main', 'section', 'footer', 
        'div.hero', 'div.banner', 'div.container', 
        'div[class*="section"]', 'div[id*="section"]',
        'div.footer', 'div.header', 'div.content',
        'div[class*="container"]', 'article'
      ];
      
      // Function to get elements by selectors
      const getElements = (selectors) => {
        return selectors.flatMap(selector => 
          Array.from(document.querySelectorAll(selector))
        );
      };
      
      // Get all potential section elements
      const allElements = getElements(sectionSelectors);
      
      // Filter out elements with insufficient size or that are hidden
      return allElements
        .filter(el => {
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          
          return rect.width > 200 && 
                 rect.height > 100 && 
                 style.display !== 'none' && 
                 style.visibility !== 'hidden';
        })
        .map((el, index) => {
          const rect = el.getBoundingClientRect();
          return {
            id: el.id || null,
            className: el.className || null,
            tagName: el.tagName.toLowerCase(),
            index,
            rect: {
              x: rect.x,
              y: rect.y,
              width: rect.width,
              height: rect.height
            }
          };
        });
    });
    
    // Take screenshots of each section
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      const sectionName = section.id || 
                         (section.className ? section.className.replace(/\s+/g, '-') : null) || 
                         `${section.tagName}-${section.index}`;
      
      try {
        // Only screenshot if section is visible in viewport
        if (section.rect.width > 0 && section.rect.height > 0) {
          const sectionScreenshotPath = path.join(pageDir, `${sectionName}.png`);
          await page.screenshot({
            path: sectionScreenshotPath,
            clip: {
              x: section.rect.x,
              y: section.rect.y,
              width: section.rect.width,
              height: section.rect.height
            }
          });
        }
      } catch (err) {
        console.warn(`Failed to screenshot section ${sectionName}:`, err.message);
      }
    }
    
    // Extract internal links to continue crawling
    const internalLinks = await extractInternalLinks(page, normalizedUrl);
    for (const link of internalLinks) {
      if (!visited.has(link) && !queue.includes(link)) {
        queue.push(link);
      }
    }
    
    // Notify about saved screenshots
    if (typeof onPageScreenshot === "function") {
      const relativePath = path.relative(baseDir, pageDir).replace(/\\/g, "/");
      onPageScreenshot(relativePath, domainName, sections.length + 1); // +1 for full page screenshot
    }
    
    console.log(`✅ Screenshots saved for: ${normalizedUrl}`);
  } catch (err) {
    console.warn(`❌ Failed to screenshot ${normalizedUrl}: ${err.message}`);
  } finally {
    await page.close();
  }
}

/**
 * Controller function to take screenshots of all pages of a website
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const websiteScreenshots = async (req, res) => {
  const { url } = req.query || {};
  if (!url || typeof url !== "string") {
    return res.status(400).json({ message: "Invalid or missing URL." });
  }
  
  // Set up SSE headers for real-time updates
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders(); // Ensure headers are sent immediately
  
  const domainName = extractDomainName(url);
  const clientDir = process.env.CLIENT_DIR_PATH || path.join(__dirname, "..", "..", "client", "public");
  const screenshotsDir = "screenshot_website";
  const baseDir = path.join(clientDir, screenshotsDir, domainName);
  await fs.mkdir(baseDir, { recursive: true });

  const visited = new Set();
  const queue = [normalizeUrl(url)];
  let browser;
  
  try {
    const puppeteerOptions = {
      headless: true,
      args: process.env.PUPPETEER_ARGS ? process.env.PUPPETEER_ARGS.split(',') : ['--no-sandbox', '--disable-setuid-sandbox']
    };
    
    browser = await puppeteer.launch(puppeteerOptions);
    
    // Function to send updates to client
    const sendUpdate = (data) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };
    
    // Initial update
    sendUpdate({ 
      type: "start", 
      message: `Starting screenshot process for ${domainName}`,
      domain: domainName
    });
    
    let totalScreenshots = 0;
    let pagesProcessed = 0;
    
    // Process queue with concurrency limit
    while (queue.length > 0) {
      const batch = queue.splice(0, CONCURRENCY_LIMIT);
      pagesProcessed += batch.length;
      
      sendUpdate({
        type: "progress",
        message: `Processing ${batch.length} pages (${pagesProcessed}/${pagesProcessed + queue.length} total)`,
        pagesProcessed,
        pagesRemaining: queue.length
      });
      
      await Promise.all(
        batch.map((link) =>
          limit(() =>
            screenshotPage(browser, link, baseDir, visited, queue, domainName, (pagePath, domain, screenshotCount) => {
              totalScreenshots += screenshotCount;
              // Send live update for each page processed
              sendUpdate({ 
                type: "page_complete", 
                path: pagePath, 
                domain,
                screenshotCount,
                totalScreenshots
              });
            })
          )
        )
      );
    }
    
    // Send completion update
    sendUpdate({
      type: "complete",
      message: `Captured ${totalScreenshots} screenshots across ${visited.size} pages successfully.`,
      domain: domainName,
      totalPages: visited.size,
      totalScreenshots
    });
    
    res.end();
  } catch (err) {
    console.error("Screenshot process failed:", err);
    res.write(`data: ${JSON.stringify({ 
      type: "error", 
      message: "Screenshot process failed: " + err.message 
    })}\n\n`);
    res.end();
  } finally {
    if (browser) await browser.close();
  }
  
  // Clean up on client disconnect
  req.on("close", () => {
    if (browser) browser.close();
    res.end();
  });
}; 