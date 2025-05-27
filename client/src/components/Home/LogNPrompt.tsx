import { FaHtml5 } from "react-icons/fa";
import { motion, AnimatePresence } from "motion/react";
import {
  BadgeX,
  CheckCheck,
  CircleAlert,
  PictureInPicture,
  SendHorizonal,
  StepBack,
  WandSparkles,
} from "lucide-react";
import { useContext, useEffect, useState } from "react";
import { TypingAnimation } from "../magicui/typing-animation";
import { promptToLlm } from "../../api/useApi";
import { toast } from "react-hot-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Context } from "../../context/statesContext";

const modifyingLogs = [
  {
    code: `<button type="button"
  className="rounded-lg p-2 text-sm m-3">
     Processing...
</button>`,
  },
  {
    code: `<motion.li
  initial={{ y: -30, opacity: 0 }}
  animate={{ y: 0, opacity: 1 }}
  transition={{ duration: 0.4 }}
  key={i}
  >
    <span className="flex gap-x-1 items-center">
      <FaHtml5 color="#ff4826" /> {file}
    </span>
</motion.li>`,
  },
  {
    code: `<iframe
  src="clientUrl/scraped_website/index.html"
  width="100%"
  height="100%"
  style={{
    zoom: 0.7,
  }}
  allowFullScreen
></iframe>`,
  },
  {
    code: `<div className="flex flex-col bg-base-content/20 p-2 rounded-md *:flex *:gap-x-1">
  <p>
    <strong>File:</strong>
    {selectedElInfo.url}
  </p>
  <p>
    <strong>Tag:</strong> {selectedElInfo.tagName}
  </p>
</div>`,
  },
  {
    code: `<div className="flex flex-col bg-base-content/20 p-2 rounded-md *:flex *:gap-x-1">
  <p>
    <strong>File:</strong>
    {selectedElInfo.url}
  </p>
  <p>
    <strong>Tag:</strong> {selectedElInfo.tagName}
  </p>
</div>`,
  },
];

export default function LogNPrompt() {
  const {formData, selectedElInfo, setSelectedElInfo, inspecting, setInspecting, setIFrameSrc, progress, domain, getData, loading, setSentQuery, selectedFile, setSelectedFile, statusMessage, setStatusMessage, setProgress, setDomain} = useContext(Context);
  const [modifying, setModifying] = useState(false);
  const [displayLogs, setDisplayLogs] = useState<{
    code: string;
  }>(modifyingLogs[0]);

  const sendPromptToAgent = async () => {
    if (!formData?.watch("prompt") || !domain) {
      toast.error(
        "Please enter a prompt and ensure a website has been scraped"
      );
      return;
    }
    
    const cleaned = formData?.watch("prompt").replace(`@${selectedFile}`, "").trim();

    setInspecting(false);
    setModifying(true);

    setStatusMessage({
      message: "Analyzing and modifying UI...",
      icon: "success",
    });

    try {
      const result = await promptToLlm(cleaned, domain, selectedFile, selectedElInfo[0].xpath);
      

      if (result.status === "success") {
        // setModifiedFiles(result.modified_files);
        setIFrameSrc(`${import.meta.env.VITE_CLIENT_URL}/scraped_website/${domain}/index.html`);
        setStatusMessage({
          message: `Successfully modified!`,
          icon: "success",
        });

        // Trigger a reload of the preview iframe to show changes
        const previewIframe = document.querySelector(
          "iframe"
        ) as HTMLIFrameElement;
        previewIframe.contentWindow?.location.reload();
      } else {
        setStatusMessage({
          message: `Please retry after some time!`,
          icon: "warning",
        });
      }
    } catch (error) {
      console.error("Error modifying UI:", error);
      setStatusMessage({
        message: "Failed to modify UI. Please try again.",
        icon: "error",
      });
    } finally {
      setModifying(false);
    }
  };
  const goBack = () => {
    setSentQuery(false);
    setInspecting(false);
    setModifying(false);
    setSelectedElInfo([]);
    setDomain("");
    setProgress([]);
    setSelectedFile("");
  }

  useEffect(() => {
    let currentIndex = 0;
    let intervalId: NodeJS.Timeout;

    if (modifying) {
      // Set initial log
      setDisplayLogs(modifyingLogs[0]);

      // Start interval to cycle through logs
      intervalId = setInterval(() => {
        currentIndex = (currentIndex + 1) % modifyingLogs.length;
        setDisplayLogs(modifyingLogs[currentIndex]);
      }, 7000); // Change log every 5 seconds
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [modifying]);

  useEffect(() => {
    formData?.setValue("prompt", `@${selectedFile}` + " ");
  }, [selectedFile]);
  
  useEffect(() => {
    const promptValue = formData?.watch("prompt");
    if (!promptValue || !promptValue.includes(`@${selectedFile}`)) {
      setSelectedFile("");
      setSelectedElInfo([])
    }
  }, [formData?.watch("prompt"), selectedFile]);

  useEffect(() => {
    const fileName = selectedElInfo?.[0]?.fileName;
    if (fileName) {
      setSelectedFile(fileName);
    }
  }, [selectedElInfo]);

  return (
    <div className="bg-base-100 rounded-lg h-11/12 max-[970px]:h-full w-full flex flex-col justify-between">
      <div className="h-8/12 flex flex-col items-center">
        <div className="w-11/12 h-full flex flex-col justify-center items-center gap-y-4 py-6 relative">
        <div className="absolute top-3 -left-1 text-base flex items-center gap-x-1 overflow-hidden group cursor-pointer text-base-content/60" onClick={goBack}>
          <span className="z-50 bg-base-100 h-full flex items-center"><StepBack size={16}/></span>
          <span className="-translate-x-28 group-hover:translate-x-0 transition-all duration-200">New scrape</span>
        </div>
          <div className="flex flex-col justify-center items-center h-1/6">
            {loading ? (
              <h1 className="text-lg flex items-center gap-x-1">
                Scraping
                <span className="loader !w-[20px] !h-[20px] after:!w-[10px] after:!h-[10px]"></span>
              </h1>
            ) : modifying ? (
              <h1 className="text-lg flex items-center gap-x-1">
                <span className="loader !w-[20px] !h-[20px] after:!w-[10px] after:!h-[10px]"></span>
                {statusMessage.message}
              </h1>
            ) : (
              <h1 className="text-lg flex items-center text-center gap-x-1">
                {selectedElInfo?.length > 0 ? (
                  <PictureInPicture size={20} />
                ) : (
                  <>
                    {statusMessage.icon === "success" ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="#019c2b"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="lucide lucide-badge-check-icon lucide-badge-check"
                      >
                        <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" />
                        <path d="m9 12 2 2 4-4" />
                      </svg>
                    ) : statusMessage.icon === "warning" ? (
                      <CircleAlert className="fill-[#8f7700]" size={22} />
                    ) : statusMessage.icon === "modify" ? (
                      <WandSparkles className="fill-[#8f7700]" size={22} />
                    ) : (
                      <BadgeX className="fill-[#BD0000]" size={22} />
                    )}
                  </>
                )}
                {selectedElInfo?.length > 0
                  ? `Inspected element`
                  : statusMessage.message}
              </h1>
            )}

            <p className="text-sm text-base-content/30">{formData?.watch("query")}</p>
          </div>

          <motion.div className="flex flex-col items-center  gap-y-2 relative w-full h-5/6">
            {modifying ? (
              <div className="flex flex-col items-center justify-center relative h-full w-full">
                <AnimatePresence mode="wait">
                  <motion.pre
                    key={displayLogs.code}
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -50, opacity: 0 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    className="absolute w-full bg-base-300 py-3 px-3 rounded-lg border border-base-content/20 h-full overflow-x-auto"
                  >
                    <TypingAnimation
                      duration={25}
                      className="text-base font-[family-name: 'Gabarito', sans-serif]"
                    >
                      {displayLogs.code}
                    </TypingAnimation>
                  </motion.pre>
                </AnimatePresence>
              </div>
            ) : selectedElInfo?.length > 0 ? (
              <div className="flex flex-col w-2/3 max-[440px]:w-full  pt-5">
                <div className="flex flex-col gap-y-3 bg-base-content/20 p-2 rounded-md *:flex *:gap-x-1">
                  <p className="flex max-[1060px]:flex-col">
                    <strong>Tag:</strong> {selectedElInfo[0].tagName}
                  </p>
                  <p className="flex max-[1060px]:flex-col">
                    <strong>Text:</strong> {`${selectedElInfo[0].innerText.substring(0, 20)}...`}
                  </p>
                  <p className="flex max-[1060px]:flex-col">
                    <strong>File:</strong>
                    {selectedElInfo[0].fileName}
                  </p>
                </div>
              </div>
            ) : (
              progress?.slice(0, 3)?.map((file, i) => {
                return (
                  <motion.li
                    initial={{ y: -30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.4 }}
                    key={i}
                    className="list-none pl-15 max-[1200px]:pl-5 max-[970px]:pl-32 max-[760px]:pl-20 max-[610px]:pl-14 max-[430px]:pl-5 max-[330px]:pl-0 flex gap-x-1 items-center text-base justify-start  px-3 py-2 rounded-lg h-10 w-2/3 mx-auto"
                  >
                    <span>
                      <CheckCheck size={16} color="#019c2b" />
                    </span>
                    <span className="flex gap-x-1 items-center">
                      <FaHtml5 color="#ff4826" /> {file}
                    </span>
                  </motion.li>
                );
              })
            )}
          </motion.div>
        </div>
      </div>
      <div className="flex flex-col items-center h-4/12 pb-6">
        <div className="flex flex-col relative w-full h-full px-5">
          {loading ? (
            <>
              <div className="flex justify-center items-center h-full w-full shadow-xl rounded-lg relative overflow-hidden">
                <span className="z-50 text-base-content animate-pulse text-base">
                  Loading files...
                </span>
                <div className="absolute w-full h-full bg-[url('./assets/selectFilesBg3.svg')] blur-md"></div>
              </div>
            </>
          ) : (
            <>
              {selectedFile ? (
                <>
                  <div className="flex flex-col items-end bg-base-100 border border-base-content/20 focus:border-base-content/80 rounded-lg h-full">
                    <div className="flex w-full h-full">
                      <textarea
                        id="prompt"
                        {...formData?.register("prompt")}
                        placeholder="Modify the website design by making the header blue and adding rounded corners to all buttons."
                        className="w-full h-full pl-5 pt-3 pr-12 outline-none resize-none "
                        disabled={modifying || loading}
                      />
                    </div>

                    <button
                      type="button"
                      className={`rounded-lg cursor-pointer flex items-center gap-x-1 ${
                        modifying || loading
                          ? "bg-gray-300 text-base-100/40 cursor-not-allowed"
                          : "bg-base-300/50 hover:bg-base-300 w-fit"
                      } p-2 text-sm m-3`}
                      onClick={sendPromptToAgent}
                      disabled={modifying || loading}
                    >
                      {modifying ? "Processing..." : "Modify UI"}{" "}
                      <SendHorizonal size={17} />
                    </button>
                  </div>
                </>
              ) : (
                
                <Select
                  onValueChange={(value) => {
                    setSelectedFile(value);
                  }}
                >
                    <div className="flex justify-center items-center w-full h-full border rounded-lg relative">
                      <label htmlFor="selectFile" className={`w-full h-full absolute top-0 left-0 flex items-center justify-center px-3 text-center ${inspecting ? 'cursor-default' : 'cursor-pointer'}`}>{inspecting ? "Select any element on preview or Stop inspecting" : "Select any file to modify"}</label>
                      {
                        !inspecting && (
                          <SelectTrigger id="selectFile" className=" w-1/2 h-full border-0 outline-none">
                              <SelectValue placeholder="" className="h-full text-base w-full"/>
                          </SelectTrigger>
                        )
                      }
                    </div>
                  <SelectContent className="bg-base-content w-full">
                    {getData?.structure
                      ?.filter(
                        (file: any) => file?.name && file.name.trim() !== ""
                      )
                      .map((file: any) => (
                        <SelectItem className="w-full hover:bg-base-content/20 cursor-pointer" key={file.name} value={file.name}>
                          {file.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
