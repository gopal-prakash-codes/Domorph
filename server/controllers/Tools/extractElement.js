import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';

export const extractElement = tool(
  async ({domain, fileName, xpath}) => {

    console.log(`Domain: ${domain}`);
    console.log(`File Name: ${fileName}`);
    console.log(`XPath: ${xpath}`);

  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  const folderPath = path.join(
    process.cwd(),
    "..",
    "client",
    "public",         
    "scraped_website",
    domain
  );
  
  // Load local HTML file
  const filePath = path.resolve(folderPath, fileName);
  const htmlContent = fs.readFileSync(filePath, 'utf8');
//   console.log(`HTML content: ${htmlContent}`)
  await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });

  console.log(`Extracting element from ${filePath}`);
  

  // Find elements by XPath using evaluate
  const element = await page.evaluate((xpath) => {
    const result = document.evaluate(
      xpath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    );
    const node = result.singleNodeValue;
    if (node) {
      // Return the outerHTML of the element
      return node.outerHTML;
    }
    return null;
  }, xpath);

  if (element) {
    console.log('Element text:', element);
    await browser.close();
    return `${element}`;
  } else {
    console.log('No elements found for XPath:', xpath);
    await browser.close();
    return null;
  }

}, {
  name: "extractElement",
  description: "Can extract the element from the html code.",
  schema: z.object({
    domain: z.string().describe("name of the domain"),
    fileName: z.string().describe("name of the html file"),
    xpath: z.string().describe("xpath of the element"),
  }),
});
