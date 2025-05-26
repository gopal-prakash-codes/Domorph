import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';

export const replaceElement = tool(
  async ({ ModifiedElement, fileName, domain, xpath }) => {
    console.log(`Replacing ModifiedElement ${ModifiedElement} in ${fileName} for ${domain} at XPath: ${xpath}`);

    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();

    const folderPath = path.join(
      process.cwd(),
      "..",
      "client",
      "public",
      "scraped_website",
      domain
    );
    const filePath = path.resolve(folderPath, fileName);

    if (!fs.existsSync(filePath)) {
      await browser.close();
      throw new Error(`File not found: ${filePath}`);
    }

    const htmlContent = fs.readFileSync(filePath, 'utf8');
    await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });

    // Replace the ModifiedElement using XPath
    const success = await page.evaluate((xpath, ModifiedElement) => {
      const result = document.evaluate(
        xpath,
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      );
      const node = result.singleNodeValue;

      if (node) {
        const temp = document.createElement("div");
        temp.innerHTML = ModifiedElement;
        const newNode = temp.firstElementChild;
        node.replaceWith(newNode);
        return true;
      }
      return false;
    }, xpath, ModifiedElement);

    if (!success) {
      await browser.close();
      throw new Error(`No element found for XPath: ${xpath}`);
    }

    // Get updated HTML and save it
    const updatedHtml = await page.content();
    fs.writeFileSync(filePath, updatedHtml, 'utf8');

    await browser.close();
    console.log(`Element replaced successfully in ${filePath}`);
    return `Element replaced successfully in ${filePath}`;
  },
  {
    name: "replaceElement",
    description: "Replaces an element in a local HTML file identified by XPath with the new HTML content.",
    schema: z.object({
      ModifiedElement: z.string().describe("The new HTML string to replace the target element with"),
      fileName: z.string().describe("HTML file name (e.g., index.html)"),
      domain: z.string().describe("Name of the domain"),
      xpath: z.string().describe("XPath expression identifying the element to replace"),
    }),
  }
);
