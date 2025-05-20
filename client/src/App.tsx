import { Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import SearchBar from "./components/Home/SearchBar";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { motion } from "motion/react";
import LogNPrompt from "./components/Home/LogNPrompt";
import LivePreview from "./components/Home/LivePreview";

export function Home() {
  const { register, handleSubmit, setValue, watch } = useForm();
  const [sentQuery, setSentQuery] = useState(false);
  return (
    <motion.div className="flex flex-col h-full">
      <motion.div
        className="flex flex-col justify-end w-full items-center gap-y-8"
        initial={{ height: 700, opacity: 1 }}
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
            setValue={setValue}
            watch={watch}
            setSentQuery={setSentQuery}
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
          <LogNPrompt />
        </motion.div>
        <motion.div
          className="flex items-center w-2/3 h-full"
          initial={{ x: -20, scale: 0.8, opacity: 0 }}
          animate={sentQuery && { x: -20, scale:1 , opacity: 1 }}
          transition={{ duration: 1.4, delay: 1 }}
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
