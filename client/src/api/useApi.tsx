import apiInstance from "../axiosInstance/axiosInstance";
import { toast } from "react-hot-toast";

// Interface for SSE message data
interface SSEMessage {
  type: "progress" | "complete" | "error";
  path?: string; // For progress messages
  message?: string; // For complete and error messages
  structure?: Array<{ type: string; name: string; children?: any[] }>; // For complete message
}

// Interface for webScrape result
interface ScrapeResult {
  isScraped: boolean;
  content: string;
  structure: Array<{ type: string; name: string; children?: any[] }>;
  progress: string[];
}

export const webScrape = async (
  url: string,
  onProgress?: (path: string) => void
): Promise<ScrapeResult> => {
  return new Promise((resolve, reject) => {
    const encodedUrl = encodeURIComponent(url);
    const source = new EventSource(`http://localhost:5000/api/webScrape?url=${encodedUrl}`);

    const result: ScrapeResult = {
      isScraped: false,
      content: "",
      structure: [],
      progress: [],
    };

    source.onmessage = (event: MessageEvent) => {
      try {
        const data: SSEMessage = JSON.parse(event.data);
        if (data.type === "progress" && data.path) {
          result.progress.push(data.path); // Type-safe: data.path is string
          if (onProgress) onProgress(data.path);
        } else if (data.type === "complete") {
          result.isScraped = true;
          result.content = data.message || "Scraping completed";
          result.structure = data.structure || [];
          source.close();
          resolve(result);
        } else if (data.type === "error") {
          result.content = data.message || "Scraping failed";
          toast.error(data.message || "Scraping failed");
          source.close();
          reject(new Error(data.message || "Scraping failed"));
        }
      } catch (err) {
        toast.error("Failed to parse server response");
        source.close();
        reject(new Error("Failed to parse server response"));
      }
    };

    source.onerror = () => {
      toast.error("Connection to server lost");
      source.close();
      reject(new Error("SSE connection failed"));
    };
  });
};

export const promptToLlm = async (prompt: string) => {
  try {
    const response = await apiInstance.post("/prompttollm", { prompt });
    if (response.status === 200) {
      return response.data;
    } else {
      toast.error("Failed to modify website!");
    }
  } catch (error: any) {
    toast.error(error.response.data.message);
    // throw new Error("Failed to modify website");
  }
};