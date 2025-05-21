import { FaHtml5 } from "react-icons/fa";
import { motion } from "motion/react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command";
import { SendHorizonal } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { modifyUI } from "../../api/useApi";
import { toast } from "react-hot-toast";

// type fileType = string[]
// const files = [
//   "index.html",
//   "docs/translate.html",
//   "docs/opacity.html",
//   "docs/display.html",
//   "docs/animation.html",
//   "docs/before.html",
// ];
export default function LogNPrompt({
  loading,
  register,
  handleSubmit,
  watch,
  setValue,
  getData,
  setGetData,
  progress,
  domain
}: {
  loading: any;
  register: any;
  handleSubmit: any;
  watch: any;
  setValue: any;
  getData: any;
  setGetData: any;
  progress: string[];
  domain: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [openSelect, setOpenSelect] = useState(false);
  const [popoverWidth, setPopoverWidth] = useState<number>(0);
  const [modifying, setModifying] = useState(false);
  const [modifiedFiles, setModifiedFiles] = useState<Array<{ name: string; path: string }>>([]);
  const [statusMessage, setStatusMessage] = useState("");

  const sendPromptToAgent = async (data: any) => {
    if (!data.prompt || !domain) {
      toast.error("Please enter a prompt and ensure a website has been scraped");
      return;
    }

    setModifying(true);
    setStatusMessage("Analyzing and modifying UI...");

    try {
      const result = await modifyUI(data.prompt, domain);

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

  useEffect(() => {
    if (watch("prompt")?.endsWith("@")) {
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
      <div className="h-9/12">
        <div className="w-11/12 h-full flex flex-col justify-center items-center gap-y-8">
          <div className="flex flex-col items-center">
            {loading ? (
              <h1 className="text-lg flex items-center gap-x-1">
                Scraping
                <span className="loader !w-[20px] !h-[20px] after:!w-[10px] after:!h-[10px]"></span>
              </h1>
            ) : modifying ? (
              <h1 className="text-lg flex items-center gap-x-1">
                <span className="loader !w-[20px] !h-[20px] after:!w-[10px] after:!h-[10px]"></span>
                {statusMessage}
              </h1>
            ) : (
              <h1 className="text-lg flex items-center gap-x-1">
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
                {statusMessage || (domain ? "Ready for modifications" : "Scraped successfully")}
              </h1>
            )}

            <p className="text-sm text-base-content/30">
              {watch("query")}
            </p>
          </div>

          <motion.div className="flex flex-col pb-3 px-3 gap-y-2 relative">
            {modifiedFiles.length > 0 ? (
              modifiedFiles.slice(0, 3).map((file, i) => {
                const scale = 1 - i * 0.1;
                return (
                  <motion.li
                    key={i}
                    animate={{ scale: scale }}
                    transition={{ duration: 0.2 }}
                    className="list-none flex gap-x-1 items-center justify-center text-base bg-green-100 px-3 py-2 rounded-lg h-10"
                    layout
                  >
                    <FaHtml5 color="#4caf50" /> {file.name} (Modified)
                  </motion.li>
                );
              })
            ) : (
              progress?.slice(0, 3)?.map((file, i) => {
                const scale = 1 - i * 0.1;
                return (
                  <motion.li
                    key={i}
                    animate={{ scale: scale }}
                    transition={{ duration: 0.2 }}
                    className="list-none flex gap-x-1 items-center justify-center text-base bg-base-content/10 px-3 py-2 rounded-lg h-10"
                    layout
                  >
                    <FaHtml5 color="#ff4826" /> {file}
                  </motion.li>
                );
              })
            )}
          </motion.div>
        </div>
      </div>
      <div className="flex flex-col items-center h-3/12 pb-6">
        <div className="flex flex-col relative w-full h-full px-5">
          <textarea
            name="prompt"
            id="prompt"
            ref={inputRef}
            {...register("prompt")}
            placeholder="Modify the website design by making the header blue and adding rounded corners to all buttons."
            className="w-full h-full pl-5 py-3 pr-12 shadow-2xl border border-base-content/20 focus:border-base-content/80 rounded-lg outline-none resize-none "
            disabled={modifying || loading}
          />

          <button
            type="button"
            className={`absolute bottom-2 right-8 rounded-lg cursor-pointer flex items-center gap-x-1 ${modifying || loading ? "bg-gray-300 cursor-not-allowed" : "bg-base-300/50 hover:bg-base-300"
              } p-2 text-sm`}
            onClick={handleSubmit(sendPromptToAgent)}
            disabled={modifying || loading}
          >
            {modifying ? "Processing..." : "Modify UI"} <SendHorizonal size={17} />
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
  );
}
