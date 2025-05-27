import { tool } from "@langchain/core/tools";
import path from "path";
import fs from "fs/promises";
import { z } from "zod";

export const newPageCreation = tool(
  async ({ domain, pageName, code }) => {
    try {
      console.log(`Domain: ${domain}`);
      console.log(`Page Name: ${pageName}`);
      console.log(`Code: ${code}`);

      const folderPath = path.join(
        process.cwd(),
        "..",
        "client",
        "public",
        "scraped_website",
        domain
      );

      // Ensure the directory exists
      await fs.mkdir(folderPath, { recursive: true });

      // Define full file path
      const filePath = path.join(folderPath, pageName);

      // Write the code into the file
      await fs.writeFile(filePath, code, "utf-8");

      console.log(`Page created at ${filePath}`);
      return { success: true, message: `Page created at ${filePath}` };
    } catch (error) {
      console.error("Error creating page:", error);
      return { success: false, message: "Failed to create page", error };
    }
  },
  {
    name: "newPageCreation",
    description: "Create a new page",
    schema: z.object({
      domain: z.string(),
      pageName: z.string(),
      code: z.string(),
    }),
  }
);
