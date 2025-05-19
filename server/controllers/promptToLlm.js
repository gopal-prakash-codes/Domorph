import Anthropic from "@anthropic-ai/sdk";
import fs from "fs/promises";
import path from "path";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const scrapedDir = path.join(__dirname, "..",
    "..","client/public/scraped_website");

async function getAllHtmlFiles(dir) {
  const files = await fs.readdir(dir, { withFileTypes: true });
  const htmlFiles = [];

  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      const nested = await getAllHtmlFiles(fullPath);
      htmlFiles.push(...nested);
    } else if (file.name.endsWith(".html")) {
      const content = await fs.readFile(fullPath, "utf-8");
      htmlFiles.push({ path: fullPath, name: file.name, content });
    }
  }

  return htmlFiles;
}

const editWithClaude = async (htmlContent, userPrompt) => {
  const response = await anthropic.messages.create({
    model: "claude-3-opus-20240229",
    max_tokens: 4000,
    temperature: 1,
    messages: [
      {
        role: "user",
        content: `Here are multiple HTML files. Please only make changes that fulfill this prompt:\n"${userPrompt}".\n\nRespond with a JSON array like: [{ "name": "index.html", "modified": "<modified_html>" }, ...].\n\n${htmlContent.map(f => `File: ${f.name}\n${f.content}`).join("\n\n")}`,
      },
    ],
  });

  return response.content[0].text;
};

export const promptToLlm = async (req, res) => {
  const { prompt } = req.body || {};
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ message: "Invalid or missing prompt." });
  }
  const htmlFiles = await getAllHtmlFiles(scrapedDir);
  const edited = await editWithClaude(htmlFiles, prompt);
  await fs.writeFile(path.join(__dirname, "client/public/scraped_website/preview.html"), edited);
  res.json({ message: "Edited successfully", previewPath: "/scraped_website/preview.html" });
  res.json({ editedHtml });
};
