import { FaHtml5 } from "react-icons/fa";
import { motion, AnimatePresence } from "motion/react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command";
import { CheckCheck, PictureInPicture, SendHorizonal } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { TypingAnimation } from "../magicui/typing-animation";
import { webEnhance } from "../../api/useApi";
import { toast } from "react-hot-toast";
import { v4 as uuid } from 'uuid';

const modifyingLogs = [
  {
    content: "Analyzing and modifying UI...",
    code: 
`<button type="button"
  className="rounded-lg p-2 text-sm m-3">
     Processing...
</button>`,
  },
  {
    content: "Calling AI...",
    code: 
`<motion.li
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
    content: "AI modification in progress...",
    code: 
`<iframe
  src="clientUrl/scraped_website/index.html"
  width="100%"
  height="100%"
  style={{
    zoom: 0.7,
  }}
  allowFullScreen
></iframe>`,
  },
];
export default function LogNPrompt({
  loading,
  register,
  handleSubmit,
  watch,
  setValue,
  getData,
  progress,
  domain,
  selectedElInfo,
}: // selectedFiles,
// setSelectedFiles
{
  loading: any;
  register: any;
  handleSubmit: any;
  watch: any;
  setValue: any;
  getData: any;
  progress: string[];
  domain: string;
  selectedElInfo: any;
  // selectedFiles: any,
  // setSelectedFiles: any
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [openSelect, setOpenSelect] = useState(false);
  const [popoverWidth, setPopoverWidth] = useState<number>(0);
  const [modifying, setModifying] = useState(false);
  const [modifiedFiles, setModifiedFiles] = useState<
    Array<{ name: string; path: string }>
  >([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [displayLogs, setDisplayLogs] = useState<{
    content: string;
    code: string;
  }>(modifyingLogs[0]);

  // const changeDisplayLogs = () => {
  //   setDisplayLogs(modifyingLogs[2]);
  // }
  const sendPromptToAgent = async (data: any) => {
    if (!data.prompt || !domain) {
      toast.error("Please enter a prompt and ensure a website has been scraped");
      return;
    }

    setModifying(true);

    setStatusMessage("Analyzing and modifying UI...");

    try {
      const result = await webEnhance(data.prompt, uuid(), domain);

      if (result.success) {
        setModifiedFiles(result.modified_files);
        setStatusMessage(`Successfully modified ${result.modified_files.length} files`);

        // Trigger a reload of the preview iframe to show changes
        const previewIframe = document.querySelector('iframe') as HTMLIFrameElement;
        if (previewIframe && previewIframe.contentWindow) {
          previewIframe.contentWindow.location.reload();
        }
      } else {
        setStatusMessage(result.message);
      }
    } catch (error) {
      console.error("Error modifying UI:", error);
      setStatusMessage("Failed to modify UI. Please try again.");
    } finally {
      setModifying(false);
    }
  };

  // const sendPromptToAgent = async () => {
  //   // setModifying(true);
  //   // setStatusMessage("Analyzing and modifying UI...");

  //   // try {
  //   //   for (let i = 0; i < 3; i++) {
  //   //     let log = modifyingLogs[i];
  //   //     console.log(log);
  //   //     setDisplayLogs(log);
  //   //     await new Promise(resolve => setTimeout(resolve, 5000));
  //   //   }
      
  //   //   setStatusMessage("UI modified successfully");
  //   // } finally {
  //   //   setModifying(false);
  //   // }
  // };
  useEffect(() => {
    const currentPrompt = watch("prompt");
    if (typeof currentPrompt === "string" && currentPrompt.endsWith("@")) {
      setOpenSelect(true);
    } else {
      setOpenSelect(false);
    }
  }, [watch("prompt")]);

  useLayoutEffect(() => {
    const updateWidth = () => {
      if (inputRef.current) {
        setPopoverWidth(inputRef.current.offsetWidth);
      } else {
        setPopoverWidth(300); // fallback width
      }
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  return (
    <div className="bg-base-100 rounded-lg h-11/12 w-full flex flex-col justify-between">
      <div className="h-8/12 flex flex-col items-center">
        <div className="w-11/12 h-full flex flex-col justify-center items-center gap-y-4 py-6">
          <div className="flex flex-col justify-center items-center h-1/6">
            {loading ? (
              <h1 className="text-lg flex items-center gap-x-1">
                Scraping
                <span className="loader !w-[20px] !h-[20px] after:!w-[10px] after:!h-[10px]"></span>
              </h1>
            ) : modifying ? (
              <h1 className="text-lg flex items-center gap-x-1">
                <span className="loader !w-[20px] !h-[20px] after:!w-[10px] after:!h-[10px]"></span>
                {displayLogs.content}
              </h1>
            ) : (
              <h1 className="text-lg flex items-center gap-x-1">
                {selectedElInfo?.tagName ? (
                  <PictureInPicture size={20} />
                ) : (
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
                )}
                {selectedElInfo?.tagName
                  ? `Inspected element`
                  : statusMessage ||
                    (domain
                      ? "Ready for modifications"
                      : "Scraped successfully")}
              </h1>
            )}

            <p className="text-sm text-base-content/30">{watch("query")}</p>
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
                      <TypingAnimation duration={25} className="text-base font-[family-name: 'Gabarito', sans-serif]">{displayLogs.code}</TypingAnimation>
                    </motion.pre>
                  </AnimatePresence>
              </div>
            ) : selectedElInfo?.tagName ? (
              <div className="flex flex-col w-2/3 pl-5">
                <div className="flex flex-col bg-base-content/20 p-2 rounded-md *:flex *:gap-x-1">
                  <p>
                    <strong>File:</strong>
                    {selectedElInfo.url}
                  </p>
                  <p>
                    <strong>Tag:</strong> {selectedElInfo.tagName}
                  </p>
                  <p>
                    <strong>Text:</strong>{" "}
                    {`${selectedElInfo.innerText.substring(0, 20)}...` ||
                      "None"}
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
                    className="list-none pl-10 max-[1200px]:pl-5 max-[1070px]:pl-3 max-[980px]:pl-0 flex gap-x-1 items-center text-base justify-start  px-3 py-2 rounded-lg h-10 w-2/3 mx-auto"
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
          <div className="flex flex-col items-end bg-base-100 border border-base-content/20 focus:border-base-content/80 rounded-lg h-full">
            <div className="flex w-full h-full">
              <textarea
                name="prompt"
                id="prompt"
                ref={inputRef}
                {...register("prompt")}
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
              onClick={handleSubmit(sendPromptToAgent)}
              disabled={modifying || loading}
            >
              {modifying ? "Processing..." : "Modify UI"}{" "}
              <SendHorizonal size={17} />
            </button>

            <Popover open={openSelect} onOpenChange={setOpenSelect}>
              <PopoverTrigger />
              <PopoverContent
                className="p-0 z-50 bg-base-content absolute !-top-20 !-right-30"
                style={{
                  width: `${popoverWidth}px`,
                }}
              >
                <Command>
                  <CommandInput placeholder="Search file..." className="h-9" />
                  <CommandList>
                    <CommandEmpty>No file found.</CommandEmpty>
                    <CommandGroup>
                      {getData.structure.map((file: any) => (
                        <CommandItem
                          key={file.name}
                          value={file.name}
                          onSelect={(selectedValue) => {
                            const currentPrompt: string = watch("prompt");
                            const atIndex = currentPrompt.lastIndexOf("@");

                            if (atIndex !== -1) {
                              const newPrompt =
                                currentPrompt.slice(0, atIndex + 1) +
                                selectedValue +
                                " ";

                              // Set value and make it "dirty" so RHF tracks it
                              setValue("prompt", newPrompt, {
                                shouldDirty: true,
                              });

                              // Focus input after DOM updates
                              requestAnimationFrame(() => {
                                if (inputRef.current) {
                                  inputRef.current.focus();

                                  // Move cursor to the end
                                  const length = newPrompt.length;
                                  inputRef.current.setSelectionRange(
                                    length,
                                    length
                                  );
                                }
                              });
                            }

                            setOpenSelect(false);
                          }}
                        >
                          {file.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    </div>
  );
}
