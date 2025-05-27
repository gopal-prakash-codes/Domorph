import { GalleryVerticalEnd } from "lucide-react";
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogTrigger, DialogDescription } from "../ui/dialog";
import DialogTabs from "./DialogTabs";
import { useState } from "react";


export default function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <nav className="flex justify-between items-center w-full p-4 h-[64px]">
      <div className="flex justify-between max-[420px]:justify-center items-center w-full">
        <h1 className="text-2xl max-[420px]:text-3xl font-bold">Domorph</h1>
        <ul className="flex justify-between items-center gap-x-3 *:cursor-pointer max-[420px]:hidden font-semibold">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger>
              <li className="flex items-center gap-x-1"><GalleryVerticalEnd size={20}/> Recent scrapes</li>   
            </DialogTrigger>
            <DialogContent onInteractOutside={(e) => e.preventDefault()} className="min-w-3/4 h-3/4 flex flex-col bg-base-300 text-base-content">
              <DialogHeader className="h-fit">
                <DialogTitle className="text-secondary flex gap-x-1 items-center"><GalleryVerticalEnd size={18}/> Recent scrapes</DialogTitle>
                <DialogDescription className="text-base-content/60">Your recent scraped websites</DialogDescription>
              </DialogHeader>
              <DialogTabs setOpen={setOpen} />
            </DialogContent>
          </Dialog>
        </ul>
      </div>
    </nav>
  )
}
