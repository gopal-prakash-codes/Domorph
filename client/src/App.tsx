import { Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import SearchBar from "./components/Home/SearchBar";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import LogNPrompt from "./components/Home/LogNPrompt";
import LivePreview from "./components/Home/LivePreview";
import { useMediaQuery } from 'react-responsive';

// Define form data interface
interface FormData {
  query: string;
}

// Define scrape result interface (aligned with SearchBar and useApi.ts)
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
export function Home() {
  const [progress, setProgress] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>();
  const [sentQuery, setSentQuery] = useState<boolean>(false);
  const [domain, setDomain] = useState<string>("");
  const [getData, setGetData] = useState<ScrapeResult>({
    isScraped: false,
    content: "",
    structure: [{ type: "file", name: "" }],
    progress: [],
    domain: "",
  });
  const [inspecting, setInspecting] = useState(false);
  const [iFrameSrc, setIFrameSrc] = useState("");
  const [selectedElInfo, setSelectedElInfo] = useState<ElementInfo | null>(null);
  const isMobile = useMediaQuery({ query: '(max-width: 970px)' });

  useEffect(() => {
    setIFrameSrc(`${import.meta.env.VITE_CLIENT_URL}/scraped_website/${domain}/index.html`);
  }, [domain]);
  return (
    <motion.div className="flex flex-col h-full">
      <motion.div
        className="flex flex-col justify-end max-[970px]:justify-center w-full items-center gap-y-8"
        initial={{ height: 500, opacity: 1 }}
        animate={sentQuery && { height: 0, opacity: 0 }}
        transition={{ duration: 1, delay: 0.1 }}
      >
        <motion.div className="flex flex-col items-center justify-end w-full p-2">
          <h1 className="text-4xl max-sm:text-2xl font-bold text-center">
            Welcome to Domorph
          </h1>
          <p className="text-lg max-sm:text-base text-center">
            Domorph is a platform for creating and sharing your own morphs.
          </p>
        </motion.div>

        <motion.div className="flex flex-col w-1/2 max-[500px]:w-full px-3">
          <SearchBar
            register={register}
            handleSubmit={handleSubmit}
            errors={errors}
            setSentQuery={setSentQuery}
            setLoading={setLoading}
            setGetData={setGetData}
            setProgress={setProgress}
            setDomain={setDomain}
          />
        </motion.div>
      </motion.div>
      
      <div className={`flex max-[970px]:pb-16 max-[970px]:items-center w-full  ${sentQuery && isMobile ? "min-h-screen overflow-y-auto flex-col" : " h-full overflow-y-hidden flex-row"}  gap-x-20 overflow-x-hidden`}>
        <motion.div
          className="flex items-center h-full max-[970px]:py-5 w-1/3 max-[970px]:w-3/4 max-[580px]:w-11/12 max-[970px]:min-h-[620px]"
          initial={{ x: -400, opacity: 0 }}
          animate={sentQuery && { x: isMobile ? 0 : 20, opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
        >
          <LogNPrompt
            loading={loading}
            register={register}
            handleSubmit={handleSubmit}
            watch={watch}
            setValue={setValue}
            getData={getData}
            progress={progress}
            domain={domain}
            selectedElInfo={selectedElInfo}
            setSelectedElInfo={setSelectedElInfo}
            inspecting={inspecting}
            setIFrameSrc={setIFrameSrc}
          />
        </motion.div>
        <motion.div
          className="flex items-center w-2/3 h-full max-[970px]:py-5 max-[970px]:w-3/4 max-[580px]:w-11/12 max-[970px]:min-h-[650px]"
          initial={{ x: 800, scale: 0.8, opacity: 0 }}
          animate={sentQuery && { x: isMobile ? 0 : -20, scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, delay: 1 }}
        >
          <LivePreview loading={loading} domain={domain} setSelectedElInfo={setSelectedElInfo} inspecting={inspecting} setInspecting={setInspecting} iFrameSrc={iFrameSrc} />
        </motion.div>
      </div>
    </motion.div>
  );
}

function App() {
  return (
    <div className="bg-base-300 text-base-content w-screen overflow-hidden">
      <Navbar />
      <div className="flex flex-col h-[calc(100vh-64px)]">
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;