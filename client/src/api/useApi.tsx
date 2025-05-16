import apiInstance from "../axiosInstance/axiosInstance";
import { toast} from 'react-hot-toast'  

export const webScrape = async (url: string) => {
  const toastId = toast.loading("Scraping website...");
  try {
    const response = await apiInstance.post("/webScrape", { url });
    if (response.status === 200) {
      toast.success("Website scraped successfully", { id: toastId });
      return response.data;
    } else {
      toast.error("Failed to scrape website!", { id: toastId });
    }
  } catch (error: any) {
    toast.error(error.response.data.message, { id: toastId });
    // throw new Error("Failed to scrape website");
  }
};
