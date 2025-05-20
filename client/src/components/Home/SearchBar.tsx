import { Search, Send, SendHorizonal } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
import { promptToLlm, webScrape } from "../../api/useApi";

type getDataType = {
  isScraped: boolean;
  content: string;
  structure: { type: string; name: string }[];
};

export default function SearchBar({
  register,
  handleSubmit,
  setValue,
  watch,
  setSentQuery,
}: {
  register: any;
  handleSubmit: any;
  setValue: any;
  watch: any;
  setSentQuery: any;
}) {
  const [getData, setGetData] = useState<getDataType>({
    isScraped: false,
    content: ``,
    structure: [{ type: `file`, name: `` }],
  });
  const [loading, setLoading] = useState(false);
  const [openSelect, setOpenSelect] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [popoverWidth, setPopoverWidth] = useState<number>(0);

  const onSubmit = async (data: any) => {
    if (data.query) {
      setLoading(true);
      setSentQuery(true);
      try {
        // const response = await webScrape(data.query)
        // console.log(response);
        
        const response = {
          isScraped: true,
          message: `Scraped 4 pages`,
          structure: [
            { type: "file", name: "about.html" },
            { type: "file", name: "index.html" },
            { type: "file", name: "subscription.html" },
            { type: "file", name: "talk.html" },
          ],
        };
        setLoading(false);
        setGetData({
          isScraped: true,
          content: response.message,
          structure: response.structure,
        });
        setValue("query", "");
      } catch (error) {
        setLoading(false);
        console.log(error);
        setGetData({
          isScraped: false,
          content: `Couldn't scrape your website!`,
          structure: [],
        });
      }
    }
  };

  const sendPromptToLlm = async(data: any) => {
    const response = await promptToLlm(data.prompt);
    setGetData({
      ...getData,
      isScraped: true,
      content: response.message,
    })
  }

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
    <div className="flex flex-col items-center justify-center w-full h-full">
      <form className="relative w-full" onSubmit={handleSubmit(onSubmit)}>
          {/* <div className="flex flex-col relative w-full">
            <input
              ref={inputRef}
              {...register("prompt")}
              placeholder="Change the color of the @plus/application-ui button"
              className="w-full py-2 pl-5 pr-12 border-2 border-gray-300 rounded-full outline-none"
            />

            <Popover open={openSelect} onOpenChange={setOpenSelect}>
              <PopoverTrigger />
              <PopoverContent
                className="p-0 z-50 bg-base-content"
                style={{
                  width: `${popoverWidth}px`,
                }}
              >
                <Command>
                  <CommandInput placeholder="Search file..." className="h-9" />
                  <CommandList>
                    <CommandEmpty>No file found.</CommandEmpty>
                    <CommandGroup>
                      {getData.structure.map((file) => (
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
            <button
              type="button"
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full flex items-center justify-center cursor-pointer"
              onClick={handleSubmit(sendPromptToLlm)}
            >
              <SendHorizonal size={20} />
            </button>
          </div> */}

          <div className="flex flex-col">
            <input
              type="text"
              list="list"
              {...register("query")}
              placeholder="https://www.vonage.com/"
              className="w-full py-2 pl-5 pr-12 border-2 border-gray-300 rounded-full outline-none"
            />
            <datalist id="list">
              <option value="https://tailwindcss.com/">Tailwindcss</option>
              <option value="https://mrwhite-gilt.vercel.app/">Mr white</option>
            </datalist>
            <button
              type="submit"
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full flex items-center justify-center cursor-pointer"
            >
              <Search size={20} />
            </button>
          </div>
      </form>

      {/* <div className="flex flex-col h-full p-10">
        {loading ? (
          <motion.div
            className="flex flex-col items-center justify-center h-full"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
          >
            <p>Scraping your website...</p>
          </motion.div>
        ) : getData.isScraped ? (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center justify-center w-full gap-y-10"
          >
            <div className="flex flex-col items-center">
              <p>{getData.content}</p>
              <a
                href="http://localhost:3000/scraped_website/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Have a look
              </a>
            </div>
          </motion.div>
        ) : (
          <div className="flex flex-col items-center justify-center w-full h-full">
            <p>{getData.content}</p>
          </div>
        )}
      </div> */}
    </div>
  );
}
