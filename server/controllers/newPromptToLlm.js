import dotenv from "dotenv";
import { ChatGroq } from "@langchain/groq";
import { ChatOpenAI } from "@langchain/openai";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { MessagesAnnotation, StateGraph } from "@langchain/langgraph";
import { extractElement } from "./Tools/extractElement.js";
import { replaceElement } from "./Tools/replaceElement.js";
dotenv.config();

const model = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  model: "gpt-4.1",
  temperature: 0,
});
const tools = [extractElement, replaceElement];
const llmWithTools = model.bindTools(tools);

async function llmCall(state) {
  // LLM decides whether to call a tool or not
  const result = await llmWithTools.invoke([
    {
      role: "system",
      content: `You are a helpful assistant tasked with modifying elements on a website.
      You need to extract the element from the website using the xpath.
      According to the prompt, you only modify that things which are mentioned in the prompt, if there is changing text, then only change the text content, not the css, if there is changing css, then only add the inline css, do not change the text content.
      After modifying the element, you need to place the element in the html file using the modifiedElement: elemet xpath.
      You need to return the element in a json format.
      Do not repeat the same process again and again.
      `,
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

  if (!prompt || !domain || !fileName || !xpath) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const messages = [
      {
        role: "user",
        content: `${prompt}, ${xpath}, ${fileName}, ${domain}.`,
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
