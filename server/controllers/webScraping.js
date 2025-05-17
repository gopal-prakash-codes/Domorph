import fs from "fs/promises";
import path from "path";
import fetch from "node-fetch";
import { fileURLToPath } from "url";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

const normalizeUrl = (rawUrl) => {
  try {
    const url = new URL(rawUrl);
    url.hash = ""; // remove #fragment
    url.search = ""; // remove query string
    return url.toString().replace(/\/$/, ""); // remove trailing slash
  } catch {
    return null;
  }
};

const urlToPath = (baseDir, url) => {
  const parsed = new URL(url);
  let pathname = parsed.pathname.replace(/\/$/, "");
  if (pathname === "") pathname = "/index";
  return path.join(baseDir, `${pathname}.html`);
};

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

async function scrapePage(browser, url, baseDir, visited, queue) {
  const normalizedUrl = normalizeUrl(url);
  if (!normalizedUrl || visited.has(normalizedUrl)) return;
  visited.add(normalizedUrl);

  const page = await browser.newPage();
  try {
    await page.goto(normalizedUrl, { waitUntil: "networkidle2", timeout: 30000 });
    await autoScroll(page);

    // Download and rewrite image sources
    const assetDir = path.join(baseDir, "assets");
    await fs.mkdir(assetDir, { recursive: true });

    const imageHandles = await page.$$eval("img", (imgs) => {
      const base = location.origin;

      function getBestSrc(srcset) {
        if (!srcset) return null;
        const candidates = srcset.split(",").map((s) => s.trim().split(" ")[0]);
        return candidates[candidates.length - 1] || null;
      }

      return imgs
        .map((img) => {
          const srcset = img.getAttribute("srcset");
          let src = getBestSrc(srcset);
          if (!src) src = img.getAttribute("src") || "";
          try {
            return new URL(src, base).href;
          } catch {
            return null;
          }
        })
        .filter(Boolean);
    });

    const localImagePaths = [];

    for (let i = 0; i < imageHandles.length; i++) {
      const imageUrl = imageHandles[i];
      try {
        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error(`Failed to fetch image: ${imageUrl}`);

        const contentType = response.headers.get("content-type");
        let extension = "jpg";
        if (contentType?.includes("png")) extension = "png";
        else if (contentType?.includes("jpeg") || contentType?.includes("jpg"))
          extension = "jpg";

        const imageName = `image_${Date.now()}_${i}.${extension}`;
        const imagePath = path.join(assetDir, imageName);
        const buffer = await response.buffer();
        await fs.writeFile(imagePath, buffer);

        const localPath = `http://localhost:3000/scraped_website/assets/${imageName}`;
        localImagePaths.push(localPath);
      } catch (err) {
        console.warn(`Image download failed: ${imageUrl}, ${err.message}`);
        localImagePaths.push(imageUrl); // fallback
      }
    }

    await page.evaluate((newSources) => {
      const imgs = Array.from(document.querySelectorAll("img"));
      imgs.forEach((img, i) => {
        if (newSources[i]) {
          img.setAttribute("src", newSources[i]);
        }
        img.removeAttribute("srcset");
      });
    }, localImagePaths);

    // Extract and enqueue new internal links
    const internalLinks = await extractInternalLinks(page, normalizedUrl);
    for (const link of internalLinks) {
      if (!visited.has(link) && !queue.includes(link)) {
        queue.push(link);
      }
    }

    // Rewrite anchor hrefs to local paths
    await page.$$eval("a[href]", (anchors, baseOrigin) => {
      anchors.forEach((a) => {
        try {
          const url = new URL(a.href, baseOrigin);
          if (url.origin === baseOrigin) {
            let path = url.pathname.replace(/\/$/, "") || "/index";
            a.setAttribute("href", `/scraped_website${path}.html`);
          }
        } catch {}
      });
    }, new URL(url).origin);

    // Remove all script tags by commenting them out
    await page.$$eval("script", (scripts) => {
      scripts.forEach((script) => {
        const content = script.outerHTML;
        const comment = document.createComment(content);
        script.replaceWith(comment);
      });
    });

    // Embed external styles
    const stylesheets = await page.$$eval("link[rel='stylesheet']", (links) =>
      links.map((link) => link.href)
    );

    let cssContent = "";
    for (const href of stylesheets) {
      try {
        const css = await (await fetch(href)).text();
        cssContent += `\n/* ${href} */\n${css}`;
      } catch {}
    }

    let content = await page.content();

    if (cssContent) {
      content = content.replace("</head>", `<style>${cssContent}</style></head>`);
    }

    content = content.replace("</head>", `<base href="/scraped_website/">\n</head>`);

    const filePath = urlToPath(baseDir, normalizedUrl);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content);
    console.log(`✅ Saved: ${normalizedUrl} → ${filePath}`);
  } catch (err) {
    console.warn(`❌ Failed ${normalizedUrl}: ${err.message}`);
  } finally {
    await page.close();
  }
}

export const webScraping = async (req, res) => {
  const { url } = req.body || {};
  if (!url || typeof url !== "string") {
    return res.status(400).json({ message: "Invalid or missing URL." });
  }

  const baseDir = path.join(__dirname, "..", "..", "client", "public", "scraped_website");
  await fs.mkdir(baseDir, { recursive: true });

  const visited = new Set();
  const queue = [normalizeUrl(url)];

  let browser;
  try {
    browser = await puppeteer.launch({ headless: false });

    while (queue.length > 0) {
      const currentUrl = queue.shift();
      await scrapePage(browser, currentUrl, baseDir, visited, queue);
    }

    res.status(200).json({
      message: `Scraped ${visited.size} pages successfully.`,
    });
  } catch (err) {
    console.error("Scraping failed:", err);
    res.status(500).json({ message: "Scraping failed" });
  } finally {
    if (browser) await browser.close();
  }
};
