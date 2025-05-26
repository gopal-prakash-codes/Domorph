import { Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import SearchBar from "./components/Home/SearchBar";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { motion } from "motion/react";
import LogNPrompt from "./components/Home/LogNPrompt";
import LivePreview from "./components/Home/LivePreview";
import ScreenshotUploader from "./components/ScreenshotUploader";
import WebsiteScreenshotter from "./components/WebsiteScreenshotter";
import Builder from "./components/Builder";

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
  classList: string[];
  inlineStyles: string;
  innerText: string ;
  url: string;
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
  const [selectedElInfo, setSelectedElInfo] = useState<ElementInfo | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<object[]>([]);

  return (
    <motion.div className="flex flex-col h-full">
      <motion.div
        className="flex flex-col justify-end w-full items-center gap-y-8"
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
      <div className="flex w-full h-full gap-x-20">
        <motion.div
          className="flex items-center h-full w-1/3"
          initial={{ x: -400, opacity: 0 }}
          animate={sentQuery && { x: 20, opacity: 1 }}
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
            // selectedFiles={selectedFiles}
            // setSelectedFiles={setSelectedFiles}
          />
        </motion.div>
        <motion.div
          className="flex items-center w-2/3 h-full"
          initial={{ x: 800, scale: 0.8, opacity: 0 }}
          animate={sentQuery && { x: -20, scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, delay: 1 }}
        >
          <LivePreview loading={loading} domain={domain} setSelectedElInfo={setSelectedElInfo} setSelectedFiles={setSelectedFiles} selectedFiles={selectedFiles} />
        </motion.div>
      </div>
    </motion.div>
  );
}

// Screenshot upload page component
export function ScreenshotToCode() {
  return (
    <div className="container mx-auto py-8 px-4 min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <ScreenshotUploader />
    </div>
  );
}

// Website Screenshot page component
export function WebsiteScreenshots() {
  return (
    <div className="container mx-auto py-8 px-4 min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <WebsiteScreenshotter />
    </div>
  );
}

function App() {
  return (
    <div className="bg-gradient-to-b from-blue-50 to-slate-100 min-h-screen">
      <Navbar />
      <div className="flex flex-col min-h-[calc(100vh-64px)]">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/builder" element={<Builder />} />
          <Route path="/screenshot" element={<ScreenshotToCode />} />
          <Route path="/website-screenshots" element={<WebsiteScreenshots />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;