import { Search } from "lucide-react";
import { webScrape } from "../../api/useApi";
import { type UseFormRegister, type UseFormHandleSubmit, type FieldErrors, type SubmitHandler } from "react-hook-form";
import { toast } from "react-hot-toast";

// Define form data interface
interface FormData {
  query: string;
}

// Define scrape result interface (matches useApi.ts)
interface ScrapeResult {
  isScraped: boolean;
  content: string;
  structure: Array<{ type: string; name: string; children?: any[] }>;
  progress: string[];
}

// Define component props
interface SearchBarProps {
  register: UseFormRegister<FormData>;
  handleSubmit: UseFormHandleSubmit<FormData>;
  errors: FieldErrors<FormData>;
  setSentQuery: (value: boolean) => void;
  setLoading: (value: boolean) => void;
  setGetData: (data: ScrapeResult) => void;
  setProgress: React.Dispatch<React.SetStateAction<string[]>>;
}

export default function SearchBar({
  register,
  handleSubmit,
  errors,
  setSentQuery,
  setLoading,
  setGetData,
  setProgress
}: SearchBarProps) {

  const onSubmit: SubmitHandler<FormData> = async (data, event) => {
    event?.preventDefault(); // Prevent page reload if event exists
    if (data.query) {
      let input = data.query.trim();
      const correctedUrl = input.startsWith("http") ? input : `https://${input}`;
      setLoading(true);
      setSentQuery(true);
      try {
        const response = await webScrape(correctedUrl, (path: string) => {
          setProgress((prev) => [path, ...prev]); // Update progress in real-time
        });
        setLoading(false);
        setGetData({
          isScraped: response.isScraped,
          content: response.content,
          structure: response.structure,
          progress: response.progress,
        });
      } catch (error: any) {
        setLoading(false);
        console.error(error);
        toast.error("Couldn't scrape your website!");
        setGetData({
          isScraped: false,
          content: "Couldn't scrape your website!",
          structure: [],
          progress: [],
        });
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full">
      <form className="relative w-full" onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col">
          <div className="flex relative">
            <input
              type="text"
              {...register("query", {
                required: "URL is required",
                pattern: {
                  value:
                    /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w\-._~:/?#[\]@!$&'()*+,;=]*)?$/,
                  message: "Enter a valid URL",
                },
              })}
              placeholder="https://www.vonage.com/"
              className="w-full py-2 pl-5 pr-12 border-2 border-gray-300 rounded-full outline-none"
            />
            <button
              type="submit"
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full flex items-center justify-center cursor-pointer"
            >
              <Search size={20} />
            </button>
          </div>
          <span
            className={`${errors.query ? "visible" : "invisible"} text-sm text-error pl-5 pt-1`}
          >
            {errors?.query?.message || "Error"}
          </span>
        </div>
      </form>
    </div>
  );
}