export default function LogNPrompt() {
  return (
    <div className="bg-base-100 rounded-lg h-11/12 w-full flex flex-col justify-between">
      <div className="h-9/12">
        <div className="w-11/12 h-full flex justify-center items-center">
          <div className="flex flex-col items-center">
            <h1 className="text-lg flex items-center gap-x-1">
              Scraping
              <span className="loader !w-[20px] !h-[20px] after:!w-[10px] after:!h-[10px]"></span>
            </h1>
            <p className="text-sm text-base-content/30">https://mrwhite-gilt.vercel.app/</p>
          </div>
        </div>
      </div>
      <div className="flex flex-col items-center h-3/12 pb-6">
        <textarea
          name="prompt"
          id="prompt"
          placeholder="Change the color of the @subscription.html button."
          className="w-11/12 h-full pl-5 py-3 pr-12 shadow-2xl border border-base-content/20 focus:border-base-content/80 rounded-lg outline-none resize-none"
        />
      </div>
    </div>
  );
}
