import { ChatGroq } from "@langchain/groq";
import { HumanMessage, AIMessage, ToolMessage } from "@langchain/core/messages";
import { elementExt } from "./Tools/elementExt.js";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { MessagesAnnotation, StateGraph } from "@langchain/langgraph";
import path from "path";
import { fileURLToPath } from "url";
// import { LangSmithClient } from "langsmith";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const scrapedDir = path.join(
  __dirname,
  "..",
  "..",
  "client",
  "public",
  "scraped_website"
);


// let langsmithClient = null;
// if (process.env.LANGCHAIN_API_KEY) {
//   langsmithClient = new LangSmithClient({
//     apiKey: process.env.LANGCHAIN_API_KEY,
//     apiUrl: process.env.LANGCHAIN_ENDPOINT || "https://api.smith.langchain.com",
//   });
// }

const model = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: "llama-3.3-70b-versatile",
  temperature: 0,
});
const llmWithTools = model.bindTools([elementExt]);

async function llmCall(state) {
  // LLM decides whether to call a tool or not
  const result = await llmWithTools.invoke([
    {
      role: "system",
      content: `You are a helpful assistant named Domorph. Your task is to answer the user's query accurately using the provided tools.
            - Analyze the query to determine if any tools are required to answer it.
            - Use the tool which you have been provided.
            - If the query is resolved, provide a concise final answer in plain text without further tool calls.
            - Do not call tools unnecessarily or repeat tool calls for the same step.
          `,
    },
    ...state.messages,
  ]);

  return {
    messages: [result],
  };
}

const toolNode = new ToolNode([elementExt]);

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

function getFinalAnswer(messages) {
  let finalMessageWithContent = null;

  for (const msg of messages) {
    if (msg instanceof AIMessage) {
      if (msg.content?.trim()) {
        finalMessageWithContent = msg;
      }
    }
  }

  return finalMessageWithContent
    ? {
        content: finalMessageWithContent.content,
      }
    : null;
}


export const newPromptToLlm = async (req, res) => {
  const { prompt, domain } = req.body;
  

  const messages = [
    {
      role: "user",
      content: prompt,
    },
  ];
  const result = await agentBuilder.invoke({ messages });
  const finalAnswer = getFinalAnswer(result.messages);
  res.status(200).json({ result: String(finalAnswer) });


  // Initial model call
  // const initialResponse = await llmWithTools.invoke([
  //   new AIMessage(
  //     "You are a helpful assistant that can extract elements and file names from a website. Select the tool that is most relevant to the user's prompt. Give response exactly in the format of the tool's schema."
  //   ),
  //   new HumanMessage(prompt),
  // ]);

  // // Check if the model wants to call a tool
  // const toolCalls = initialResponse?.kwargs?.tool_calls || [];

  // if (toolCalls.length === 0) {
  //   return res.json({ response: initialResponse });
  // }

  // // Loop over tool calls (in case of multiple)
  // const toolResponses = await Promise.all(
  //   toolCalls.map(async (call) => {
  //     const { name, args, id } = call;

  //     if (name === "elementExt") {
  //       // Adjust path if needed
  //       const filePath = path.join(scrapedDir, args.file.replace(/^@/, ""));
  //       const result = await elementExt.func({
  //         element: args.element,
  //         file: filePath,
  //       });
  //       return new ToolMessage({ tool_call_id: id, content: result });
  //     }

  //     return new ToolMessage({
  //       tool_call_id: call.id,
  //       content: "Tool not implemented",
  //     });
  //   })
  // );

  // // Final model response using tool output
  // const finalResponse = await llmWithTools.invoke([
  //   new AIMessage(
  //     "You are a helpful assistant that can extract elements and file names from a website. Select the tool that is most relevant to the user's prompt. Give response exactly in the format of the tool's schema."
  //   ),
  //   new HumanMessage(prompt),
  //   ...toolResponses,
  // ]);

  // res.json({ response: finalResponse });
};
