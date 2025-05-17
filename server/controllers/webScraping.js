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

export const webScraping = async (req, res) => {
  const { url } = req.body || {};

  if (!url || typeof url !== "string") {
    return res.status(400).json({ message: "Invalid or missing URL." });
  }

  let browser;
  try {
    browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
    await new Promise((resolve) => setTimeout(resolve, 5000));
    await autoScroll(page);
    await new Promise((resolve) => setTimeout(resolve, 3000));
    await page.waitForSelector("img", { timeout: 10000 });

    const dirPath = path.join(
      __dirname,
      "..",
      "..",
      "client",
      "public",
      "scraped_website"
    );
    const assetDir = path.join(dirPath, "assets");
    await fs.mkdir(assetDir, { recursive: true }); // === Extract Image URLs ===

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

    console.log("imageHandles:", imageHandles); // === Download and Save Images ===

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

        const imageName = `image_${i}.${extension}`;
        const imagePath = path.join(assetDir, imageName);
        const buffer = await response.buffer();
        await fs.writeFile(imagePath, buffer);

        const localPath = `http://localhost:3000/scraped_website/assets/${imageName}`;
        localImagePaths.push(localPath);
      } catch (err) {
        console.warn(`Image download failed: ${imageUrl}, ${err.message}`);
        localImagePaths.push(imageUrl); // fallback to original
      }
    } // === Replace img src attributes in-place ===

    await page.evaluate((newSources) => {
      const imgs = Array.from(document.querySelectorAll("img"));
      imgs.forEach((img, i) => {
        if (newSources[i]) {
          img.setAttribute("src", newSources[i]);
        }
        img.removeAttribute("srcset");
      });
    }, localImagePaths); // === Capture CSS (optional) ===

    const stylesheets = await page.$$eval("link[rel='stylesheet']", (links) =>
      links.map((link) => link.href)
    );

    let cssContent = "";
    for (const href of stylesheets) {
      try {
        const css = await (await fetch(href)).text();
        cssContent += `\n/* From ${href} */\n${css}`;
      } catch (err) {
        console.warn(`Failed to fetch CSS ${href}: ${err.message}`);
      }
    } // === Capture JS Scripts (optional) ===

    const scriptHandles = await page.$$eval("script[src]", (scripts) =>
      scripts.map((s) => s.getAttribute("src")).filter(Boolean)
    );

    let scriptContent = "";
    for (const src of scriptHandles) {
      try {
        const absUrl = new URL(src, url).href;
        const response = await fetch(absUrl);
        if (!response.ok) throw new Error(`Failed to fetch script: ${absUrl}`);
        const js = await response.text();
        scriptContent += `\n/* Script from ${absUrl} */\n<script>${js}</script>\n`;
      } catch (err) {
        console.warn(`Script fetch failed: ${src}, ${err.message}`);
      }
    } // === Get Final HTML Content ===

    let content = await page.content(); // Inject CSS & base href

    if (cssContent) {
      content = content.replace(
        "</head>",
        `<style>${cssContent}</style></head>`
      );
    }
    content = content.replace(
      "</head>",
      `<base href="/scraped_website/">\n</head>`
    ); // Remove client-side JS

    // content = content.replace(/<script[^>]*>[\s\S]*?<\/script>/g, ""); // Save HTML file

    const filePath = path.join(dirPath, "scraped_website.html");
    await fs.writeFile(filePath, content);

    res.status(200).json({
      message: "Website scraped with image URLs replaced and saved locally.",
      file: filePath,
    });
  } catch (err) {
    console.error("Scraping failed:", err);
    res.status(500).json({ message: "Scraping failed" });
  } finally {
    if (browser) await browser.close();
  }
};
