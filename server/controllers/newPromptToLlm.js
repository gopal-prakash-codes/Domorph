import dotenv from "dotenv";
// import { ChatGroq } from "@langchain/groq";
import { ChatOpenAI } from "@langchain/openai";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { MessagesAnnotation, StateGraph } from "@langchain/langgraph";
import { extractElement } from "./Tools/extractElement.js";
import { replaceElement } from "./Tools/replaceElement.js";
import { newPageCreation } from "./Tools/newPageCreation.js";
dotenv.config();

const model = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  model: "gpt-4.1",
  temperature: 0,
});
const tools = [extractElement, replaceElement, newPageCreation];
const llmWithTools = model.bindTools(tools);

async function llmCall(state) {
  const result = await llmWithTools.invoke([
    {
      role: "system",
      content: `You are a helpful assistant tasked with editing or generating HTML pages on a given domain.

      You have access to the following tools:
      - extractElement: for extracting HTML by XPath
      - replaceElement: for replacing content at XPath
      - newPageCreation: for creating a new HTML page

      # New Page Creation Instructions
      When the user wants to create a new page:
      - You must decide an appropriate pageName (e.g., 'about.html', 'contact.html', 'services.html') based on the prompt.
      - Use the 'newPageCreation' tool.
      - Always pass the full HTML code needed for the page (not a fragment unless instructed).
      - The 'domain' will be provided.
      - Do not hardcode anything not related to the prompt.

      # Modifications Instructions
      If the user wants to modify an existing element:
      - First extract the element using extractElement with the given XPath.
      - Then modify only what the prompt specifies:
        - If it mentions text change: change **only text content**, keep CSS untouched.
        - If it mentions style change: apply **only inline styles**, keep text untouched.
      - Replace the modified element using replaceElement.

      # General Guidelines
      - Avoid repeating the same tool calls.
      - Return structured output if asked (e.g., modifiedElement).
      - Only use tools that match the goal of the prompt.

      Respond by calling the right tool directly.`,
    },
    ...state.messages,
  ]);

  return {
    messages: [result],
  };
}


const toolNode = new ToolNode(tools);

// Conditional edge function to route to the tool node or end
function shouldContinue(state) {
  const messages = state.messages;
  const lastMessage = messages.at(-1);

  // If the LLM makes a tool call, then perform an action
  if (lastMessage?.tool_calls?.length) {
    return "Action";
  }
  // Otherwise, we stop (reply to the user)
  return "__end__";
}

// Build workflow
const agentBuilder = new StateGraph(MessagesAnnotation)
  .addNode("llmCall", llmCall)
  .addNode("tools", toolNode)
  // Add edges to connect nodes
  .addEdge("__start__", "llmCall")
  .addConditionalEdges("llmCall", shouldContinue, {
    // Name returned by shouldContinue : Name of next node to visit
    Action: "tools",
    __end__: "__end__",
  })
  .addEdge("tools", "llmCall")
  .compile();

export const newPromptToLlm = async (req, res) => {
  const { prompt, domain, fileName, xpath } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Missing prompt!" });
  }

  try {
    const messages = [
      {
        role: "user",
        content: `${prompt}, ${xpath || "Not given"}, ${fileName || "Not given"}, ${domain || "Not given"}.`,
      },
    ];

    const result = await agentBuilder.invoke({ messages });

    const finalMessage = result.messages.at(-1);
    const isSuccess =
      finalMessage?.tool_calls?.length > 0 ||
      (typeof finalMessage?.content === "string" &&
        finalMessage.content.includes("modifiedElement"));

    console.log(`Result: ${JSON.stringify(result)}`);
    res.status(200).json({ result, status: isSuccess ? "success" : "failure" });
  } catch (error) {
    console.error("Error in LLM processing:", error);
    res.status(500).json({ error: "Error processing request" });
  }
};
