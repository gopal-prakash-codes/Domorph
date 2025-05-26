import { HardDriveDownload, Inspect } from "lucide-react";
import { useEffect, useRef } from "react";
import ToolTip from "../ToolTip";

export default function LivePreview({
  loading,
  domain,
  inspecting,
  setInspecting,
  setSelectedElInfo,
  iFrameSrc
}: {
  loading: boolean;
  domain: string;
  inspecting: boolean;
  setInspecting: any;
  setSelectedElInfo: any;
  iFrameSrc: string;
}) {
  const clientUrl = import.meta.env.VITE_CLIENT_URL || "http://127.0.0.1:5173";

  const inspectingRef = useRef(inspecting);
  const injectedRef = useRef(false);
  const cleanupRef = useRef<() => void>(() => {});

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = `${
      import.meta.env.VITE_API_URL
    }/api/download-zip?domain=${domain}`;
    console.log(link.href);

    link.setAttribute("download", `${domain}.zip`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  function getXPath(element: HTMLElement): string {
    if (element.id) {
      return `//*[@id="${element.id}"]`;
    }

    const parts = [];
    while (element && element.nodeType === Node.ELEMENT_NODE) {
      let index = 1;
      let sibling = element.previousElementSibling;
      while (sibling) {
        if (sibling.tagName === element.tagName) {
          index++;
        }
        sibling = sibling.previousElementSibling;
      }
      const tagName = element.tagName.toLowerCase();
      const part = `${tagName}[${index}]`;
      parts.unshift(part);
      element = element.parentElement!;
    }
    return "/" + parts.join("/");
  }

  const injectIntoIframe = () => {
    if (!inspectingRef.current) return;

    const iframe = document.querySelector("iframe");
    if (!iframe) return;

    const onLoad = () => {
      if (!inspectingRef.current) return;

      const iframeDoc =
        iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) return;

      cleanupRef.current?.();

      const handleMouseOver = (e: MouseEvent) => {
        if (!inspectingRef.current) return;
        const target = e.target as HTMLElement;
        if (target?.style) target.style.outline = "2px solid red";
      };

      const handleMouseOut = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target?.style) target.style.outline = "";
      };

      const handleClick = (e: MouseEvent) => {
        if (!inspectingRef.current) return;
        e.preventDefault();
        e.stopPropagation();

        const target = e.target as HTMLElement;
        if (!target) return;

        const xpath = getXPath(target);

        const info = {
          tagName: target.tagName.toLowerCase(),
          classList: Array.from(target.classList),
          inlineStyles: target.getAttribute("style") || "",
          innerText:
            target.innerText?.trim() || target.textContent?.trim() || "None",
          url: iframeDoc.location.pathname.replace(
            /^\/scraped_website\/[^/]+\//,
            ""
          ),
          xpath,
        };

        setSelectedElInfo([
          {
            fileName: iframeDoc.location.pathname.replace(
              /^\/scraped_website\/[^/]+\//,
              ""
            ),
            xpath,
            tagName: target.tagName.toLowerCase(),
            innerText:
              target.innerText?.trim() || target.textContent?.trim() || "None",
          },
        ]);

        window.postMessage({ type: "iframe-inspect", data: info }, "*");
      };

      const handleIframeUnload = () => {
        cleanupRef.current?.();
        injectedRef.current = false;
      };

      iframeDoc.addEventListener("mouseover", handleMouseOver);
      iframeDoc.addEventListener("mouseout", handleMouseOut);
      iframeDoc.addEventListener("click", handleClick, true);
      iframeDoc.defaultView?.addEventListener(
        "beforeunload",
        handleIframeUnload
      );

      cleanupRef.current = () => {
        iframeDoc.removeEventListener("mouseover", handleMouseOver);
        iframeDoc.removeEventListener("mouseout", handleMouseOut);
        iframeDoc.removeEventListener("click", handleClick, true);
        iframeDoc.defaultView?.removeEventListener(
          "beforeunload",
          handleIframeUnload
        );
        injectedRef.current = false;
      };

      injectedRef.current = true;
    };

    iframe.removeEventListener("load", onLoad);
    if (inspectingRef.current) {
      iframe.addEventListener("load", onLoad);

      if (iframe.contentDocument?.readyState === "complete") {
        onLoad();
      }
    }
  };

  const handleIframeMessage = (e: MessageEvent) => {
    if (e.data?.type === 'iframe-inspect') {
      console.log("XPath of selected element:", e.data.data.xpath);
      // setSelectedElInfo(() => {
      //   return e.data?.data ? [e.data.data] : [];
      // });
    }
  };

  useEffect(() => {
    inspectingRef.current = inspecting;
    if (!inspecting) return;

    injectIntoIframe();
    window.addEventListener("message", handleIframeMessage);

    return () => {
      cleanupRef.current(); // cleans up iframe
      window.removeEventListener("message", handleIframeMessage);
    };
  }, [inspecting]);
  return (
    <div className="flex flex-col items-center w-full h-11/12 border border-base-content/20 rounded-lg text-base-100">
      <div className="flex items-center justify-between bg-base-100 border-b border-base-content/20 text-base-content w-full px-5 py-3 rounded-t-lg">
        <div className="flex flex-col max-[540px]:w-1/2 flex-wrap">
          <h1>Live Preview</h1>
          <p className="text-sm text-base-content/30 ">
            {domain
              ? `${clientUrl}/scraped_website/${domain}`
              : `${clientUrl}/scraped_website`}
          </p>
        </div>

        <div className="flex items-center justify-end gap-x-5 max-[540px]:w-1/2">
          {!loading && (
            <div className="flex items-center gap-x-5">
              <ToolTip content="Save">
                <button type="button" onClick={handleDownload}>
                  <HardDriveDownload size={20} className="cursor-pointer" />
                </button>
              </ToolTip>
              <ToolTip
                content={`${inspecting ? "Stop Inspecting" : "Inspect"}`}
              >
                <button
                  id="inspect-button"
                  onClick={() => {
                    setInspecting((prev: boolean) => !prev);
                  }}
                >
                  {/* {inspecting ? 'Stop Inspecting' : 'Start Inspecting'} */}
                  <Inspect
                    size={18}
                    className={`${
                      inspecting ? `text-success` : `text-base-content`
                    } cursor-pointer`}
                  />
                </button>
              </ToolTip>
            </div>
          )}
          <div className="flex gap-x-2">
            <span className="w-3 h-3 bg-green-600 rounded-full"></span>
            <span className="w-3 h-3 bg-yellow-600 rounded-full"></span>
            <span className="w-3 h-3 bg-red-600 rounded-full"></span>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center h-full w-full">
        {loading ? (
          <span className="loader"></span>
        ) : (
          <iframe
            src={domain && iFrameSrc}
            width="100%"
            height="100%"
            style={{
              zoom: 0.7,
            }}
            allowFullScreen
          ></iframe>
        )}
      </div>

      <div className="asbolute">
        {/* {selectedElInfo && (
        <div
          id="inspector-panel"
          style={{
            position: 'fixed',
            bottom: 10,
            right: 10,
            background: '#fff',
            border: '1px solid #ccc',
            padding: '10px',
            fontSize: '14px',
            fontFamily: 'monospace',
            zIndex: 9999,
          }}
        >
          <div><strong>Tag:</strong> {selectedElInfo.tagName}</div>
          <div><strong>Classes:</strong> {selectedElInfo.classList.join(' ') || 'None'}</div>
          <div><strong>Inline Styles:</strong> {selectedElInfo.inlineStyles || 'None'}</div>
          <div><strong>Text:</strong> {selectedElInfo.innerText || 'None'}</div>
          <div><strong>URL:</strong> {selectedElInfo.url}</div>
        </div>)} */}
      </div>
    </div>
  );
}
