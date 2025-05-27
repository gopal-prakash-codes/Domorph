import { createContext, useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import toast from 'react-hot-toast';
import { webScrape } from '../api/useApi';

interface FormData {
    query: string;
    prompt: string;
}
interface ScrapeResult {
    isScraped: boolean;
    content: string;
    structure: Array<{ type: string; name: string; children?: any[] }>;
    progress: string[];
    domain: string;
  }
  
interface ElementInfo {
    tagName: string;
    innerText: string;
    fileName: string;
    xpath: string;
  }
  type ContextType = {
    domain: string;
    setDomain: React.Dispatch<React.SetStateAction<string>>;
    sentQuery: boolean;
    setSentQuery: React.Dispatch<React.SetStateAction<boolean>>;
    formData: ReturnType<typeof useForm<FormData>>;
    loading: boolean;
    setLoading: React.Dispatch<React.SetStateAction<boolean>>;
    getData: ScrapeResult;
    setGetData: React.Dispatch<React.SetStateAction<ScrapeResult>>;
    progress: string[];
    setProgress: React.Dispatch<React.SetStateAction<string[]>>;
    onSubmit: SubmitHandler<FormData>;
    inspecting: boolean;
    setInspecting: React.Dispatch<React.SetStateAction<boolean>>;
    iFrameSrc: string;
    setIFrameSrc: React.Dispatch<React.SetStateAction<string>>;
    selectedElInfo: ElementInfo[];
    setSelectedElInfo: React.Dispatch<React.SetStateAction<ElementInfo[]>>;
    handleDownload: (url: string) => void;
  };

export const Context = createContext<ContextType>({} as ContextType);

export default function Provider({ children }: { children: React.ReactNode }) {
    const [domain, setDomain] = useState<string>("");
    const [sentQuery, setSentQuery] = useState<boolean>(false);
    const formData = useForm<FormData>();
    const [progress, setProgress] = useState<string[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [getData, setGetData] = useState<ScrapeResult>({
      isScraped: false,
      content: "",
      structure: [{ type: "file", name: "" }],
      progress: [],
      domain: "",
    });
    const [inspecting, setInspecting] = useState(false);
    const [iFrameSrc, setIFrameSrc] = useState("");
    const [selectedElInfo, setSelectedElInfo] = useState<ElementInfo[]>([]);
    
  const handleDownload = (url: string) => {
    const link = document.createElement("a");
    link.href = `${
      import.meta.env.VITE_API_URL
    }/api/download-zip?domain=${url}`;
    console.log(link.href);

    link.setAttribute("download", `${url}.zip`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

    
  const onSubmit: SubmitHandler<FormData> = async (data, event) => {
    event?.preventDefault(); // Prevent page reload if event exists
    if (data.query) {
      let input = data.query.trim();
      const correctedUrl = input.startsWith("http") ? input : `https://${input}`;
      setLoading(true);
      setSentQuery(true);
      try {
        const response = await webScrape(correctedUrl, (path: string, domain: string) => {
          setProgress((prev) => [path, ...prev]); // Update progress in real-time
          setDomain(domain);
        });
        setLoading(false);
        setGetData({
          isScraped: response.isScraped,
          content: response.content,
          structure: response.structure,
          progress: response.progress,
          domain: response.domain,
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
          domain: "",
        });
      }
    }
  };
    return (
        <Context.Provider value={{domain, setDomain, sentQuery, setSentQuery, formData, progress, setProgress, loading, setLoading, getData, setGetData, onSubmit, inspecting, setInspecting, iFrameSrc, setIFrameSrc, selectedElInfo, setSelectedElInfo, handleDownload}}>
          {children}
        </Context.Provider>
      );
};