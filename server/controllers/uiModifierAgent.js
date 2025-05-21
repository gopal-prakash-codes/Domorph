import { ChatAnthropic } from "@langchain/anthropic";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { Document } from "@langchain/core/documents";
import { StringOutputParser } from "@langchain/core/output_parsers";
import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import Anthropic from "@anthropic-ai/sdk";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});


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


function preprocessPrompt(prompt) {
    const fileMatches = prompt.match(/@([\w\-.\/]+\.html)/g);

    if (fileMatches) {
        const targetFiles = fileMatches.map((f) => f.slice(1));
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
}


async function callWithRateLimit(fn, maxRetries = 5) {
    let retries = 0;
    let lastError = null;

    while (retries <= maxRetries) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (error.error?.error?.type === 'rate_limit_error') {

                const retryAfter = parseInt(error.headers?.['retry-after'] || '0') || Math.pow(2, retries);
                const waitTime = retryAfter * 1000;

                console.log(`Rate limit hit. Retrying after ${waitTime / 1000} seconds (retry ${retries + 1}/${maxRetries + 1})...`);


                await new Promise(resolve => setTimeout(resolve, waitTime));
                retries++;
            } else {

                throw error;
            }
        }
    }


    throw lastError;
}


const planner = new ChatAnthropic({
    modelName: "claude-3-7-sonnet-20250219",
    temperature: 0.1,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
});

const designer = new ChatAnthropic({
    modelName: "claude-3-7-sonnet-20250219",
    temperature: 0.7,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
});

const coder = new ChatAnthropic({
    modelName: "claude-3-7-sonnet-20250219",
    temperature: 0.2,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
});

const tester = new ChatAnthropic({
    modelName: "claude-3-7-sonnet-20250219",
    temperature: 0.2,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
});


const plannerPrompt = ChatPromptTemplate.fromMessages([
    ["system", `You are a UI/UX planning expert who creates a detailed plan to modify UI elements based on user requests.
  Your task is to break down the user request into a step-by-step plan for modifying HTML/CSS/JS.
  Consider accessibility, responsive design, and modern UI principles in your plan.
  Be specific and detailed, focusing on practical implementation steps.`],
    ["user", "{instruction}"]
]);

const designerPrompt = ChatPromptTemplate.fromMessages([
    ["system", `You are a UI/UX designer who creates beautiful, modern, and responsive designs.
  Your task is to analyze the existing HTML/CSS and provide specific design changes based on the plan.
  Focus on color schemes, typography, spacing, and overall aesthetics.
  Provide concrete CSS values and specific design decisions, not vague suggestions.`],
    ["user", "Here's the existing HTML: {html_content}\n\nHere's the plan: {plan}\n\nProvide specific design changes."]
]);

const coderPrompt = ChatPromptTemplate.fromMessages([
    ["system", `You are an expert frontend developer who implements UI changes in HTML, CSS, and JavaScript.
  Your task is to modify the existing code based on the design specifications and plan.
  Write clean, semantic, and accessible HTML. Ensure your CSS follows best practices.
  Optimize JavaScript for performance. The output should be the complete, modified HTML file.
  Maintain all existing functionality while implementing the requested UI changes.`],
    ["user", "Here's the existing HTML: {html_content}\n\nHere's the plan: {plan}\n\nHere are the design specs: {design_specs}\n\nProvide the complete, modified HTML."]
]);

const testerPrompt = ChatPromptTemplate.fromMessages([
    ["system", `You are a UI/UX testing expert who evaluates code and identifies issues.
  Your task is to review the implemented changes and provide feedback on:
  1. HTML validity and semantics
  2. CSS style issues and inconsistencies
  3. JavaScript bugs and performance issues
  4. Accessibility concerns
  5. Responsive design problems
  Be detailed in your evaluation and suggest specific improvements if needed.
  If the implementation looks good, be sure to mention that explicitly.`],
    ["user", "Here's the original HTML: {original_html}\n\nHere's the modified HTML: {modified_html}\n\nHere was the original request: {instruction}\n\nProvide feedback and suggest any improvements."]
]);


const plannerChain = plannerPrompt
    .pipe(planner)
    .pipe(new StringOutputParser());

const designerChain = designerPrompt
    .pipe(designer)
    .pipe(new StringOutputParser());

const coderChain = coderPrompt
    .pipe(coder)
    .pipe(new StringOutputParser());

const testerChain = testerPrompt
    .pipe(tester)
    .pipe(new StringOutputParser());


async function processFilesSequentially(htmlFiles, plan, instruction) {
    const modifiedFiles = [];

    for (const htmlFile of htmlFiles) {
        console.log(`Processing file: ${htmlFile.name}`);

        try {

            console.log("Starting design phase...");
            const designSpecs = await callWithRateLimit(async () => {
                return await designerChain.invoke({
                    html_content: htmlFile.content,
                    plan
                });
            });
            console.log("Design specs created");


            await new Promise(resolve => setTimeout(resolve, 2000));


            console.log("Starting implementation phase...");
            let modifiedHtml = await callWithRateLimit(async () => {
                return await coderChain.invoke({
                    html_content: htmlFile.content,
                    plan,
                    design_specs: designSpecs
                });
            });
            console.log("Initial implementation complete");


            let feedback;
            let iterations = 0;
            const maxIterations = 3;

            while (iterations < maxIterations) {

                await new Promise(resolve => setTimeout(resolve, 2000));

                console.log(`Starting test iteration ${iterations + 1}...`);
                feedback = await callWithRateLimit(async () => {
                    return await testerChain.invoke({
                        original_html: htmlFile.content,
                        modified_html: modifiedHtml,
                        instruction
                    });
                });
                console.log(`Iteration ${iterations + 1} feedback received`);


                if (/looks good|excellent|great job|no issues|passed/i.test(feedback)) {
                    console.log("Positive feedback received, finishing modifications");
                    break;
                }


                await new Promise(resolve => setTimeout(resolve, 2000));


                console.log(`Applying improvements for iteration ${iterations + 1}...`);
                modifiedHtml = await callWithRateLimit(async () => {
                    return await coderChain.invoke({
                        html_content: htmlFile.content,
                        plan,
                        design_specs: designSpecs + "\n\nFeedback from testing: " + feedback
                    });
                });
                console.log(`Iteration ${iterations + 1} improvements applied`);

                iterations++;
            }


            await fs.writeFile(htmlFile.path, modifiedHtml);
            console.log(`File saved: ${htmlFile.path}`);


            modifiedFiles.push({
                name: htmlFile.name,
                path: path.relative(path.join(scrapedDir, path.basename(path.dirname(htmlFile.path))), htmlFile.path),
                content: modifiedHtml
            });


            await new Promise(resolve => setTimeout(resolve, 5000));
        } catch (error) {
            console.error(`Error processing file ${htmlFile.name}:`, error);

        }
    }

    return modifiedFiles;
}


export async function modifyUI(userPrompt, domainName) {
    try {

        const domainDir = path.join(scrapedDir, domainName);


        const allHtmlFiles = await getAllHtmlFiles(domainDir);


        const { targetFiles, instruction } = preprocessPrompt(userPrompt);


        const htmlFiles = targetFiles === "all"
            ? allHtmlFiles
            : allHtmlFiles.filter(f => targetFiles.includes(f.name));

        if (htmlFiles.length === 0) {
            return {
                success: false,
                message: "No matching HTML files found for modification.",
                modified_files: [],
            };
        }

        console.log(`Processing ${htmlFiles.length} HTML files with prompt: ${instruction}`);


        console.log("Creating modification plan...");
        const plan = await callWithRateLimit(async () => {
            return await plannerChain.invoke({ instruction });
        });
        console.log("Plan created:", plan.substring(0, 100) + "...");


        const modifiedFiles = await processFilesSequentially(htmlFiles, plan, instruction);

        if (modifiedFiles.length === 0) {
            return {
                success: false,
                message: "Failed to modify any files due to errors.",
                modified_files: [],
            };
        }

        return {
            success: true,
            message: `Successfully modified ${modifiedFiles.length} HTML files.`,
            modified_files: modifiedFiles,
        };
    } catch (error) {
        console.error("Error in UI modifier agent:", error);
        return {
            success: false,
            message: `Error modifying UI: ${error.message}`,
            modified_files: [],
        };
    }
}


export const uiModifierAgent = async (req, res) => {
    const { prompt, domain } = req.body || {};

    if (!prompt || typeof prompt !== "string") {
        return res.status(400).json({ message: "Invalid or missing prompt." });
    }

    if (!domain || typeof domain !== "string") {
        return res.status(400).json({ message: "Invalid or missing domain." });
    }

    try {
        const result = await modifyUI(prompt, domain);
        res.json(result);
    } catch (error) {
        console.error("Error in UI modifier agent controller:", error);
        res.status(500).json({
            message: "An error occurred while processing your request.",
            error: error.message,
        });
    }
}; 