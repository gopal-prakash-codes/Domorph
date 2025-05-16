import { Search } from "lucide-react";
import { webScrape } from "../../api/useApi";
export default function SearchBar({
  register,
  handleSubmit,
  setSentQuery,
}: {
  register: any;
  handleSubmit: any;
  setSentQuery: any;
}) {
  const onSubmit = async (data: any) => {
    if (data) {
      setSentQuery(true);
      const response = await webScrape(data.query);
      console.log(response);
    }
  };
  return (
    <form
      className="flex flex-col items-center justify-center w-full"
      onSubmit={handleSubmit(onSubmit)}
    >
      <div className="relative w-full">
        <input
          type="text"
          {...register("query")}
          placeholder="https://www.vonage.com/"
          className="w-full py-2 pl-5 pr-12 border-2 border-gray-300 rounded-full outline-none"
        />
        <button type="submit" className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full flex items-center justify-center cursor-pointer">
          <Search size={20} />
        </button>
      </div>
    </form>
  );
}
