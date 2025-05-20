import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from 'openai';
dotenv.config();

if (!process.env.ANTHROPIC_API_KEY) {
  console.log(`Missing API Key!`);
}
// const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // This is the default and can be omitted
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const scrapedDir = path.join(
  __dirname,
  "..",
  "..",
  "client/public/scraped_website"
);

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

const preprocessPrompt = (prompt) => {
  const fileMatches = prompt.match(/@([\w\-.\/]+\.html)/g); // e.g., ['@about.html', '@index.html']

  if (fileMatches) {
    const targetFiles = fileMatches.map((f) => f.slice(1)); // Remove '@'
    const cleanedPrompt = fileMatches
      .reduce((acc, f) => acc.replace(f, ""), prompt)
      .trim();
    return {
      targetFiles,
      instruction: cleanedPrompt.replace(/\b(and|,)\b\s*/g, "").trim(),
    };
  }

  return {
    targetFiles: "all",
    instruction: prompt,
  };
};

const editWithClaude = async (htmlFiles, userPrompt) => {
  const { targetFiles, instruction } = preprocessPrompt(userPrompt);

  console.log(`TargetFiles: ${targetFiles}`);
  console.log(`Instruction: ${instruction}`);

  const filesToEdit =
    targetFiles === "all"
      ? htmlFiles
      : htmlFiles.filter((f) => targetFiles.includes(f.name));

      console.log(filesToEdit);
      

     const response = await client.responses.create({
     model: "codex",
     temperature: 1,
     messages: [
       {
         role: "user",
         content: `Here are some HTML files. Please modify ONLY the files provided below that fulfill the instruction:\n"${instruction}".\n\nRespond ONLY with a JSON array like:\n[{ "name": "index.html", "modified": "<modified_html>" }, ...].\n\n${filesToEdit
           .map((f) => `File: ${f.name}\n${f.content}`)
           .join("\n\n")}`,
       },
     ],
     stream: true,
   });
   if (!response || response.error) {
     console.error('API Error:', response.error);
     return;
   }
   console.log(response);
   

  let fullText = "";
  
  for await (const chunk of response) {
    console.log(`Chunk: ${JSON.stringify(chunk)}`);
    
    if (chunk?.content?.[0]?.text) {
      fullText += chunk.content[0].text;
    }
  }
  console.log(`Full Text: ${fullText}`);
  
  return fullText;
};

export const promptToLlm = async (req, res) => {
  const { prompt } = req.body || {};
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ message: "Invalid or missing prompt." });
  }

  const htmlFiles = await getAllHtmlFiles(scrapedDir);
  // console.log(`HTML files: ${JSON.stringify(htmlFiles)}`);

  const edited = await editWithClaude(htmlFiles, prompt);
  console.log(`Edited: ${edited}`);
  

  const previewPath = path.join(scrapedDir, "preview.html");
  await fs.writeFile(previewPath, edited);

  res.json({
    message: "Edited successfully",
    previewPath: "/scraped_website/preview.html",
    editedHtml: edited,
  });
};
