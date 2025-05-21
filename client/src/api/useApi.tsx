import apiInstance from "../axiosInstance/axiosInstance";
import { toast } from "react-hot-toast";

// Interface for SSE message data
interface SSEMessage {
  type: "progress" | "complete" | "error";
  path?: string; // For progress messages
  domain?: string;
  message?: string; // For complete and error messages
  structure?: Array<{ type: string; name: string; children?: any[] }>; // For complete message
}

// Interface for webScrape result
interface ScrapeResult {
  isScraped: boolean;
  content: string;
  structure: Array<{ type: string; name: string; children?: any[] }>;
  progress: string[];
  domain: string;
}

interface UIModificationResult {
  success: boolean;
  message: string;
  modified_files: Array<{ name: string; path: string }>;
}

export const webScrape = async (
  url: string,
  onProgress?: (path: string, domain: string) => void
): Promise<ScrapeResult> => {
  return new Promise((resolve, reject) => {
    const encodedUrl = encodeURIComponent(url);
    const serverUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:5001";
    const source = new EventSource(`${serverUrl}/api/webScrape?url=${encodedUrl}`);

    const result: ScrapeResult = {
      isScraped: false,
      content: "",
      structure: [],
      progress: [],
      domain: "",
    };

    source.onmessage = (event: MessageEvent) => {
      try {
        const data: SSEMessage = JSON.parse(event.data);
        if (data.type === "progress" && data.path) {
          result.progress.push(data.path);
          if (data.domain) result.domain = data.domain;
          if (onProgress && data.domain) onProgress(data.path, data.domain);
        } else if (data.type === "complete") {
          result.isScraped = true;
          result.content = data.message || "Scraping completed";
          result.structure = data.structure || [];
          if (data.domain) result.domain = data.domain;
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

export const modifyUI = async (prompt: string, domain: string): Promise<UIModificationResult> => {
  try {
    const response = await apiInstance.post("/modify-ui", { prompt, domain });

    if (response.status === 200) {
      if (response.data.success) {
        toast.success("UI modified successfully!");
      } else {
        toast.error(response.data.message);
      }
      return response.data;
    } else {
      toast.error("Failed to modify the UI!");
      return {
        success: false,
        message: "Failed to modify the UI!",
        modified_files: [],
      };
    }
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || "An error occurred while modifying the UI";
    toast.error(errorMessage);
    return {
      success: false,
      message: errorMessage,
      modified_files: [],
    };
  }
};