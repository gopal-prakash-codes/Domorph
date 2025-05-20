export default function LivePreview({ loading, domain }: { loading: boolean; domain: string }) {
  const clientUrl = import.meta.env.VITE_CLIENT_URL || "http://127.0.0.1:5173";

  return (
    <div className="flex flex-col items-center w-full h-11/12 border border-base-content/20 rounded-lg text-base-100">
      <div className="flex items-center justify-between bg-base-100 border-b border-base-content/20 text-base-content w-full px-5 py-3 rounded-t-lg">
        <div className="flex flex-col">
          <h1>Live Preview</h1>
          <p className="text-sm text-base-content/30">
            {domain ? `${clientUrl}/scraped_website/${domain}` : `${clientUrl}/scraped_website`}
          </p>
        </div>
        <div className="flex gap-x-2">
          <span className="w-3 h-3 bg-green-600 rounded-full"></span>
          <span className="w-3 h-3 bg-yellow-600 rounded-full"></span>
          <span className="w-3 h-3 bg-red-600 rounded-full"></span>
        </div>
      </div>
      <div className="flex flex-col items-center justify-center h-full w-full">
        {
          loading ?
            <span className="loader"></span>
            :
            <iframe
              src={domain ? `${clientUrl}/scraped_website/${domain}/index.html` : "about:blank"}
              width="100%"
              height="100%"
              style={{
                zoom: 0.7,
              }}
              allowFullScreen
            ></iframe>
        }
      </div>
    </div>
  );
}
