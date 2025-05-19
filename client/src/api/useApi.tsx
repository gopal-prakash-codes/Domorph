import apiInstance from "../axiosInstance/axiosInstance";
import { toast} from 'react-hot-toast'  

export const webScrape = async (url: string) => {
  try {
    const response = await apiInstance.post("/webScrape", { url });
    if (response.status === 200) {
      return response.data;
    } else {
      toast.error("Failed to scrape website!");
    }
  } catch (error: any) {
    toast.error(error.response.data.message);
    // throw new Error("Failed to scrape website");
  }
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
    // throw new Error("Failed to scrape website");
  }
};
