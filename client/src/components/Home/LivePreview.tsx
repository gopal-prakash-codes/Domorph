


const files = [
    'index.html'
]
export default function LivePreview() {
  return (
    <div className="flex flex-col items-center w-full h-11/12 border border-base-content/20 rounded-lg text-base-100">
      <div className="flex flex-col bg-base-100 border-b border-base-content/20 text-base-content w-full px-5 py-3 rounded-t-lg">
        <h1>Live Preview</h1>
        <p className="text-sm text-base-content/30">https://localhost:3000/</p>
      </div>
      <div className="flex flex-col items-center justify-center h-full w-full">
        {/* <span className="loader"></span> */}
        <iframe
          src="http://localhost:3000/scraped_website/"
          width="100%"
          height="100%"
          style={{
            zoom: 0.7,
          }}
          allowFullScreen
        ></iframe>
      </div>
    </div>
  );
}
