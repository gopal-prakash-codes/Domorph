import { FileSliders, FolderSync, HardDriveDownload, History } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { useContext, useEffect, useState } from "react";
import { getFiles } from "../../api/useApi";
import { Context } from "../../context/statesContext";


export default function DialogTabs({setOpen}: {setOpen: any}) {
  const {setSentQuery, onSubmit, handleDownload, setIFrameSrc, setDomain} = useContext<any>(Context);
  const [tabValue, setTabValue] = useState<string>("");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const files = await getFiles();
      setData(files?.directories);
      setTabValue(files.directories[0]);
      setLoading(false);
    } catch (error) {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchFiles();
  }, []);
  return (
    <>
      {
        
        loading ? (
          <div className="flex justify-center items-center h-full gap-x-2">
            <span className="loader !w-10 !h-10"></span> Fetching files...
          </div>
        ) : (
          
          <Tabs  value={tabValue} onValueChange={setTabValue} className="w-full flex flex-row h-full overflow-hidden">
            <TabsList className="flex flex-col min-w-1/3 *:w-full h-full gap-y-2 *:text-sm bg-transparent text-base-content overflow-y-auto py-4 border-none">
            {
                data?.map((file: string, index: number) => (
                  <TabsTrigger key={file} value={file} className="py-2 text-base-content flex gap-x-4"><span>{index + 1}.</span><span className="flex gap-x-1 items-center"><History />{file?.split('.')[0]}</span></TabsTrigger>
                ))
            }
            </TabsList>
            {
              data?.map((file: string) => (
                <TabsContent key={file} value={file}  className="w-full">
                  <Card className="min-w-full h-full bg-transparent text-base-content border-none items-center">
                    <CardHeader className="w-full text-center">
                      <CardTitle className="text-2xl capitalize">{file?.split('.')[0]}</CardTitle>
                      <CardDescription className="text-base-content/60">
                        {file}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 min-w-full flex flex-col justify-end h-full">
                      <div className="flex justify-around *:w-1/3 text-sm *:cursor-pointer gap-x-5 font-semibold">
                        <button className="bg-info text-info-content/90  py-2 rounded-md flex justify-center items-center gap-x-1" onClick={() => {onSubmit({query: file}); setOpen(false)}}><FolderSync size={16} />Rescrape</button>
                        <button className="bg-warning/70 text-warning-content/90  py-2 rounded-md flex justify-center items-center gap-x-1" onClick={() => {setSentQuery(true); setDomain(file); setIFrameSrc(`${import.meta.env.VITE_CLIENT_URL}/scraped_website/${file}/index.html`); setOpen(false)}}><FileSliders size={16} />Modify</button>
                        <button className="bg-base-content text-base-100  py-2 rounded-md flex justify-center items-center gap-x-1" onClick={() => {handleDownload(file); setOpen(false)}}><HardDriveDownload size={16} />Download</button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              ))
            }
          </Tabs>
        )
      }
    </>
  )
}
