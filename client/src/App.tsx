import { Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar/Navbar";
import SearchBar from "./components/Home/SearchBar";
import { useContext, useEffect } from "react";
import { motion } from "motion/react";
import LogNPrompt from "./components/Home/LogNPrompt";
import LivePreview from "./components/Home/LivePreview";
import { useMediaQuery } from 'react-responsive';
import { Context } from "./context/statesContext";

export function Home() {
  const {domain, sentQuery, setIFrameSrc} = useContext(Context)
  const isMobile = useMediaQuery({ query: '(max-width: 970px)' });

  useEffect(() => {
    setIFrameSrc(`${import.meta.env.VITE_CLIENT_URL}/scraped_website/${domain}/index.html`);
  }, [domain]);
  return (
    <motion.div className="flex flex-col h-full">
      <motion.div
        className="flex flex-col justify-end max-[970px]:justify-center w-full items-center gap-y-8"
        initial={{ height: 500, opacity: 1 }}
        animate={sentQuery ? { height: 0, opacity: 0 } : { height: 500, opacity: 1 }}
        transition={sentQuery ? { duration: 1, delay: 0.1 } : { duration: 1, delay: 1 }}
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
          <SearchBar />
        </motion.div>
      </motion.div>
      
      <div className={`flex max-[970px]:pb-16 max-[970px]:items-center w-full  ${sentQuery && isMobile ? "min-h-screen overflow-y-auto flex-col" : " h-full overflow-y-hidden flex-row"}  gap-x-20 overflow-x-hidden`}>
        <motion.div
          className="flex items-center h-full max-[970px]:py-5 w-1/3 max-[970px]:w-3/4 max-[580px]:w-11/12 max-[970px]:min-h-[620px]"
          initial={{ x: -400, opacity: 0 }}
          animate={sentQuery ? { x: isMobile ? 0 : 20, opacity: 1 } : { x: -400, opacity: 0 }}
          transition={sentQuery ? { duration: 1, delay: 1 } : { duration: 1, delay: 0 }}
        >
          <LogNPrompt />
        </motion.div>
        <motion.div
          className="flex items-center w-2/3 h-full max-[970px]:py-5 max-[970px]:w-3/4 max-[580px]:w-11/12 max-[970px]:min-h-[650px]"
          initial={{ x: -20, scale: 0.8, opacity: 0 }}
          animate={sentQuery ? { x: isMobile ? 0 : -20, scale: 1, opacity: 1 } : { x: -20, scale: 0.8, opacity: 0 }}
          transition={sentQuery ? { duration: 1, delay: 1 } : { duration: 1, delay: 0 }}
        >
          <LivePreview />
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