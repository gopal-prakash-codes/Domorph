// scraping.js
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import pLimit from "p-limit";

puppeteer.use(StealthPlugin());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONCURRENCY_LIMIT = process.env.CONCURRENCY_LIMIT ? parseInt(process.env.CONCURRENCY_LIMIT) : 5;
const limit = pLimit(CONCURRENCY_LIMIT);

// 🔧 Extract domain name from URL
const extractDomainName = (url) => {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, '');
  } catch (error) {
    console.error("Error extracting domain:", error);
    return "unknown-domain";
  }
};

// 🔧 Normalize URL (remove hash/query/trailing slashes)
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

// 🔧 Auto-scroll to load lazy content
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

// 🔧 Extract internal links from a page
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

// 📸 Screenshot-only scraping
async function scrapePage(browser, url, screenshotsBaseDir, visited, queue, domainName, onScreenshotSaved) {
  const normalizedUrl = normalizeUrl(url);
  if (!normalizedUrl || visited.has(normalizedUrl)) return;
  visited.add(normalizedUrl);

  const page = await browser.newPage();
  try {
    await page.goto(normalizedUrl, { waitUntil: "networkidle2", timeout: 30000 });
    await autoScroll(page);

    const screenshotsDir = path.join(screenshotsBaseDir, domainName);
    await fs.mkdir(screenshotsDir, { recursive: true });

    const parsedUrl = new URL(normalizedUrl);
    let fileName = parsedUrl.pathname.replace(/\/$/, "") || "index";
    fileName = fileName.split("/").filter(Boolean).join("_") || "index";
    const screenshotPath = path.join(screenshotsDir, `${fileName}.png`);

    await page.screenshot({ path: screenshotPath, fullPage: true });

    if (typeof onScreenshotSaved === "function") {
      const relativePath = path.relative(screenshotsBaseDir, screenshotPath).replace(/\\/g, "/");
      onScreenshotSaved(relativePath, domainName);
    }

    console.log(`📸 Screenshot saved: ${screenshotPath}`);

    const internalLinks = await extractInternalLinks(page, normalizedUrl);
    for (const link of internalLinks) {
      if (!visited.has(link) && !queue.includes(link)) {
        queue.push(link);
      }
    }
  } catch (err) {
    console.warn(`❌ Failed to screenshot ${normalizedUrl}: ${err.message}`);
  } finally {
    await page.close();
  }
}

// 📡 API handler for web scraping (only screenshots)
export const webScraping = async (req, res) => {
  const { url } = req.query || {};
  if (!url || typeof url !== "string") {
    return res.status(400).json({ message: "Invalid or missing URL." });
  }

  // Setup SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const domainName = extractDomainName(url);
  const clientDir = process.env.CLIENT_DIR_PATH || path.join(__dirname, "..", "..", "client", "public");
  const screenshotsBaseDir = path.join(clientDir, "screenshots");
  await fs.mkdir(screenshotsBaseDir, { recursive: true });

  const visited = new Set();
  const queue = [normalizeUrl(url)];

  let browser;
  try {
    const puppeteerOptions = {
      headless: true,
      args: process.env.PUPPETEER_ARGS ? process.env.PUPPETEER_ARGS.split(",") : [],
    };

    browser = await puppeteer.launch(puppeteerOptions);

    const sendUpdate = (data) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    while (queue.length > 0) {
      const batch = queue.splice(0, CONCURRENCY_LIMIT);
      await Promise.all(
        batch.map((link) =>
          limit(() =>
            scrapePage(browser, link, screenshotsBaseDir, visited, queue, domainName, (savedPath, domain) => {
              sendUpdate({ type: "screenshot", path: savedPath, domain });
              console.log("✅ Screenshot saved:", savedPath);
            })
          )
        )
      );
    }

    sendUpdate({
      type: "complete",
      message: `Captured ${visited.size} screenshots successfully.`,
      domain: domainName,
    });

    res.end();
  } catch (err) {
    console.error("Scraping failed:", err);
    res.write(`data: ${JSON.stringify({ type: "error", message: "Scraping failed: " + err.message })}\n\n`);
    res.end();
  } finally {
    if (browser) await browser.close();
  }

  req.on("close", () => {
    if (browser) browser.close();
    res.end();
  });
};
