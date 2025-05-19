import { Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import SearchBar from "./components/Home/SearchBar";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { motion } from "motion/react";

export function Home() {
  const { register, handleSubmit, setValue, watch } = useForm();
  const [sentQuery, setSentQuery] = useState(false);
  return (
    <motion.div
      className="flex flex-col items-center h-full gap-y-8"
    >
      <motion.div
        className="flex flex-col w-1/2 items-center justify-center"
        initial={{ opacity: 0, y: 100 }}
        animate={sentQuery ? { opacity: 0, y: -100, height: 0 } : { opacity: 1, y: 0, height: "auto" }}
        transition={{ duration: 0.7 }}
      >
        <h1 className="text-4xl font-bold">Welcome to Domorph</h1>
        <p className="text-lg text-center">
          Domorph is a platform for creating and sharing your own morphs.
        </p>
      </motion.div>

      <div className="flex flex-col w-1/3 h-full">
        <SearchBar
          register={register}
          handleSubmit={handleSubmit}
          setValue={setValue}
          watch={watch}
          setSentQuery={setSentQuery}
        />
      </div>
    </motion.div>
  );
}

function App() {
  return (
    <div className="bg-base-300 text-base-content">
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
