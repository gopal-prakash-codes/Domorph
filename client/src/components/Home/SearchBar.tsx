import { Search } from "lucide-react";
import { useContext } from "react";
import { Context } from "../../context/statesContext";



export default function SearchBar() {
  const {formData, onSubmit} = useContext<any>(Context);
 

  return (
    <div className="flex flex-col items-center justify-center w-full h-full">
      <form className="relative w-full" onSubmit={formData?.handleSubmit(onSubmit)}>
        <div className="flex flex-col">
          <div className="flex relative">
            <input
              type="text"
              {...formData?.register("query", {
                required: "URL is required",
                pattern: {
                  value:
                    /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w\-._~:/?#[\]@!$&'()*+,;=]*)?$/,
                  message: "Enter a valid URL",
                },
              })}
              placeholder="https://www.vonage.com/"
              className="w-full py-2 pl-5 pr-12 border-2 border-gray-300 rounded-full outline-none"
            />
            <button
              type="submit"
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full flex items-center justify-center cursor-pointer"
            >
              <Search size={20} />
            </button>
          </div>
          <span
            className={`${formData?.errors?.query ? "visible" : "invisible"} text-sm text-error pl-5 pt-1`}
          >
            {formData?.errors?.query?.message || "Error"}
          </span>
        </div>
      </form>
    </div>
  );
}