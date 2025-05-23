import { z } from "zod";
import { tool } from "@langchain/core/tools";

  
export const elementExt = tool(
    async ({ element, file }) => {
        console.log(element, file);
        
        
        const cleanedFile = file.replace(/^@/, "");

        const html = fs.readFileSync(cleanedFile, 'utf8');
        console.log(`Html file: ${html}`);
        
        const $ = cheerio.load(html);
        const getElement = $(element);
        console.log(getElement.text());
        
        return `${getElement.text()}`;
    },
    {
      name: "elementExt",
      description: "Can extract the element from the html code.",
      schema: z.object({
        element: z.string().describe("name of the element"),
        file: z.string().describe("name of the html file"),
      }),
    }
  );